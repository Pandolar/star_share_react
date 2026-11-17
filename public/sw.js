/**
 * P1 Service Worker: offline fallback + versioned static asset caching.
 *
 * Rules:
 * - Navigation: network-first with a short timeout, offline.html on failure.
 * - /starstatic/* and /assets/*: cache-first (filenames are content-hashed).
 * - /u/*, /star/*, /star-api/*, /sw.js: always network, never cached.
 * - Only same-origin GET requests are handled.
 */
const CACHE_PREFIX = 'star-offline-fallback-';
const CACHE_VERSION = 'v2';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const NAV_TIMEOUT_MS = 4000;

const NETWORK_ONLY_PREFIXES = ['/u/', '/star/', '/star-api/', '/sw.js', '/star-admin/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

function isNetworkOnly(pathname) {
  return NETWORK_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function isStaticAsset(pathname) {
  return pathname.startsWith('/starstatic/') || pathname.startsWith('/assets/');
}

function fetchWithTimeout(request) {
  if (!self.AbortController) return fetch(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function offlineResponse() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(OFFLINE_URL);
  return cached || new Response(
    '当前网络无法连接至服务器。请在网络恢复后重试。',
    { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNetworkOnly(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request).then((response) => {
        if (response.status >= 500) throw new Error('Navigation failed with HTTP ' + response.status);
        return response;
      }).catch(() => offlineResponse()),
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    }),
  );
});
