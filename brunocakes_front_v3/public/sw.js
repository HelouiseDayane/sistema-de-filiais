// Bruno Cake PWA Service Worker
const CACHE_NAME = 'bruno-cakes-v1';
const CACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Bruno Cake Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Bruno Cake Service Worker: Caching assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.log('Bruno Cake Service Worker: Cache failed', err))
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Bruno Cake Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Bruno Cake Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests
  if (event.request.url.includes('/api/')) return;
  
  // Skip ALL development files and Vite resources - return early without caching
  if (event.request.url.includes('/src/') || 
      event.request.url.includes('?v=') ||
      event.request.url.includes('?t=') ||
      event.request.url.includes('@vite') ||
      event.request.url.includes('__vite') ||
      event.request.url.includes('node_modules') ||
      event.request.url.includes('.vite') ||
      event.request.url.includes('hot') ||
      event.request.url.includes('localhost:8888') ||  // Skip all dev server requests
      event.request.url.includes('hmr')) {
    // Don't cache, don't respond - let browser handle it
    return;
  }
      
  //console.log('SW: Handling request for:', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(err => {
        console.log('SW: Fetch failed for:', event.request.url, err);
        // Fallback for offline
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Background sync for offline orders (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Bruno Cake Service Worker: Background sync triggered');
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Bruno Cake',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Bruno Cake', options)
  );
});

console.log('Bruno Cake Service Worker loaded successfully! 🍰');