// pwa.js — connects the page to the service worker (sw.js).
//
// The service worker keeps a copy of the app so it opens offline.
// When a new version is published, the browser downloads it in the background
// and it waits. We then show "new version available"; tapping Update tells the
// waiting version to take over, and the page reloads once.

import { setState } from './store.js';

let waitingWorker = null;
let updateRequested = false;

function offerUpdate(worker) {
  waitingWorker = worker;
  setState({ updateReady: true });
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then((registration) => {
    // A new version was already downloaded during an earlier visit
    if (registration.waiting && navigator.serviceWorker.controller) {
      offerUpdate(registration.waiting);
    }

    // A new version starts downloading now
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker.addEventListener('statechange', () => {
        // "installed" while an older version runs the page = update ready.
        // (On the very first visit there is no older version, so no prompt.)
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          offerUpdate(worker);
        }
      });
    });

    // Look for a new version whenever the app comes back to the screen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {});
    });
  }).catch((error) => {
    console.warn('Service worker not registered:', error);
  });

  // The new version has taken over: reload once to use its files
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateRequested) location.reload();
  });
}

// Called by the Update button
export function applyUpdate() {
  if (!waitingWorker) return;
  updateRequested = true;
  waitingWorker.postMessage('skipWaiting');
}
