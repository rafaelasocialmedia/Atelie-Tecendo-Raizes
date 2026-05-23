// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqs9sdp-ptDeC6JMbY5hZQGOwj4bjzO7Y",
  authDomain: "atelie-tecendo-raizes.firebaseapp.com",
  projectId: "atelie-tecendo-raizes",
  storageBucket: "atelie-tecendo-raizes.firebasestorage.app",
  messagingSenderId: "723878156415",
  appId: "1:723878156415:web:2e4fec2f96034bfd44c74a"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const storage = getStorage(app);

// ===== CAMADA DE COMPATIBILIDADE (imita interface do Supabase) =====
// Assim não precisa reescrever nada nos outros arquivos!

window.db = {
  from: function(tabela) {
    return new Query(tabela);
  }
};

class Query {
  constructor(tabela) {
    this._tabela = tabela;
    this._filtros = [];
    this._ordem = null;
    this._ordemDir = 'asc';
    this._selectCampos = null;
    this._countOnly = false;
    this._limite = null;
  }

  select(campos, opts) {
    if (opts && opts.count === 'exact' && opts.head) {
      this._countOnly = true;
    }
    this._selectCampos = campos;
    return this;
  }

  order(campo, opts) {
    this._ordem = campo;
    this._ordemDir = (opts && opts.ascending === false) ? 'desc' : 'asc';
    return this;
  }

  eq(campo, valor) {
    this._filtros.push({tipo:'eq', campo, valor});
    return this;
  }

  neq(campo, valor) {
    this._filtros.push({tipo:'neq', campo, valor});
    return this;
  }

  async _executar() {
    try {
      const col = collection(firestore, this._tabela);
      const snap = await getDocs(col);
      let docs = snap.docs.map(d => ({id: d.id, ...d.data(), _fid: d.id}));

      // Filtros em memória (simples, funciona para o tamanho do sistema)
      for (const f of this._filtros) {
        if (f.tipo === 'eq') docs = docs.filter(d => String(d[f.campo]) === String(f.valor));
        if (f.tipo === 'neq') docs = docs.filter(d => String(d[f.campo]) !== String(f.valor));
      }

      // Ordenação
      if (this._ordem) {
        docs.sort((a, b) => {
          const va = a[this._ordem] || '';
          const vb = b[this._ordem] || '';
          const r = String(va).localeCompare(String(vb));
          return this._ordemDir === 'desc' ? -r : r;
        });
      }

      if (this._countOnly) return { count: docs.length, data: null, error: null };
      return { data: docs, error: null };
    } catch(e) {
      return { data: null, error: e };
    }
  }

  then(resolve) {
    return this._executar().then(resolve);
  }

  async insert(dados) {
    try {
      const col = collection(firestore, this._tabela);
      const agora = new Date().toISOString();
      const docRef = await addDoc(col, {...dados, created_at: agora, updated_at: agora});
      return { data: {id: docRef.id, ...dados}, error: null };
    } catch(e) {
      return { data: null, error: e };
    }
  }

  async update(dados) {
    try {
      // Busca os docs que batem com os filtros
      const col = collection(firestore, this._tabela);
      const snap = await getDocs(col);
      let docs = snap.docs;

      for (const f of this._filtros) {
        if (f.tipo === 'eq') docs = docs.filter(d => {
          const val = d.data()[f.campo];
          return String(val) === String(f.valor) || val === f.valor;
        });
      }

      for (const d of docs) {
        await updateDoc(doc(firestore, this._tabela, d.id), {...dados, updated_at: new Date().toISOString()});
      }
      return { data: null, error: null };
    } catch(e) {
      return { data: null, error: e };
    }
  }

  async delete() {
    try {
      const col = collection(firestore, this._tabela);
      const snap = await getDocs(col);
      let docs = snap.docs;

      for (const f of this._filtros) {
        if (f.tipo === 'eq') docs = docs.filter(d => {
          const val = d.data()[f.campo];
          return String(val) === String(f.valor) || val === f.valor;
        });
      }

      for (const d of docs) {
        await deleteDoc(doc(firestore, this._tabela, d.id));
      }
      return { data: null, error: null };
    } catch(e) {
      return { data: null, error: e };
    }
  }
}

// ===== UPLOAD DE FOTO =====
window.uploadFoto = async function(file, pasta) {
  try {
    const nome = `${pasta}/${Date.now()}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, nome);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch(e) {
    console.error('Erro upload:', e);
    return null;
  }
}

// ===== FORMATAÇÃO =====
window.fmt = function(v) {
  return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
}
window.fmtData = function(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00').toLocaleDateString('pt-BR');
}

// ===== TOAST =====
window.toast = function(msg, tipo) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:' +
    (tipo === 'erro' ? '#8B2500' : '#4A7C59') +
    ';color:white;padding:10px 18px;border-radius:6px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:var(--sans)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3500);
}

// ===== LOADING =====
window.setLoading = function(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn._txt = btn.textContent;
    btn.textContent = 'Salvando...';
  } else {
    btn.disabled = false;
    btn.textContent = btn._txt || btn.textContent;
  }
}

// Sinaliza que firebase está pronto
window._firebaseReady = true;
console.log('✅ Firebase conectado!');
