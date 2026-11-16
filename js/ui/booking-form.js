// booking-form.js — add a booking (#/trip/:id/bookings/new) or edit one
// (#/trip/:id/bookings/:bookingId/edit).
// BookingForm waits until the trip's bookings are loaded, then shows
// BookingFormFields, which keeps the typed values in local state.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadBookings } from '../store.js';
import { t, currencyName, parseAmount, amountForInput } from '../i18n.js';
import { navigate, paths } from '../router.js';
import { CURRENCIES } from '../modules/trips.js';
import {
  BOOKING_TYPES, validateBooking, createBooking, updateBooking, joinDateTime, splitDateTime
} from '../modules/bookings.js';
import { Field } from './field.js';
import { NotFound } from './not-found.js';
import { showToast } from './toast.js';
import { TYPE_INFO, TypeIcon, timeLabels } from './booking-parts.js';

// Error code from validateBooking() -> text key
const ERROR_TEXT = {
  title: { required: 'bookingForm.error.titleRequired' },
  startAt: { requiredWithEnd: 'bookingForm.error.startRequired' },
  endAt: { beforeStart: 'bookingForm.error.endBeforeStart' },
  price: { invalid: 'bookingForm.error.priceInvalid' }
};

// Which input to focus for each error, in screen order
const ERROR_FOCUS = [['title', 'booking-title'], ['startAt', 'booking-startDate'], ['endAt', 'booking-endDate'], ['price', 'booking-price']];

function initialValues(booking, trip) {
  if (!booking) {
    return {
      type: 'flight', title: '', startDate: '', startTime: '', endDate: '', endTime: '',
      provider: '', confirmationCode: '', address: '', priceText: '', currency: trip.currency, note: ''
    };
  }
  const [startDate, startTime] = splitDateTime(booking.startAt);
  const [endDate, endTime] = splitDateTime(booking.endAt);
  return {
    type: booking.type,
    title: booking.title,
    startDate, startTime, endDate, endTime,
    provider: booking.provider,
    confirmationCode: booking.confirmationCode,
    address: booking.address,
    priceText: amountForInput(booking.price, booking.currency),
    currency: booking.currency,
    note: booking.note
  };
}

// Form values -> the shape bookings.js expects
function toBooking(values) {
  return {
    type: values.type,
    title: values.title,
    startAt: joinDateTime(values.startDate, values.startTime),
    endAt: joinDateTime(values.endDate, values.endTime),
    provider: values.provider,
    confirmationCode: values.confirmationCode,
    address: values.address,
    price: parseAmount(values.priceText, values.currency),
    currency: values.currency,
    note: values.note
  };
}

function BookingFormFields({ trip, booking }) {
  const [values, setValues] = useState(() => initialValues(booking, trip));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const latest = useRef(values); // newest values right away (see trip-form.js)

  const labels = timeLabels(values.type);
  const backTo = booking ? paths.booking(trip.id, booking.id) : paths.tripBookings(trip.id);

  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
    const errorField = { startDate: 'startAt', endDate: 'endAt', priceText: 'price' }[field] || field;
    if (errors[errorField]) setErrors((current) => ({ ...current, [errorField]: undefined }));
  }

  function errorText(field) {
    const code = errors[field];
    return code ? t(ERROR_TEXT[field][code]) : '';
  }

  async function save(event) {
    event.preventDefault();
    const input = toBooking(latest.current);
    const found = validateBooking(input);
    setErrors(found);
    const first = ERROR_FOCUS.find(([field]) => found[field]);
    if (first) {
      document.getElementById(first[1])?.focus();
      return;
    }
    setSaving(true);
    try {
      const saved = booking ? await updateBooking(booking.id, input) : await createBooking(trip.id, input);
      await reloadBookings(trip.id);
      navigate(paths.booking(trip.id, saved.id), { replace: true });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
      setSaving(false);
    }
  }

  // A date + time pair (start or end)
  function DateTimeRow({ which, label }) {
    const dateField = which + 'Date';
    const timeField = which + 'Time';
    const errorField = which + 'At';
    return html`
      <fieldset class="field date-time">
        <legend class="field-label">${label}</legend>
        <div class="field-row">
          <input
            id=${'booking-' + dateField}
            class="input"
            type="date"
            aria-label=${t('bookingForm.date')}
            value=${values[dateField]}
            min=${which === 'end' ? values.startDate || undefined : undefined}
            aria-invalid=${!!errors[errorField]}
            onInput=${(event) => set(dateField, event.currentTarget.value)}
          />
          <input
            id=${'booking-' + timeField}
            class="input"
            type="time"
            aria-label=${t('bookingForm.time')}
            value=${values[timeField]}
            disabled=${!values[dateField]}
            onInput=${(event) => set(timeField, event.currentTarget.value)}
          />
        </div>
        ${errors[errorField] && html`<p class="field-error" role="alert">${errorText(errorField)}</p>`}
      </fieldset>`;
  }

  return html`
    <section class="screen">
      <h1 class="screen-title screen-head">
        ${booking ? t('bookingForm.editTitle') : t('bookingForm.newTitle')}
      </h1>

      <form class="form" onSubmit=${save} noValidate>
        <div class="field">
          <span class="field-label" id="booking-type-label">${t('bookingForm.type')}</span>
          <div class="type-picker" role="radiogroup" aria-labelledby="booking-type-label">
            ${BOOKING_TYPES.map((type) => html`
              <button
                type="button"
                key=${type}
                role="radio"
                class="type-option"
                aria-checked=${values.type === type}
                onClick=${() => set('type', type)}
              >
                <${TypeIcon} type=${type} />
                <span>${t(TYPE_INFO[type].key)}</span>
              </button>`)}
          </div>
        </div>

        <${Field} id="booking-title" label=${t('bookingForm.title')} error=${errorText('title')}>
          <input
            id="booking-title"
            class="input"
            type="text"
            value=${values.title}
            placeholder=${t('bookingForm.titlePlaceholder')}
            maxLength="120"
            autocomplete="off"
            aria-invalid=${!!errors.title}
            onInput=${(event) => set('title', event.currentTarget.value)}
          />
        <//>

        ${DateTimeRow({ which: 'start', label: t(labels.start) })}
        ${DateTimeRow({ which: 'end', label: t(labels.end) })}

        <${Field} id="booking-provider" label=${t('bookingForm.provider')}>
          <input
            id="booking-provider"
            class="input"
            type="text"
            value=${values.provider}
            placeholder=${t('bookingForm.providerPlaceholder')}
            autocomplete="off"
            onInput=${(event) => set('provider', event.currentTarget.value)}
          />
        <//>

        <${Field} id="booking-code" label=${t('bookingForm.code')}>
          <input
            id="booking-code"
            class="input input-code"
            type="text"
            value=${values.confirmationCode}
            placeholder=${t('bookingForm.codePlaceholder')}
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            onInput=${(event) => set('confirmationCode', event.currentTarget.value)}
          />
        <//>

        <${Field} id="booking-address" label=${t('bookingForm.address')}>
          <input
            id="booking-address"
            class="input"
            type="text"
            value=${values.address}
            placeholder=${t('bookingForm.addressPlaceholder')}
            autocomplete="off"
            onInput=${(event) => set('address', event.currentTarget.value)}
          />
        <//>

        <div class="field-row">
          <${Field} id="booking-price" label=${t('bookingForm.price')} error=${errorText('price')}>
            <input
              id="booking-price"
              class="input"
              type="text"
              inputmode="decimal"
              value=${values.priceText}
              placeholder=${amountForInput(0, values.currency)}
              aria-invalid=${!!errors.price}
              onInput=${(event) => set('priceText', event.currentTarget.value)}
            />
          <//>
          <${Field} id="booking-currency" label=${t('bookingForm.currency')}>
            <select
              id="booking-currency"
              class="input"
              value=${values.currency}
              onChange=${(event) => set('currency', event.currentTarget.value)}
            >
              ${CURRENCIES.map((code) => html`
                <option key=${code} value=${code}>${code} · ${currencyName(code)}</option>`)}
            </select>
          <//>
        </div>

        <${Field} id="booking-note" label=${t('bookingForm.note')}>
          <textarea
            id="booking-note"
            class="input textarea"
            rows="3"
            value=${values.note}
            onInput=${(event) => set('note', event.currentTarget.value)}
          ></textarea>
        <//>

        <div class="form-buttons">
          <a class="button" href=${backTo} onClick=${(event) => {
            event.preventDefault();
            navigate(backTo, { replace: true });
          }}>${t('common.cancel')}</a>
          <button type="submit" class="button button-primary" disabled=${saving}>
            ${booking ? t('common.save') : t('bookingForm.create')}
          </button>
        </div>
      </form>
    </section>`;
}

export function BookingForm({ tripId, bookingId }) {
  const trips = useStore((s) => s.trips);
  const bookings = useStore((s) => s.bookings);

  useEffect(() => {
    if (bookings.tripId !== tripId) reloadBookings(tripId).catch((error) => console.error(error));
  }, [tripId]);

  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return html`<${NotFound} />`;
  if (bookings.tripId !== tripId) return null; // still loading (a moment)

  if (!bookingId) return html`<${BookingFormFields} trip=${trip} booking=${null} />`;
  const booking = bookings.items.find((item) => item.id === bookingId);
  if (!booking) {
    return html`<${NotFound}
      title=${t('booking.notFoundTitle')}
      text=${t('trips.notFoundText')}
      backHref=${paths.tripBookings(tripId)}
      backLabel=${t('dashboard.tiles.bookings')}
    />`;
  }
  return html`<${BookingFormFields} trip=${trip} booking=${booking} />`;
}
