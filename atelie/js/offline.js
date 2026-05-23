// Banner offline simples
window.atualizarBannerOffline = function() {
  var banner = document.getElementById('banner-offline');
  if (!banner) return;
  function atualizar() {
    banner.style.display = navigator.onLine ? 'none' : 'flex';
    if (!navigator.onLine) {
      document.getElementById('banner-count').textContent = 'Você está offline — dados serão sincronizados quando voltar';
    }
  }
  atualizar();
  window.addEventListener('online', atualizar);
  window.addEventListener('offline', atualizar);
}
