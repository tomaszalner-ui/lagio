// sw.js — the service worker. The browser runs it in the background.
// It keeps a copy of every app file, so Lagio opens without internet.
//
// Releasing a new version:
//   1. raise VERSION below (and add a CHANGELOG.md entry)
//   2. publish. Phones download the new files in the background and show
//      "A new version is available". Tapping Update switches over.
// When you add a file to the app, add it to FILES too
// (`node tools/check.mjs` warns if you forget).

const VERSION = '0.3.0';
const CACHE = 'lagio-v' + VERSION;

const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'js/app.js',
  'js/db.js',
  'js/i18n.js',
  'js/pwa.js',
  'js/router.js',
  'js/store.js',
  'js/modules/documents.js',
  'js/modules/trips.js',
  'js/ui/archive.js',
  'js/ui/color-picker.js',
  'js/ui/dialog.js',
  'js/ui/document-viewer.js',
  'js/ui/empty-state.js',
  'js/ui/field.js',
  'js/ui/home.js',
  'js/ui/html.js',
  'js/ui/illustrations.js',
  'js/ui/lang-switch.js',
  'js/ui/not-found.js',
  'js/ui/places-input.js',
  'js/ui/shell.js',
  'js/ui/toast.js',
  'js/ui/trip-actions.js',
  'js/ui/trip-bookings.js',
  'js/ui/trip-card.js',
  'js/ui/trip-dashboard.js',
  'js/ui/trip-form.js',
  'js/ui/update-banner.js',
  'lang/en.json',
  'lang/lt.json',
  'vendor/hooks.module.js',
  'vendor/htm.module.js',
  'vendor/jszip.js',
  'vendor/jszip.min.js',
  'vendor/preact.module.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

// While developing on your own computer, always try the newest files first
const IS_DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname);

// Install: save a copy of every file. { cache: 'reload' } skips the browser's
// ordinary cache, so we never save an old file into a new version.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(FILES.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // No skipWaiting() here: the new version waits until the user taps Update.
});

// Activate: delete the copies of older versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('lagio-') && name !== CACHE)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// The Update button (js/pwa.js) sends this message
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// Every file request from the app
self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Only our own files. Anything else goes to the network untouched.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(IS_DEV ? networkFirst(request) : cacheFirst(request));
});

// Published app: use the saved copy; ask the network only if it is missing.
async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    return await fetch(request);
  } catch (error) {
    return offlinePage(request, error);
  }
}

// Development: newest file from the network; saved copy when offline.
async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    return cached || offlinePage(request, error);
  }
}

// Opening any app address offline still shows the app
async function offlinePage(request, error) {
  if (request.mode === 'navigate') {
    const page = await caches.match('index.html');
    if (page) return page;
  }
  throw error;
}
