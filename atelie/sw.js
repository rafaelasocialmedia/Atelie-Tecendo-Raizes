const CACHE_NAME = 'atelie-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/clientes.html',
  '/biblioteca.html',
  '/estrutura.html',
  '/pedidos.html',
  '/css/style.css',
  '/js/supabase.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
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

// Ativa e limpa caches antigos
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

// Intercepta requests
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Requisições ao Supabase — tenta online, se falhar retorna erro controlado
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({
          error: 'offline',
          message: 'Sem conexão. A operação será sincronizada quando a internet voltar.'
        }), {
          status: 503,
          headers: {'Content-Type': 'application/json'}
        });
      })
    );
    return;
  }

  // Assets do app — cache first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Atualiza cache com versão nova
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      // Fallback: retorna index.html para navegação offline
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
  // Notifica os clients pra sincronizarem
  var clients = await self.clients.matchAll();
  clients.forEach(function(client) {
    client.postMessage({tipo: 'sincronizar'});
  });
}
