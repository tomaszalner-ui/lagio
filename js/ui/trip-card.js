// trip-card.js — one trip in a list: colour tile with the first letter,
// name, places, dates and a small badge ("Po 12 dienų", "Vyksta dabar"…).

import { html } from './html.js';
import { t, formatDateRange } from '../i18n.js';
import { paths } from '../router.js';
import { getTripStage } from '../modules/trips.js';

// The badge text and style for a trip's stage
export function stageBadge(trip, today) {
  if (trip.archived) return { text: t('trips.badge.archived'), kind: 'muted' };
  const info = getTripStage(trip, today);
  switch (info.stage) {
    case 'planning':
      return info.daysUntil === 1
        ? { text: t('trips.badge.tomorrow'), kind: 'soon' }
        : { text: t('trips.badge.inDays', { count: info.daysUntil }), kind: 'soon' };
    case 'active':
      return { text: t('trips.badge.active'), kind: 'active' };
    case 'done':
      return { text: t('trips.badge.done'), kind: 'muted' };
    default:
      return { text: t('trips.badge.undated'), kind: 'muted' };
  }
}

// First letter of the name, for the colour tile
function initial(name) {
  return ([...String(name).trim()][0] || '').toLocaleUpperCase();
}

export function TripCard({ trip, today }) {
  const badge = stageBadge(trip, today);
  const places = trip.destinations.map((place) => place.name).join(', ');
  const dates = formatDateRange(trip.startDate, trip.endDate);

  return html`
    <a class="trip-card" href=${paths.trip(trip.id)}>
      <span class=${'trip-card-cover cover-' + trip.coverColor} aria-hidden="true">${initial(trip.name)}</span>
      <span class="trip-card-body">
        <span class="trip-card-name">${trip.name || t('trips.untitled')}</span>
        ${places && html`<span class="trip-card-places">${places}</span>`}
        <span class="trip-card-meta">
          ${dates && html`<span>${dates}</span>`}
          <span class=${'badge badge-' + badge.kind}>${badge.text}</span>
        </span>
      </span>
    </a>`;
}
