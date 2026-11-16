// trip-form.js — create a trip (#/trip/new) or edit one (#/trip/:id/edit).
// The form keeps its own copy of the values while you type ("local state",
// via useState); only Save writes them to the database.

import { useState, useRef } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadTrips } from '../store.js';
import { t, currencyName } from '../i18n.js';
import { navigate, paths } from '../router.js';
import {
  COVER_COLORS, CURRENCIES, DEFAULT_CURRENCY, validateTrip, createTrip, updateTrip
} from '../modules/trips.js';
import { Field } from './field.js';
import { ColorPicker } from './color-picker.js';
import { PlacesInput } from './places-input.js';
import { showToast } from './toast.js';
import { NotFound } from './not-found.js';

// Error code from validateTrip() -> text key
const ERROR_TEXT = {
  name: { required: 'tripForm.error.nameRequired' },
  startDate: { requiredWithEnd: 'tripForm.error.startRequired' },
  endDate: { beforeStart: 'tripForm.error.endBeforeStart' }
};

// Text keys for the travelers field
const TRAVELER_LABELS = {
  placeholder: 'tripForm.travelerPlaceholder',
  add: 'tripForm.addTraveler',
  remove: 'tripForm.removeTraveler',
  rename: 'tripForm.renameTraveler'
};

// Field order, for moving the focus to the first error
const FIELD_ORDER = ['name', 'startDate', 'endDate'];

function initialValues(trip, tripCount) {
  if (trip) {
    const { name, destinations, startDate, endDate, coverColor, currency, travelers } = trip;
    return { name, destinations, startDate, endDate, coverColor, currency, travelers: travelers || [] };
  }
  return {
    name: '',
    destinations: [],
    travelers: [],
    startDate: '',
    endDate: '',
    coverColor: COVER_COLORS[tripCount % COVER_COLORS.length], // a new colour each time
    currency: DEFAULT_CURRENCY
  };
}

export function TripForm({ id }) {
  const trips = useStore((s) => s.trips);
  const existing = id ? trips.find((trip) => trip.id === id) : null;
  const [values, setValues] = useState(() => initialValues(existing, trips.length));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  // The newest values right away, even before the screen redraws. Save reads
  // this, so a place added as the field loses focus is never left out.
  const latest = useRef(values);

  if (id && !existing) return html`<${NotFound} />`;

  const backTo = existing ? paths.trip(existing.id) : paths.home();

  // Changes one value and clears that field's error
  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function errorText(field) {
    const code = errors[field];
    return code ? t(ERROR_TEXT[field][code]) : '';
  }

  async function save(event) {
    event.preventDefault();
    const values = latest.current;
    const found = validateTrip(values);
    setErrors(found);
    const firstError = FIELD_ORDER.find((field) => found[field]);
    if (firstError) {
      document.getElementById('trip-' + firstError)?.focus();
      return;
    }
    setSaving(true);
    try {
      const saved = existing ? await updateTrip(existing.id, values) : await createTrip(values);
      await reloadTrips();
      navigate(paths.trip(saved.id), { replace: true });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
      setSaving(false);
    }
  }

  return html`
    <section class="screen">
      <h1 class="screen-title screen-head">
        ${existing ? t('tripForm.editTitle') : t('tripForm.newTitle')}
      </h1>

      <form class="form" onSubmit=${save} noValidate>
        <${Field} id="trip-name" label=${t('tripForm.name')} error=${errorText('name')}>
          <input
            id="trip-name"
            class="input"
            type="text"
            value=${values.name}
            placeholder=${t('tripForm.namePlaceholder')}
            maxLength="80"
            autocomplete="off"
            aria-invalid=${!!errors.name}
            aria-describedby=${errors.name ? 'trip-name-error' : undefined}
            onInput=${(event) => set('name', event.currentTarget.value)}
          />
        <//>

        <${Field} id="trip-places" label=${t('tripForm.places')} hint=${t('tripForm.placesHint')}>
          <${PlacesInput}
            id="trip-places"
            value=${values.destinations}
            onChange=${(list) => set('destinations', list)}
          />
        <//>

        <${Field} id="trip-travelers" label=${t('tripForm.travelers')} hint=${t('tripForm.travelersHint')}>
          <${PlacesInput}
            id="trip-travelers"
            value=${values.travelers}
            editable=${true}
            labels=${TRAVELER_LABELS}
            onChange=${(list) => set('travelers', list)}
          />
        <//>

        <div class="field-row">
          <${Field} id="trip-startDate" label=${t('tripForm.startDate')} error=${errorText('startDate')}>
            <input
              id="trip-startDate"
              class="input"
              type="date"
              value=${values.startDate}
              aria-invalid=${!!errors.startDate}
              onInput=${(event) => set('startDate', event.currentTarget.value)}
            />
          <//>
          <${Field} id="trip-endDate" label=${t('tripForm.endDate')} error=${errorText('endDate')}>
            <input
              id="trip-endDate"
              class="input"
              type="date"
              value=${values.endDate}
              min=${values.startDate || undefined}
              aria-invalid=${!!errors.endDate}
              onInput=${(event) => set('endDate', event.currentTarget.value)}
            />
          <//>
        </div>
        ${!values.startDate && !errors.startDate && html`
          <p class="field-hint form-note">${t('tripForm.datesHint')}</p>`}

        <div class="field">
          <span class="field-label" id="trip-color-label">${t('tripForm.color')}</span>
          <${ColorPicker}
            labelId="trip-color-label"
            value=${values.coverColor}
            onChange=${(color) => set('coverColor', color)}
          />
        </div>

        <${Field} id="trip-currency" label=${t('tripForm.currency')} hint=${t('tripForm.currencyHint')}>
          <select
            id="trip-currency"
            class="input"
            value=${values.currency}
            onChange=${(event) => set('currency', event.currentTarget.value)}
          >
            ${CURRENCIES.map((code) => html`
              <option key=${code} value=${code}>${code} · ${currencyName(code)}</option>`)}
          </select>
        <//>

        <div class="form-buttons">
          <a class="button" href=${backTo} onClick=${(event) => {
            event.preventDefault();
            navigate(backTo, { replace: true });
          }}>${t('common.cancel')}</a>
          <button type="submit" class="button button-primary" disabled=${saving}>
            ${existing ? t('common.save') : t('tripForm.create')}
          </button>
        </div>
      </form>
    </section>`;
}
