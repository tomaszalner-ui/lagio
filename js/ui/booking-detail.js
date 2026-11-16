// booking-detail.js — one booking (#/trip/:id/bookings/:bookingId):
// all its details, copy the confirmation code, open the address in a map,
// edit or delete it. Step 3c adds its attached tickets here.

import { useEffect, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadBookings, reloadDocuments } from '../store.js';
import { t, formatDateTime, formatMoney } from '../i18n.js';
import { navigate, paths } from '../router.js';
import { deleteBooking, undoDeleteBooking } from '../modules/bookings.js';
import { ConfirmDialog } from './dialog.js';
import { NotFound } from './not-found.js';
import { showToast } from './toast.js';
import { ChevronLeft, CopyIcon, PinIcon } from './illustrations.js';
import { TYPE_INFO, TypeIcon, timeLabels } from './booking-parts.js';

// Copies text. The modern way first; if the browser refuses it, the older
// way through a hidden text field. Returns true when it worked.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.className = 'visually-hidden';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  }
}

// A map search for the address. It is a link the user taps (it opens the
// maps app or site), not a network call by Lagio. (external link)
function mapLink(address) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address); // external link
}

export function BookingDetail({ tripId, bookingId }) {
  const trips = useStore((s) => s.trips);
  const bookings = useStore((s) => s.bookings);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (bookings.tripId !== tripId) reloadBookings(tripId).catch((error) => console.error(error));
  }, [tripId]);

  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return html`<${NotFound} />`;
  if (bookings.tripId !== tripId) return null; // still loading (a moment)

  const listHref = paths.tripBookings(tripId);
  const booking = bookings.items.find((item) => item.id === bookingId);
  if (!booking) {
    return html`<${NotFound}
      title=${t('booking.notFoundTitle')}
      text=${t('trips.notFoundText')}
      backHref=${listHref}
      backLabel=${t('dashboard.tiles.bookings')}
    />`;
  }

  const labels = timeLabels(booking.type);

  async function copyCode() {
    const copied = await copyText(booking.confirmationCode);
    showToast({ text: copied ? t('toast.copied') : t('common.error') });
  }

  async function remove() {
    setConfirmingDelete(false);
    try {
      const deleted = await deleteBooking(booking);
      navigate(listHref, { replace: true }); // leave first, so this screen never shows "not found"
      await Promise.all([reloadBookings(tripId), reloadDocuments(tripId)]);
      showToast({
        text: t('toast.bookingDeleted'),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await undoDeleteBooking(deleted);
          await Promise.all([reloadBookings(tripId), reloadDocuments(tripId)]);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  // Label + value rows; empty values are left out
  const rows = [
    booking.startAt && { label: t(labels.start), value: formatDateTime(booking.startAt) },
    booking.endAt && { label: t(labels.end), value: formatDateTime(booking.endAt) },
    booking.provider && { label: t('bookingForm.provider'), value: booking.provider },
    booking.price !== null && { label: t('bookingForm.price'), value: formatMoney(booking.price, booking.currency) }
  ].filter(Boolean);

  return html`
    <section class="screen">
      <a class="back-link" href=${listHref}>
        <${ChevronLeft} /><span>${t('dashboard.tiles.bookings')}</span>
      </a>

      <header class="booking-header">
        <span class="booking-icon is-large"><${TypeIcon} type=${booking.type} /></span>
        <div class="booking-header-text">
          <p class="booking-type">${t(TYPE_INFO[booking.type].key)}</p>
          <h1 class="booking-header-title">${booking.title}</h1>
        </div>
      </header>

      ${booking.confirmationCode && html`
        <div class="code-box">
          <div>
            <p class="detail-label">${t('bookingForm.code')}</p>
            <p class="code-value">${booking.confirmationCode}</p>
          </div>
          <button type="button" class="button button-small" onClick=${copyCode}>
            <${CopyIcon} /><span>${t('booking.copyCode')}</span>
          </button>
        </div>`}

      ${rows.length > 0 && html`
        <dl class="detail-list">
          ${rows.map((row) => html`
            <div class="detail-row" key=${row.label}>
              <dt class="detail-label">${row.label}</dt>
              <dd class="detail-value">${row.value}</dd>
            </div>`)}
        </dl>`}

      ${booking.address && html`
        <div class="detail-block">
          <p class="detail-label">${t('bookingForm.address')}</p>
          <p class="detail-value">${booking.address}</p>
          <a class="button button-small" href=${mapLink(booking.address)} target="_blank" rel="noopener">
            <${PinIcon} /><span>${t('booking.openMap')}</span>
          </a>
        </div>`}

      ${booking.note && html`
        <div class="detail-block">
          <p class="detail-label">${t('bookingForm.note')}</p>
          <p class="detail-value detail-note">${booking.note}</p>
        </div>`}

      <div class="form-buttons detail-buttons">
        <button type="button" class="button button-danger-text" onClick=${() => setConfirmingDelete(true)}>
          ${t('booking.delete')}
        </button>
        <a class="button button-primary" href=${paths.bookingEdit(tripId, booking.id)}>${t('booking.edit')}</a>
      </div>

      <${ConfirmDialog}
        open=${confirmingDelete}
        title=${t('booking.deleteTitle')}
        text=${t('booking.deleteText', { name: booking.title })}
        confirmLabel=${t('delete.confirm')}
        danger=${true}
        onCancel=${() => setConfirmingDelete(false)}
        onConfirm=${remove}
      />
    </section>`;
}
