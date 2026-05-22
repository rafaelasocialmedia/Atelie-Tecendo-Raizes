const CACHE_NAME = 'atelie-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/clientes.html',
  '/biblioteca.html',
  '/estrutura.html',
  '/pedidos.html',
  '/css/style.css',
  '/js/supabase.js',
  '/js/offline.js'
];

// Instala e faz cache dos assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos — SEMPRE
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Intercepta requests — NETWORK FIRST para HTML, cache fallback
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Ignora URLs que nao sao http/https
  if (!url.startsWith('http')) return;

  // Supabase — sempre online, sem cache
  if (url.includes('supabase.co') || url.includes('jsdelivr')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({
          error: 'offline',
          message: 'Sem conexao. A operacao sera sincronizada quando a internet voltar.'
        }), {
          status: 503,
          headers: {'Content-Type': 'application/json'}
        });
      })
    );
    return;
  }

  // Arquivos HTML e CSS — NETWORK FIRST: tenta buscar versao nova, cai no cache se offline
  if (url.includes('.html') || url.includes('.css') || url.includes('.js')) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        // Atualiza cache com versao nova
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline: serve do cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Outros assets — cache first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    }).catch(function() {
      return caches.match('/index.html');
    })
  );
});

// Sincroniza fila quando volta a internet
self.addEventListener('sync', function(e) {
  if (e.tag === 'atelie-sync') {
    e.waitUntil(sincronizarFila());
  }
});

async function sincronizarFila() {
  var clients = await self.clients.matchAll();
  clients.forEach(function(client) {
    client.postMessage({tipo: 'sincronizar'});
  });
}
