// shell.js — the frame around every screen: top bar, current screen,
// update banner. Picks the screen from the route (see router.js).
//
// A "component" is a function that returns a piece of screen. Preact calls it
// again whenever the data it uses changes, and updates only what is different.

import { html } from './html.js';
import { useStore } from '../store.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { LangSwitch } from './lang-switch.js';
import { UpdateBanner } from './update-banner.js';
import { EmptyState } from './empty-state.js';
import { Home } from './home.js';
import { Trip } from './trip.js';

// Shown if the app cannot start, e.g. the browser blocks storage
function StartupError() {
  return html`
    <section class="screen">
      <${EmptyState} title=${t('error.startupTitle')} text=${t('error.startupText')}>
        <button type="button" class="button button-primary" onClick=${() => location.reload()}>
          ${t('error.retry')}
        </button>
      <//>
    </section>`;
}

export function Shell() {
  // Using `lang` here means the whole app redraws when the language changes
  useStore((s) => s.lang);
  const route = useStore((s) => s.route);
  const startupError = useStore((s) => s.startupError);

  let screen;
  if (startupError) screen = html`<${StartupError} />`;
  else if (route.name === 'trip') screen = html`<${Trip} id=${route.params.id} />`;
  else screen = html`<${Home} />`;

  return html`
    <header class="topbar">
      <a class="brand" href=${paths.home()}>${t('app.name')}</a>
      <${LangSwitch} />
    </header>
    <main class="main">${screen}</main>
    <${UpdateBanner} />`;
}
