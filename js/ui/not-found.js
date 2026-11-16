// not-found.js — shown when a trip's address points to a trip that does
// not exist (or was deleted).

import { html } from './html.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { EmptyState } from './empty-state.js';
import { ChevronLeft } from './illustrations.js';

export function NotFound() {
  return html`
    <section class="screen">
      <a class="back-link" href=${paths.home()}>
        <${ChevronLeft} /><span>${t('home.title')}</span>
      </a>
      <${EmptyState} title=${t('trips.notFoundTitle')} text=${t('trips.notFoundText')} />
    </section>`;
}
