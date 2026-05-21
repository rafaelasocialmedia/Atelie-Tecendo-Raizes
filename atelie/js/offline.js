// ===== OFFLINE QUEUE MANAGER =====
// Gerencia operações offline e sincroniza quando volta a internet

const FILA_KEY = 'atelie_fila_offline';

// Verifica se está online
function isOnline() {
  return navigator.onLine;
}

// Salva operação na fila offline
function salvarNaFila(operacao) {
  var fila = JSON.parse(localStorage.getItem(FILA_KEY) || '[]');
  operacao.id = Date.now() + Math.random();
  operacao.timestamp = new Date().toISOString();
  fila.push(operacao);
  localStorage.setItem(FILA_KEY, JSON.stringify(fila));
  console.log('Operação salva na fila offline:', operacao.tipo);
}

// Retorna fila atual
function getFila() {
  return JSON.parse(localStorage.getItem(FILA_KEY) || '[]');
}

// Remove operação da fila
function removerDaFila(id) {
  var fila = getFila().filter(function(op) { return op.id !== id; });
  localStorage.setItem(FILA_KEY, JSON.stringify(fila));
}

// Wrapper para operações do Supabase com suporte offline
async function dbOperacao(tabela, tipo, dados, idRegistro) {
  if (!isOnline()) {
    salvarNaFila({tipo: tipo, tabela: tabela, dados: dados, idRegistro: idRegistro});
    mostrarToastOffline();
    return {offline: true};
  }
  try {
    var result;
    if (tipo === 'insert') {
      result = await db.from(tabela).insert(dados);
    } else if (tipo === 'update') {
      result = await db.from(tabela).update(dados).eq('id', idRegistro);
    } else if (tipo === 'delete') {
      result = await db.from(tabela).delete().eq('id', idRegistro);
    }
    if (result && result.error) throw result.error;
    return result;
  } catch(e) {
    // Se falhou por falta de conexão, salva na fila
    if (!navigator.onLine || e.message.includes('fetch') || e.message.includes('network')) {
      salvarNaFila({tipo: tipo, tabela: tabela, dados: dados, idRegistro: idRegistro});
      mostrarToastOffline();
      return {offline: true};
    }
    throw e;
  }
}

// Sincroniza fila quando volta online
async function sincronizarFila() {
  var fila = getFila();
  if (!fila.length) return;

  var sucesso = 0;
  var erros = 0;

  for (var op of fila) {
    try {
      var result;
      if (op.tipo === 'insert') {
        result = await db.from(op.tabela).insert(op.dados);
      } else if (op.tipo === 'update') {
        result = await db.from(op.tabela).update(op.dados).eq('id', op.idRegistro);
      } else if (op.tipo === 'delete') {
        result = await db.from(op.tabela).delete().eq('id', op.idRegistro);
      }
      if (result && result.error) throw result.error;
      removerDaFila(op.id);
      sucesso++;
    } catch(e) {
      erros++;
      console.error('Erro ao sincronizar operação:', e);
    }
  }

  if (sucesso > 0) {
    toast(sucesso + ' operação(ões) sincronizada(s) com sucesso!');
    // Recarrega dados da página atual
    if (typeof carregarDados === 'function') carregarDados();
  }
  if (erros > 0) {
    toast(erros + ' operação(ões) não puderam ser sincronizadas.', 'erro');
  }
}

// Toast específico para offline
function mostrarToastOffline() {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:#C4973A;color:white;padding:10px 18px;border-radius:6px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:var(--sans)';
  t.innerHTML = '📶 Sem internet — salvo localmente. Será sincronizado quando a conexão voltar.';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 5000);
}

// Banner de status offline
function atualizarBannerOffline() {
  var banner = document.getElementById('banner-offline');
  if (!banner) return;
  var fila = getFila();
  if (!isOnline()) {
    banner.style.display = 'flex';
    banner.querySelector('#banner-count').textContent = fila.length > 0 ? fila.length + ' operação(ões) pendente(s)' : 'Você está offline';
  } else {
    if (fila.length > 0) {
      banner.style.display = 'flex';
      banner.style.background = '#4A7C59';
      banner.querySelector('#banner-count').textContent = 'Sincronizando ' + fila.length + ' operação(ões)...';
      sincronizarFila().then(function() {
        banner.style.display = 'none';
      });
    } else {
      banner.style.display = 'none';
    }
  }
}

// Eventos de conectividade
window.addEventListener('online', function() {
  atualizarBannerOffline();
  sincronizarFila();
});

window.addEventListener('offline', function() {
  atualizarBannerOffline();
});

// Service Worker — recebe mensagem para sincronizar
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.tipo === 'sincronizar') {
      sincronizarFila();
    }
  });
}

// Registra Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('Service Worker registrado:', reg.scope);
    }).catch(function(err) {
      console.log('Service Worker falhou:', err);
    });
  });
}
