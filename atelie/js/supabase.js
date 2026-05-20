const SUPABASE_URL = 'https://yuqklpqkejbhwadgahzw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cWtscHFrZWpiaHdhZGdhaHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzAzODAsImV4cCI6MjA5NDgwNjM4MH0.F5XbvMNz4qnAL5UvHSLpNlfUIctp7oGSywd-O1AqV5U';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== UPLOAD DE FOTO =====
async function uploadFoto(file, pasta) {
  const ext = file.name.split('.').pop();
  const nome = `${pasta}/${Date.now()}.${ext}`;
  const { data, error } = await db.storage.from('fotos').upload(nome, file);
  if (error) { console.error('Erro upload:', error); return null; }
  const { data: url } = db.storage.from('fotos').getPublicUrl(nome);
  return url.publicUrl;
}

// ===== FORMATAÇÃO =====
function fmt(v) {
  return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
}
function fmtData(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00').toLocaleDateString('pt-BR');
}

// ===== TOAST =====
function toast(msg, tipo) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:' +
    (tipo === 'erro' ? '#8B2500' : '#4A7C59') +
    ';color:white;padding:10px 18px;border-radius:6px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:var(--sans)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3000);
}

// ===== LOADING =====
function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn._txt = btn.textContent;
    btn.textContent = 'Salvando...';
  } else {
    btn.disabled = false;
    btn.textContent = btn._txt || btn.textContent;
  }
}
