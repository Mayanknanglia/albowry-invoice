/* ============================================================
   ALBOWRY CARPENTRY LLC — SERVICE WORKER
   Enables Offline Mode + App Installation
   Version: 3.0.0
   ============================================================ */

const CACHE_VERSION = 'albowry-v3.0.0';
const OFFLINE_URL = './index.html';

// Files to cache for offline use
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './config.js',
    './manifest.json'
];

// External CDN assets
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&family=JetBrains+Mono:wght@400;600&display=swap'
];

// ═══════════════════════════════════════════
// 📦 INSTALL EVENT
// ═══════════════════════════════════════════
self.addEventListener('install', (event) => {
    console.log('[SW] 🚀 Installing v' + CACHE_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            console.log('[SW] 📦 Caching core assets');
            
            // Cache core assets first (must succeed)
            return cache.addAll(CORE_ASSETS).then(() => {
                // Try to cache CDN assets (may fail, but ok)
                console.log('[SW] 🌐 Caching CDN assets');
                return Promise.allSettled(
                    CDN_ASSETS.map(url => 
                        cache.add(url).catch(err => {
                            console.log('[SW] ⚠️ Failed to cache:', url);
                        })
                    )
                );
            });
        }).then(() => {
            console.log('[SW] ✅ Installation complete');
            return self.skipWaiting();
        })
    );
});

// ═══════════════════════════════════════════
// ⚡ ACTIVATE EVENT
// ═══════════════════════════════════════════
self.addEventListener('activate', (event) => {
    console.log('[SW] ⚡ Activating v' + CACHE_VERSION);
    
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_VERSION)
                    .map(key => {
                        console.log('[SW] 🗑️ Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            console.log('[SW] ✅ Activation complete');
            return self.clients.claim();
        })
    );
});

// ═══════════════════════════════════════════
// 🌐 FETCH EVENT (Network First, Cache Fallback)
// ═══════════════════════════════════════════
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Google Apps Script (needs live network)
    if (url.hostname.includes('script.google.com') || 
        url.hostname.includes('googleusercontent.com') ||
        url.hostname.includes('allorigins.win')) {
        return;
    }

    // For navigation requests, use network first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful response
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then(cache => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cached index.html
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }

    // For other requests: Cache first, then network
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                // Return cached, but also update cache in background
                fetch(request).then(response => {
                    if (response.status === 200) {
                        caches.open(CACHE_VERSION).then(cache => {
                            cache.put(request, response);
                        });
                    }
                }).catch(() => {});
                return cached;
            }

            // Not in cache, fetch from network
            return fetch(request).then(response => {
                // Cache successful responses
                if (response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then(cache => {
                        cache.put(request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // Offline fallback
                if (request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#c8a14e" width="200" height="200"/></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// ═══════════════════════════════════════════
// 📢 MESSAGE EVENT (for updates)
// ═══════════════════════════════════════════
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] 🎯 Service Worker loaded successfully!');