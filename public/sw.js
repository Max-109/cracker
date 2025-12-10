// Service Worker for ChatGPT Clone - Performance Optimization
const CACHE_NAME = 'chat-cache-v2';

// Only cache static, known resources - let runtime caching handle dynamic content
// Removed invalid glob patterns and external URLs that cause CORS issues
const ASSETS_TO_CACHE = [
  '/',
];

self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('📦 Caching app shell...');

        // Cache each asset individually with error handling
        const cachePromises = ASSETS_TO_CACHE.map(async (url) => {
          try {
            await cache.add(url);
            console.log(`✅ Cached: ${url}`);
          } catch (error) {
            console.warn(`⚠️ Failed to cache ${url}:`, error.message);
            // Continue even if individual assets fail
          }
        });

        await Promise.all(cachePromises);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker install failed:', error);
      })
});

self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🧹 Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim(); // Take control of all clients
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache API responses with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetchWithNetworkFirst(event.request)
    );
    return;
  }

  // Cache static assets with cache-first strategy
  if (event.request.url.includes('_next/static/') ||
    event.request.url.includes('fonts.googleapis.com') ||
    event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetchWithCacheFirst(event.request)
    );
    return;
  }

  // Fallback to network for everything else
  event.respondWith(fetch(event.request));
});

async function fetchWithNetworkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // If successful, cache it for future use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed, falling back to cache:', error);

    // Fallback to cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('📦 Serving from cache:', request.url);
      return cachedResponse;
    }

    // If nothing in cache, return a fallback response
    return new Response(JSON.stringify({ error: 'Network error and no cache available' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}

async function fetchWithCacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    console.log('📦 Serving from cache:', request.url);

    // Update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, networkResponse));
        }
      })
      .catch(console.error);

    return cachedResponse;
  }

  // Fallback to network
  console.log('🌐 Cache miss, fetching from network:', request.url);
  return fetch(request);
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🧹 Clearing cache as requested');
    caches.delete(CACHE_NAME)
      .then(() => {
        console.log('✅ Cache cleared successfully');
        event.source?.postMessage({ type: 'CACHE_CLEARED', success: true });
      })
      .catch((error) => {
        console.error('❌ Failed to clear cache:', error);
        event.source?.postMessage({ type: 'CACHE_CLEARED', success: false, error: error.message });
      });
  }
});

console.log('🤖 Service Worker loaded and ready!');