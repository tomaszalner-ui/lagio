// home.js — the Home screen: the list of trips (empty in milestone 1).

import { html } from './html.js';
import { useStore } from '../store.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { EmptyState } from './empty-state.js';
import { Suitcase } from './illustrations.js';

export function Home() {
  const trips = useStore((s) => s.trips);

  return html`
    <section class="screen">
      <div class="screen-head">
        <h1 class="screen-title">${t('home.title')}</h1>
        ${trips.length > 0 && html`
          <p class="muted">${t('trips.count', { count: trips.length })}</p>`}
      </div>

      ${trips.length === 0
        ? html`<${EmptyState}
            illustration=${html`<${Suitcase} />`}
            title=${t('home.emptyTitle')}
            text=${t('home.emptyText')}
          />`
        : html`<ul class="card-list">
            ${trips.map((trip) => html`
              <li key=${trip.id}>
                <a class="card" href=${paths.trip(trip.id)}>
                  ${trip.name || t('trips.untitled')}
                </a>
              </li>`)}
          </ul>`}
    </section>`;
}
