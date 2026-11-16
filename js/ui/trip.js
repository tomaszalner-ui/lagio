// trip.js — one trip's screen (#/trip/:id).
// Milestone 1: only a placeholder, so the route can be tested.

import { html } from './html.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { EmptyState } from './empty-state.js';
import { Suitcase, ChevronLeft } from './illustrations.js';

export function Trip({ id }) {
  return html`
    <section class="screen" data-trip-id=${id}>
      <a class="back-link" href=${paths.home()}>
        <${ChevronLeft} />
        <span>${t('nav.back')}</span>
      </a>
      <${EmptyState}
        illustration=${html`<${Suitcase} />`}
        title=${t('trip.comingSoonTitle')}
        text=${t('trip.comingSoonText')}
      />
    </section>`;
}
