// Service Worker for Rindwa Emergency Platform
const CACHE_NAME = 'rindwa-emergency-v1';
const urlsToCache = [
  '/',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/badge-72x72.png'
];

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated successfully');
    })
  );
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Rindwa Emergency', body: event.data.text() || 'New notification' };
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    tag: data.tag || 'rindwa-emergency',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();

  // Handle different actions
  if (event.action === 'view') {
    // Open the app to view details
    const urlToOpen = event.notification.data.url || '/incidents';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window/tab open with the app
          for (let client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              // Focus the existing window and navigate to the incident
              client.focus();
              client.postMessage({
                type: 'navigate',
                url: urlToOpen
              });
              return;
            }
          }
          
          // No existing window found, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('📋 Notification dismissed');
  } else {
    // Default click behavior - open the app
    const urlToOpen = event.notification.data.url || '/dashboard';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (let client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.focus();
              client.postMessage({
                type: 'navigate',
                url: urlToOpen
              });
              return;
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle background sync (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'incident-sync') {
    event.waitUntil(syncIncidents());
  }
});

// Sync incidents when back online
async function syncIncidents() {
  try {
    // This would sync any offline incidents when back online
    const response = await fetch('/api/incidents/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Incidents synced successfully');
    }
  } catch (error) {
    console.error('❌ Failed to sync incidents:', error);
    throw error; // This will cause the sync to be retried
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('📨 Message received in service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event for caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests and static assets
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // Return offline fallback for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
}); 