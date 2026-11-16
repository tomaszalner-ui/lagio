// home.js — the Home screen: trips grouped into "now and upcoming",
// "no dates yet" and "past", a New trip button and a link to the archive.

import { html } from './html.js';
import { useStore } from '../store.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { groupTrips, todayIso } from '../modules/trips.js';
import { EmptyState } from './empty-state.js';
import { Suitcase, PlusIcon } from './illustrations.js';
import { TripCard } from './trip-card.js';

function TripSection({ title, trips, today }) {
  if (trips.length === 0) return null;
  return html`
    <section class="trip-section">
      <h2 class="section-title">${title}</h2>
      <ul class="card-list">
        ${trips.map((trip) => html`
          <li key=${trip.id}><${TripCard} trip=${trip} today=${today} /></li>`)}
      </ul>
    </section>`;
}

export function Home() {
  const trips = useStore((s) => s.trips);
  const today = todayIso();
  const visible = trips.filter((trip) => !trip.archived);
  const archivedCount = trips.length - visible.length;
  const groups = groupTrips(visible, today);

  const archiveLink = archivedCount > 0 && html`
    <p class="archive-link">
      <a href=${paths.archive()}>${t('home.archiveLink', { count: archivedCount })}</a>
    </p>`;

  if (visible.length === 0) {
    return html`
      <section class="screen">
        <h1 class="screen-title screen-head">${t('home.title')}</h1>
        <${EmptyState}
          illustration=${html`<${Suitcase} />`}
          title=${t('home.emptyTitle')}
          text=${t('home.emptyText')}
        >
          <a class="button button-primary" href=${paths.tripNew()}>
            <${PlusIcon} /><span>${t('home.createFirst')}</span>
          </a>
        <//>
        ${archiveLink}
      </section>`;
  }

  return html`
    <section class="screen">
      <div class="screen-head">
        <h1 class="screen-title">${t('home.title')}</h1>
        <a class="button button-primary button-small" href=${paths.tripNew()}>
          <${PlusIcon} /><span>${t('home.newTrip')}</span>
        </a>
      </div>
      <${TripSection} title=${t('home.section.current')} trips=${groups.current} today=${today} />
      <${TripSection} title=${t('home.section.undated')} trips=${groups.undated} today=${today} />
      <${TripSection} title=${t('home.section.past')} trips=${groups.past} today=${today} />
      ${archiveLink}
    </section>`;
}
