// today-card.js — "Šiandien" on the trip's dashboard during the trip:
// today's timeline (bookings and plan items) with a one-tap "Ticket" button
// for bookings that have a file attached, and a link to the whole plan.

import { useState } from 'preact/hooks';
import { html } from './html.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { buildTimeline } from '../modules/itinerary.js';
import { todayIso } from '../modules/trips.js';
import { DocumentViewer } from './document-viewer.js';
import { TypeIcon, timeLabels } from './booking-parts.js';
import { ITEM_TYPE_INFO, mapLink, time } from './trip-itinerary.js';
import { PinIcon, TicketIcon } from './illustrations.js';

export function TodayCard({ trip, items, days, bookings, documents }) {
  const [viewing, setViewing] = useState(null);
  const today = todayIso();
  const day = buildTimeline(trip, items, bookings, days).days.find((d) => d.date === today);
  if (!day) return null;

  // A booking's files: one opens straight away, several -> the booking screen
  const filesOf = (booking) => documents.filter((doc) => doc.bookingId === booking.id);

  return html`
    <section class="today-card">
      <header class="today-head">
        <h2 class="today-title">${t('itinerary.today')}</h2>
        <span class="today-day">${t('itinerary.dayN', { n: String(day.number) })}${day.title ? ' · ' + day.title : ''}</span>
      </header>

      ${day.entries.length === 0
        ? html`<p class="today-empty">${t('today.empty')}</p>`
        : html`<ul class="today-list">
            ${day.entries.map((entry) => {
              if (entry.kind === 'booking') {
                const { booking, role } = entry;
                const files = filesOf(booking);
                const labels = timeLabels(booking.type);
                return html`
                  <li class="today-entry" key=${booking.id + role}>
                    <span class="plan-time">${time(day.date, entry.time)}</span>
                    <a class="today-main" href=${paths.booking(trip.id, booking.id)}>
                      <span class="plan-icon"><${TypeIcon} type=${booking.type} /></span>
                      <span class="plan-text">
                        <span class="plan-title">${booking.title}</span>
                        <span class="plan-sub">${t(role === 'end' ? labels.end : labels.start)}</span>
                      </span>
                    </a>
                    ${files.length === 1 && html`
                      <button type="button" class="ticket-button" onClick=${() => setViewing(files[0])}>
                        <${TicketIcon} /><span>${t('today.ticket')}</span>
                      </button>`}
                    ${files.length > 1 && html`
                      <a class="ticket-button" href=${paths.booking(trip.id, booking.id)}>
                        <${TicketIcon} /><span>${t('today.tickets', { count: files.length })}</span>
                      </a>`}
                  </li>`;
              }
              const { item } = entry;
              const { Icon } = ITEM_TYPE_INFO[item.type] || ITEM_TYPE_INFO.activity;
              return html`
                <li class="today-entry" key=${item.id}>
                  <span class="plan-time">${time(day.date, item.startTime)}</span>
                  <a class="today-main" href=${paths.tripItinerary(trip.id)}>
                    <span class="plan-icon is-own"><${Icon} /></span>
                    <span class="plan-text">
                      <span class="plan-title">${item.title}</span>
                      ${item.address && html`<span class="plan-sub">${item.address}</span>`}
                    </span>
                  </a>
                  ${item.address && html`
                    <a class="plan-map" href=${mapLink(item.address)} target="_blank" rel="noopener"
                      aria-label=${t('itinerary.openMap', { name: item.title })}><${PinIcon} /></a>`}
                </li>`;
            })}
          </ul>`}

      <a class="today-all" href=${paths.tripItinerary(trip.id)}>${t('today.wholePlan')}</a>

      ${viewing && html`<${DocumentViewer} doc=${viewing} onClose=${() => setViewing(null)} />`}
    </section>`;
}
