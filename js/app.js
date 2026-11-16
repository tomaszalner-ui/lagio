// app.js — starts Lagio.
// Order: service worker → database → texts → trips → router → draw the screen.

import { render } from 'preact';
import { html } from './ui/html.js';
import { setState } from './store.js';
import { openDb } from './db.js';
import { initI18n } from './i18n.js';
import { startRouter } from './router.js';
import { registerServiceWorker } from './pwa.js';
import { listTrips } from './modules/trips.js';
import { Shell } from './ui/shell.js';

async function start() {
  registerServiceWorker();

  try {
    await openDb();
    await initI18n();
    setState({ trips: await listTrips() });
    startRouter();
    setState({ ready: true });
  } catch (error) {
    console.error('Lagio could not start:', error);
    try {
      await initI18n(); // still try to show the error in the right language
    } catch (ignored) {
      // texts missing too: the error screen shows the text keys
    }
    setState({ startupError: true });
  }

  render(html`<${Shell} />`, document.getElementById('app'));
}

start();
