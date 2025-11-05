// Service Worker para notificações push
const CACHE_NAME = 'colab-eats-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requisições (opcional - para funcionamento offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        return caches.match('/offline.html');
      })
  );
});

// Receber notificações push
self.addEventListener('push', (event) => {
  const options = event.data ? event.data.json() : {};
  
  const title = options.title || 'Nova notificação do Colab Eats';
  const notificationOptions = {
    body: options.body || 'Você tem uma nova notificação',
    icon: options.icon || '/icon-192x192.png',
    badge: options.badge || '/badge-72x72.png',
    vibrate: options.vibrate || [200, 100, 200],
    tag: options.tag || 'colab-eats-notification',
    requireInteraction: options.requireInteraction || false,
    data: options.data || {},
    actions: options.actions || [],
    ...options,
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Abrir URL específica se fornecida
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
    return;
  }

  // Abrir app por padrão
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Sincronização em segundo plano (opcional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Implementar sincronização de notificações pendentes
  console.log('Sincronizando notificações...');
}