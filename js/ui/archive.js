// archive.js — the Archive screen (#/archive): archived trips, each with
// a Restore button. Tapping a card still opens the trip.

import { html } from './html.js';
import { useStore } from '../store.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { todayIso } from '../modules/trips.js';
import { EmptyState } from './empty-state.js';
import { ChevronLeft } from './illustrations.js';
import { TripCard } from './trip-card.js';
import { restoreFromArchive } from './trip-actions.js';

export function Archive() {
  const trips = useStore((s) => s.trips);
  const today = todayIso();
  const archived = trips
    .filter((trip) => trip.archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.home()}>
        <${ChevronLeft} /><span>${t('home.title')}</span>
      </a>
      <h1 class="screen-title screen-head">${t('archive.title')}</h1>
      ${archived.length === 0
        ? html`<${EmptyState} title=${t('archive.emptyTitle')} text=${t('archive.emptyText')} />`
        : html`
          <ul class="card-list">
            ${archived.map((trip) => html`
              <li key=${trip.id} class="archive-row">
                <${TripCard} trip=${trip} today=${today} />
                <button type="button" class="button button-small" onClick=${() => restoreFromArchive(trip)}>
                  ${t('archive.restore')}
                </button>
              </li>`)}
          </ul>`}
    </section>`;
}
