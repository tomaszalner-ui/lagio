// trip-bookings.js — the trip's "Tickets and bookings" screen
// (#/trip/:id/bookings): bookings grouped by day (each with its number of
// attached files), then "Other documents" for the whole trip.

import { useEffect } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadDocuments, reloadBookings } from '../store.js';
import { t, formatDate, formatFileSize } from '../i18n.js';
import { paths } from '../router.js';
import { totalSize, countByBooking } from '../modules/documents.js';
import { groupByDay } from '../modules/bookings.js';
import { BookingCard } from './booking-parts.js';
import { DocumentSection } from './document-section.js';
import { EmptyState } from './empty-state.js';
import { NotFound } from './not-found.js';
import { ChevronLeft, PlusIcon } from './illustrations.js';

// The bookings, one block per day ("gruodžio 20 d., sekmadienis")
function BookingList({ tripId, bookings, attachments }) {
  return html`
    ${groupByDay(bookings).map((group) => html`
      <div class="day-group" key=${group.date || 'undated'}>
        <h3 class="day-title">${group.date ? formatDate(group.date, 'day') : t('bookings.undated')}</h3>
        <ul class="card-list">
          ${group.bookings.map((booking) => html`
            <li key=${booking.id}>
              <${BookingCard} tripId=${tripId} booking=${booking} attachments=${attachments[booking.id] || 0} />
            </li>`)}
        </ul>
      </div>`)}`;
}

export function TripBookings({ id }) {
  const trips = useStore((s) => s.trips);
  const documents = useStore((s) => s.documents);
  const bookings = useStore((s) => s.bookings);

  useEffect(() => {
    Promise.all([reloadBookings(id), reloadDocuments(id)]).catch((error) => console.error(error));
  }, [id]);

  const trip = trips.find((item) => item.id === id);
  if (!trip) return html`<${NotFound} />`;

  const allDocs = documents.tripId === id ? documents.items : [];
  const bookingsLoaded = bookings.tripId === id;
  const tripBookings = bookingsLoaded ? bookings.items : [];

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.trip(id)}>
        <${ChevronLeft} /><span>${trip.name}</span>
      </a>
      <h1 class="screen-title screen-head">${t('dashboard.tiles.bookings')}</h1>

      <section class="booking-section">
        <div class="section-head">
          <h2 class="section-title">${t('bookings.title')}</h2>
          ${tripBookings.length > 0 && html`
            <a class="button button-primary button-small" href=${paths.bookingNew(id)}>
              <${PlusIcon} /><span>${t('bookings.new')}</span>
            </a>`}
        </div>
        ${bookingsLoaded && tripBookings.length === 0
          ? html`
            <${EmptyState} title=${t('bookings.emptyTitle')} text=${t('bookings.emptyText')}>
              <a class="button button-primary" href=${paths.bookingNew(id)}>
                <${PlusIcon} /><span>${t('bookings.new')}</span>
              </a>
            <//>`
          : html`<${BookingList} tripId=${id} bookings=${tripBookings} attachments=${countByBooking(allDocs)} />`}
      </section>

      <${DocumentSection}
        tripId=${id}
        bookingId=${null}
        labels=${{
          title: 'documents.otherTitle',
          emptyTitle: 'documents.otherEmptyTitle',
          emptyText: 'documents.otherEmptyText',
          add: 'documents.add'
        }}
      />
      ${allDocs.length > 0 && html`
        <p class="muted storage-line">${t('documents.storageUsed', { size: formatFileSize(totalSize(allDocs)) })}</p>`}
    </section>`;
}
