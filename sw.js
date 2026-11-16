// sw.js — the service worker. The browser runs it in the background.
// It keeps a copy of every app file, so Lagio opens without internet.
//
// Two caches ("saved copies"):
//   lagio-v<VERSION>           the app's own files; replaced with every release
//   lagio-pdfjs-<PDF.js ver.>  PDF.js (about 4 MB); kept between releases and
//                              downloaded again only when PDF.js is upgraded
//
// Releasing a new version:
//   1. node tools/update-sw.mjs <new version>   (sets VERSION, refreshes the
//      file lists and the PDF.js version) and add a CHANGELOG.md entry
//   2. publish. Phones download the new files in the background and show
//      "A new version is available". Tapping Update switches over.
// FILES, PDFJS_FILES and PDFJS_VERSION are written by tools/update-sw.mjs;
// `node tools/check.mjs` checks them.

const VERSION = '0.4.1';
const CACHE = 'lagio-v' + VERSION;

const PDFJS_VERSION = '6.5.438';
const PDFJS_CACHE = 'lagio-pdfjs-' + PDFJS_VERSION;

const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'js/app.js',
  'js/db.js',
  'js/i18n.js',
  'js/modules/bookings.js',
  'js/modules/documents.js',
  'js/modules/trips.js',
  'js/pwa.js',
  'js/router.js',
  'js/store.js',
  'js/transfer.js',
  'js/ui/archive.js',
  'js/ui/booking-detail.js',
  'js/ui/booking-form.js',
  'js/ui/booking-parts.js',
  'js/ui/color-picker.js',
  'js/ui/dialog.js',
  'js/ui/document-section.js',
  'js/ui/document-viewer.js',
  'js/ui/empty-state.js',
  'js/ui/export-dialog.js',
  'js/ui/field.js',
  'js/ui/home.js',
  'js/ui/html.js',
  'js/ui/illustrations.js',
  'js/ui/import-dialog.js',
  'js/ui/lang-switch.js',
  'js/ui/not-found.js',
  'js/ui/pdf-view.js',
  'js/ui/places-input.js',
  'js/ui/shell.js',
  'js/ui/toast.js',
  'js/ui/trip-actions.js',
  'js/ui/trip-bookings.js',
  'js/ui/trip-card.js',
  'js/ui/trip-dashboard.js',
  'js/ui/trip-form.js',
  'js/ui/update-banner.js',
  'js/version.js',
  'lang/en.json',
  'lang/lt.json',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'vendor/hooks.module.js',
  'vendor/htm.module.js',
  'vendor/jszip.js',
  'vendor/jszip.min.js',
  'vendor/preact.module.js'
];

const PDFJS_FILES = [
  'vendor/pdfjs/cmaps/78-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/78-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/78-H.bcmap',
  'vendor/pdfjs/cmaps/78-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/78-RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/78-V.bcmap',
  'vendor/pdfjs/cmaps/78ms-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/78ms-RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/83pv-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/90ms-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/90ms-RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/90msp-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/90msp-RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/90pv-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/90pv-RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/Add-H.bcmap',
  'vendor/pdfjs/cmaps/Add-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/Add-RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/Add-V.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-0.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-1.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-2.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-3.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-4.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-5.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-6.bcmap',
  'vendor/pdfjs/cmaps/Adobe-CNS1-UCS2.bcmap',
  'vendor/pdfjs/cmaps/Adobe-GB1-0.bcmap',
  'vendor/pdfjs/cmaps/Adobe-GB1-1.bcmap',
  'vendor/pdfjs/cmaps/Adobe-GB1-2.bcmap',
  'vendor/pdfjs/cmaps/Adobe-GB1-3.bcmap',
  'vendor/pdfjs/cmaps/Adobe-GB1-4.bcmap',
  'vendor/pdfjs/cmaps/Adobe-GB1-5.bcmap',
  'vendor/pdfjs/cmaps/Adobe-GB1-UCS2.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-0.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-1.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-2.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-3.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-4.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-5.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-6.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Japan1-UCS2.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Korea1-0.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Korea1-1.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Korea1-2.bcmap',
  'vendor/pdfjs/cmaps/Adobe-Korea1-UCS2.bcmap',
  'vendor/pdfjs/cmaps/B5-H.bcmap',
  'vendor/pdfjs/cmaps/B5-V.bcmap',
  'vendor/pdfjs/cmaps/B5pc-H.bcmap',
  'vendor/pdfjs/cmaps/B5pc-V.bcmap',
  'vendor/pdfjs/cmaps/CNS-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/CNS-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/CNS1-H.bcmap',
  'vendor/pdfjs/cmaps/CNS1-V.bcmap',
  'vendor/pdfjs/cmaps/CNS2-H.bcmap',
  'vendor/pdfjs/cmaps/CNS2-V.bcmap',
  'vendor/pdfjs/cmaps/ETHK-B5-H.bcmap',
  'vendor/pdfjs/cmaps/ETHK-B5-V.bcmap',
  'vendor/pdfjs/cmaps/ETen-B5-H.bcmap',
  'vendor/pdfjs/cmaps/ETen-B5-V.bcmap',
  'vendor/pdfjs/cmaps/ETenms-B5-H.bcmap',
  'vendor/pdfjs/cmaps/ETenms-B5-V.bcmap',
  'vendor/pdfjs/cmaps/EUC-H.bcmap',
  'vendor/pdfjs/cmaps/EUC-V.bcmap',
  'vendor/pdfjs/cmaps/Ext-H.bcmap',
  'vendor/pdfjs/cmaps/Ext-RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/Ext-RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/Ext-V.bcmap',
  'vendor/pdfjs/cmaps/GB-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/GB-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/GB-H.bcmap',
  'vendor/pdfjs/cmaps/GB-V.bcmap',
  'vendor/pdfjs/cmaps/GBK-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/GBK-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/GBK2K-H.bcmap',
  'vendor/pdfjs/cmaps/GBK2K-V.bcmap',
  'vendor/pdfjs/cmaps/GBKp-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/GBKp-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/GBT-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/GBT-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/GBT-H.bcmap',
  'vendor/pdfjs/cmaps/GBT-V.bcmap',
  'vendor/pdfjs/cmaps/GBTpc-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/GBTpc-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/GBpc-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/GBpc-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/H.bcmap',
  'vendor/pdfjs/cmaps/HKdla-B5-H.bcmap',
  'vendor/pdfjs/cmaps/HKdla-B5-V.bcmap',
  'vendor/pdfjs/cmaps/HKdlb-B5-H.bcmap',
  'vendor/pdfjs/cmaps/HKdlb-B5-V.bcmap',
  'vendor/pdfjs/cmaps/HKgccs-B5-H.bcmap',
  'vendor/pdfjs/cmaps/HKgccs-B5-V.bcmap',
  'vendor/pdfjs/cmaps/HKm314-B5-H.bcmap',
  'vendor/pdfjs/cmaps/HKm314-B5-V.bcmap',
  'vendor/pdfjs/cmaps/HKm471-B5-H.bcmap',
  'vendor/pdfjs/cmaps/HKm471-B5-V.bcmap',
  'vendor/pdfjs/cmaps/HKscs-B5-H.bcmap',
  'vendor/pdfjs/cmaps/HKscs-B5-V.bcmap',
  'vendor/pdfjs/cmaps/Hankaku.bcmap',
  'vendor/pdfjs/cmaps/Hiragana.bcmap',
  'vendor/pdfjs/cmaps/KSC-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/KSC-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/KSC-H.bcmap',
  'vendor/pdfjs/cmaps/KSC-Johab-H.bcmap',
  'vendor/pdfjs/cmaps/KSC-Johab-V.bcmap',
  'vendor/pdfjs/cmaps/KSC-V.bcmap',
  'vendor/pdfjs/cmaps/KSCms-UHC-H.bcmap',
  'vendor/pdfjs/cmaps/KSCms-UHC-HW-H.bcmap',
  'vendor/pdfjs/cmaps/KSCms-UHC-HW-V.bcmap',
  'vendor/pdfjs/cmaps/KSCms-UHC-V.bcmap',
  'vendor/pdfjs/cmaps/KSCpc-EUC-H.bcmap',
  'vendor/pdfjs/cmaps/KSCpc-EUC-V.bcmap',
  'vendor/pdfjs/cmaps/Katakana.bcmap',
  'vendor/pdfjs/cmaps/NWP-H.bcmap',
  'vendor/pdfjs/cmaps/NWP-V.bcmap',
  'vendor/pdfjs/cmaps/RKSJ-H.bcmap',
  'vendor/pdfjs/cmaps/RKSJ-V.bcmap',
  'vendor/pdfjs/cmaps/Roman.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UCS2-H.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UCS2-V.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UTF16-H.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UTF16-V.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UTF32-H.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UTF32-V.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UTF8-H.bcmap',
  'vendor/pdfjs/cmaps/UniCNS-UTF8-V.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UCS2-H.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UCS2-V.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UTF16-H.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UTF16-V.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UTF32-H.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UTF32-V.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UTF8-H.bcmap',
  'vendor/pdfjs/cmaps/UniGB-UTF8-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UCS2-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UCS2-HW-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UCS2-HW-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UCS2-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UTF16-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UTF16-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UTF32-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UTF32-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UTF8-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS-UTF8-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS2004-UTF16-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS2004-UTF16-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS2004-UTF32-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS2004-UTF32-V.bcmap',
  'vendor/pdfjs/cmaps/UniJIS2004-UTF8-H.bcmap',
  'vendor/pdfjs/cmaps/UniJIS2004-UTF8-V.bcmap',
  'vendor/pdfjs/cmaps/UniJISPro-UCS2-HW-V.bcmap',
  'vendor/pdfjs/cmaps/UniJISPro-UCS2-V.bcmap',
  'vendor/pdfjs/cmaps/UniJISPro-UTF8-V.bcmap',
  'vendor/pdfjs/cmaps/UniJISX0213-UTF32-H.bcmap',
  'vendor/pdfjs/cmaps/UniJISX0213-UTF32-V.bcmap',
  'vendor/pdfjs/cmaps/UniJISX02132004-UTF32-H.bcmap',
  'vendor/pdfjs/cmaps/UniJISX02132004-UTF32-V.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UCS2-H.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UCS2-V.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UTF16-H.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UTF16-V.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UTF32-H.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UTF32-V.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UTF8-H.bcmap',
  'vendor/pdfjs/cmaps/UniKS-UTF8-V.bcmap',
  'vendor/pdfjs/cmaps/V.bcmap',
  'vendor/pdfjs/cmaps/WP-Symbol.bcmap',
  'vendor/pdfjs/pdf.min.mjs',
  'vendor/pdfjs/pdf.worker.min.mjs',
  'vendor/pdfjs/standard_fonts/FoxitDingbats.pfb',
  'vendor/pdfjs/standard_fonts/FoxitFixed.pfb',
  'vendor/pdfjs/standard_fonts/FoxitFixedBold.pfb',
  'vendor/pdfjs/standard_fonts/FoxitFixedBoldItalic.pfb',
  'vendor/pdfjs/standard_fonts/FoxitFixedItalic.pfb',
  'vendor/pdfjs/standard_fonts/FoxitSerif.pfb',
  'vendor/pdfjs/standard_fonts/FoxitSerifBold.pfb',
  'vendor/pdfjs/standard_fonts/FoxitSerifBoldItalic.pfb',
  'vendor/pdfjs/standard_fonts/FoxitSerifItalic.pfb',
  'vendor/pdfjs/standard_fonts/FoxitSymbol.pfb',
  'vendor/pdfjs/standard_fonts/LiberationSans-Bold.ttf',
  'vendor/pdfjs/standard_fonts/LiberationSans-BoldItalic.ttf',
  'vendor/pdfjs/standard_fonts/LiberationSans-Italic.ttf',
  'vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf'
];

// While developing on your own computer, always try the newest files first
const IS_DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname);

// { cache: 'reload' } skips the browser's ordinary cache, so we never save an
// old file into a new version
const fresh = (url) => new Request(url, { cache: 'reload' });

// Saves the PDF.js files that this PDF.js cache does not have yet
// (normally none: they stay from the previous release)
async function fillPdfjsCache() {
  const cache = await caches.open(PDFJS_CACHE);
  const have = new Set((await cache.keys()).map((request) => request.url));
  const missing = PDFJS_FILES.filter((path) => !have.has(new URL(path, self.location).href));
  return cache.addAll(missing.map(fresh));
}

// Install: save a copy of every file
self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map(fresh))),
    fillPdfjsCache()
  ]));
  // No skipWaiting() here: the new version waits until the user taps Update.
});

// Activate: delete the copies of older versions (and of an older PDF.js),
// but never the current ones
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('lagio-') && name !== CACHE && name !== PDFJS_CACHE)
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
