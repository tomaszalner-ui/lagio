// trip-itinerary.js — the trip's day-by-day plan (#/trip/:id/itinerary).
// One card per trip day. Each day shows a timeline: the trip's bookings
// (automatically, from their dates) and the user's own plan items, sorted by
// time. Tap an item to edit it; tap a booking to open it (with its ticket).

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadItinerary, reloadBookings } from '../store.js';
import { t, formatDate, formatTime } from '../i18n.js';
import { paths } from '../router.js';
import { todayIso } from '../modules/trips.js';
import {
  ITEM_TYPES, validateItem, createItem, updateItem, deleteItem, undoDeleteItem, buildTimeline,
  setDayTitle, moveUntimed
} from '../modules/itinerary.js';
import { Field } from './field.js';
import { EmptyState } from './empty-state.js';
import { Modal } from './dialog.js';
import { NotFound } from './not-found.js';
import { showToast } from './toast.js';
import { TypeIcon, timeLabels } from './booking-parts.js';
import {
  ChevronLeft, ChevronUp, ChevronDown, PlusIcon, PinIcon, PencilIcon, StarIcon, FoodIcon, BusIcon, NoteIcon
} from './illustrations.js';

// Text key and icon of each plan item type (also used by today-card.js)
export const ITEM_TYPE_INFO = {
  activity: { key: 'itinerary.type.activity', Icon: StarIcon },
  food: { key: 'itinerary.type.food', Icon: FoodIcon },
  transport: { key: 'itinerary.type.transport', Icon: BusIcon },
  note: { key: 'itinerary.type.note', Icon: NoteIcon }
};

// Error code from validateItem() -> text key
const ERROR_TEXT = {
  title: { required: 'itinerary.error.titleRequired' },
  date: { required: 'itinerary.error.dateRequired' },
  startTime: { requiredWithEnd: 'itinerary.error.startRequired', invalid: 'itinerary.error.startRequired' },
  endTime: { beforeStart: 'itinerary.error.endBeforeStart' }
};

// A map search for the address: a link the user taps, not a call by Lagio
export const mapLink = (address) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address); // external link

export const time = (date, value) => (value ? formatTime(`${date}T${value}`) : '');

// The add / edit box for one plan item
function ItemDialog({ trip, item, date, onClose }) {
  const [values, setValues] = useState(() => item
    ? { ...item }
    : { date, type: 'activity', title: '', startTime: '', endTime: '', address: '', note: '' });
  const [errors, setErrors] = useState({});
  const latest = useRef(values); // newest values right away (see trip-form.js)
  const titleId = useRef('plan-item-dialog').current;

  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const errorText = (field) => (errors[field] ? t(ERROR_TEXT[field][errors[field]]) : '');

  async function save(event) {
    event.preventDefault();
    const input = latest.current;
    const found = validateItem(input);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      if (item) await updateItem(item, input);
      else await createItem(trip.id, input);
      await reloadItinerary(trip.id);
      onClose();
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  async function remove() {
    onClose();
    try {
      const id = await deleteItem(item);
      await reloadItinerary(trip.id);
      showToast({
        text: t('toast.planItemDeleted'),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await undoDeleteItem(id);
          await reloadItinerary(trip.id);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${item ? t('itinerary.editTitle') : t('itinerary.newTitle')}</h2>
      <form class="form modal-form" onSubmit=${save} noValidate>
        <div class="type-picker type-picker-4" role="radiogroup" aria-label=${t('itinerary.field.type')}>
          ${ITEM_TYPES.map((type) => {
            const { key, Icon } = ITEM_TYPE_INFO[type];
            return html`
              <button type="button" key=${type} role="radio" class="type-option"
                aria-checked=${values.type === type} onClick=${() => set('type', type)}>
                <${Icon} /><span>${t(key)}</span>
              </button>`;
          })}
        </div>
        <${Field} id="plan-title" label=${t('itinerary.field.title')} error=${errorText('title')}>
          <input id="plan-title" class="input" type="text" value=${values.title} maxLength="100"
            placeholder=${t('itinerary.field.titlePlaceholder')} autocomplete="off"
            onInput=${(event) => set('title', event.currentTarget.value)} />
        <//>
        <${Field} id="plan-date" label=${t('itinerary.field.date')} error=${errorText('date')}>
          <input id="plan-date" class="input" type="date" value=${values.date}
            onInput=${(event) => set('date', event.currentTarget.value)} />
        <//>
        <div class="field-row">
          <${Field} id="plan-start" label=${t('itinerary.field.from')} error=${errorText('startTime')}>
            <input id="plan-start" class="input" type="time" value=${values.startTime}
              onInput=${(event) => set('startTime', event.currentTarget.value)} />
          <//>
          <${Field} id="plan-end" label=${t('itinerary.field.to')} error=${errorText('endTime')}>
            <input id="plan-end" class="input" type="time" value=${values.endTime} disabled=${!values.startTime}
              onInput=${(event) => set('endTime', event.currentTarget.value)} />
          <//>
        </div>
        <${Field} id="plan-address" label=${t('itinerary.field.address')}>
          <input id="plan-address" class="input" type="text" value=${values.address} autocomplete="off"
            placeholder=${t('itinerary.field.addressPlaceholder')}
            onInput=${(event) => set('address', event.currentTarget.value)} />
        <//>
        <${Field} id="plan-note" label=${t('itinerary.field.note')}>
          <textarea id="plan-note" class="input textarea" rows="2" value=${values.note}
            onInput=${(event) => set('note', event.currentTarget.value)}></textarea>
        <//>
        <div class="modal-buttons">
          ${item && html`<button type="button" class="button button-danger-text" onClick=${remove}>${t('itinerary.delete')}</button>`}
          <button type="button" class="button" onClick=${onClose}>${t('common.cancel')}</button>
          <button type="submit" class="button button-primary">${t('common.save')}</button>
        </div>
      </form>
    <//>`;
}

// One line of the timeline. `move` (only while reordering an untimed item)
// shows ↑↓ instead of the map pin.
function Entry({ trip, entry, date, onEditItem, move = null }) {
  if (entry.kind === 'booking') {
    const { booking, role } = entry;
    const labels = timeLabels(booking.type);
    const what = [t(role === 'end' ? labels.end : labels.start), booking.provider].filter(Boolean).join(' · ');
    return html`
      <li class="plan-entry is-booking">
        <span class="plan-time">${time(date, entry.time)}</span>
        <a class="plan-main" href=${paths.booking(trip.id, booking.id)}>
          <span class="plan-icon"><${TypeIcon} type=${booking.type} /></span>
          <span class="plan-text">
            <span class="plan-title">${booking.title}</span>
            <span class="plan-sub">${what}</span>
          </span>
        </a>
      </li>`;
  }
  const { item } = entry;
  const { Icon } = ITEM_TYPE_INFO[item.type] || ITEM_TYPE_INFO.activity;
  const range = item.endTime ? `${time(date, item.startTime)}–${time(date, item.endTime)}` : time(date, item.startTime);
  return html`
    <li class="plan-entry">
      <span class="plan-time">${range}</span>
      <button type="button" class="plan-main" onClick=${() => onEditItem(item)}>
        <span class="plan-icon is-own"><${Icon} /></span>
        <span class="plan-text">
          <span class="plan-title">${item.title}</span>
          ${item.address && html`<span class="plan-sub">${item.address}</span>`}
          ${item.note && html`<span class="plan-note">${item.note}</span>`}
        </span>
      </button>
      ${move
        ? html`
          <span class="plan-move">
            <button type="button" class="plan-move-button" disabled=${!move.canUp} aria-label=${t('itinerary.moveUp', { name: item.title })}
              onClick=${() => move.onMove(item, -1)}><${ChevronUp} /></button>
            <button type="button" class="plan-move-button" disabled=${!move.canDown} aria-label=${t('itinerary.moveDown', { name: item.title })}
              onClick=${() => move.onMove(item, 1)}><${ChevronDown} /></button>
          </span>`
        : item.address && html`
          <a class="plan-map" href=${mapLink(item.address)} target="_blank" rel="noopener"
            aria-label=${t('itinerary.openMap', { name: item.title })}><${PinIcon} /></a>`}
    </li>`;
}

// The box for a day's title ("Florencija", "Poilsio diena"); empty clears it
function DayTitleDialog({ trip, day, onClose }) {
  const [title, setTitle] = useState(day.title || '');
  const titleId = useRef('day-title-dialog').current;

  async function save(event) {
    event.preventDefault();
    try {
      await setDayTitle(trip.id, day.date, title);
      await reloadItinerary(trip.id);
      onClose();
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${formatDate(day.date, 'day')}</h2>
      <form class="form modal-form" onSubmit=${save} noValidate>
        <${Field} id="day-title" label=${t('itinerary.dayTitle')} hint=${t('itinerary.dayTitleHint')}>
          <input id="day-title" class="input" type="text" value=${title} maxLength="60" autocomplete="off"
            placeholder=${t('itinerary.dayTitlePlaceholder')} onInput=${(event) => setTitle(event.currentTarget.value)} />
        <//>
        <div class="modal-buttons">
          <button type="button" class="button" onClick=${onClose}>${t('common.cancel')}</button>
          <button type="submit" class="button button-primary">${t('common.save')}</button>
        </div>
      </form>
    <//>`;
}

function DayCard({ trip, day, isToday, onAdd, onEditItem, onEditTitle, onMove }) {
  const [reordering, setReordering] = useState(false);
  // Items without a time, in their order: only these can be moved
  const untimed = day.entries.filter((entry) => entry.kind === 'item' && !entry.time).map((entry) => entry.item);
  const moveFor = (entry) => {
    if (!reordering || entry.kind !== 'item' || entry.time) return null;
    const index = untimed.findIndex((item) => item.id === entry.item.id);
    return { canUp: index > 0, canDown: index < untimed.length - 1, onMove };
  };

  return html`
    <section class=${'day-card' + (isToday ? ' is-today' : '')} id=${'day-' + day.date}>
      <header class="day-card-head">
        <div class="day-card-heading">
          <h2 class="day-card-date">${formatDate(day.date, 'day')}</h2>
          ${day.title && html`<p class="day-card-title">${day.title}</p>`}
        </div>
        <span class="day-card-number">
          ${isToday && html`<span class="badge badge-active">${t('itinerary.today')}</span>`}
          ${day.number && t('itinerary.dayN', { n: String(day.number) })}
          <button type="button" class="day-title-edit" aria-label=${t('itinerary.editDayTitle')} title=${t('itinerary.editDayTitle')}
            onClick=${() => onEditTitle(day)}><${PencilIcon} /></button>
        </span>
      </header>
      ${day.entries.length === 0
        ? html`<p class="plan-empty">${t('itinerary.emptyDay')}</p>`
        : html`<ul class="plan-list">
            ${day.entries.map((entry) => html`
              <${Entry}
                key=${entry.kind + (entry.item ? entry.item.id : entry.booking.id + entry.role)}
                trip=${trip} entry=${entry} date=${day.date} onEditItem=${onEditItem} move=${moveFor(entry)} />`)}
          </ul>`}
      <div class="day-card-actions">
        <button type="button" class="plan-add" onClick=${() => onAdd(day.date)}>
          <${PlusIcon} /><span>${t('itinerary.add')}</span>
        </button>
        ${untimed.length > 1 && html`
          <button type="button" class="plan-reorder" aria-pressed=${reordering} onClick=${() => setReordering(!reordering)}>
            ${reordering ? t('itinerary.reorderDone') : t('itinerary.reorder')}
          </button>`}
      </div>
    </section>`;
}

export function TripItinerary({ id }) {
  const trips = useStore((s) => s.trips);
  const itinerary = useStore((s) => s.itinerary);
  const bookings = useStore((s) => s.bookings);
  const [dialog, setDialog] = useState(null); // { item } or { date }
  const [titleFor, setTitleFor] = useState(null); // a day whose title is being edited
  const scrolled = useRef(false);

  useEffect(() => {
    Promise.all([reloadItinerary(id), reloadBookings(id)]).catch((error) => console.error(error));
  }, [id]);

  const trip = trips.find((item) => item.id === id);
  const loaded = itinerary.tripId === id && bookings.tripId === id;
  const today = todayIso();

  // During the trip, open on today's card
  useEffect(() => {
    if (!loaded || scrolled.current) return;
    scrolled.current = true;
    document.getElementById('day-' + today)?.scrollIntoView({ block: 'start' });
  }, [loaded]);

  if (!trip) return html`<${NotFound} />`;

  const back = html`<a class="back-link" href=${paths.trip(id)}><${ChevronLeft} /><span>${trip.name}</span></a>`;
  if (!trip.startDate) {
    return html`
      <section class="screen">
        ${back}
        <h1 class="screen-title screen-head">${t('dashboard.tiles.itinerary')}</h1>
        <${EmptyState} title=${t('itinerary.noDatesTitle')} text=${t('itinerary.noDatesText')}>
          <a class="button button-primary" href=${paths.tripEdit(id)}>${t('itinerary.setDates')}</a>
        <//>
      </section>`;
  }

  const timeline = loaded ? buildTimeline(trip, itinerary.items, bookings.items, itinerary.days) : { days: [], other: [] };

  async function move(item, direction) {
    try {
      await moveUntimed(trip.id, item, direction);
      await reloadItinerary(trip.id);
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }
  const dayProps = {
    trip,
    onAdd: (date) => setDialog({ date }),
    onEditItem: (item) => setDialog({ item }),
    onEditTitle: setTitleFor,
    onMove: move
  };

  return html`
    <section class="screen">
      ${back}
      <h1 class="screen-title screen-head">${t('dashboard.tiles.itinerary')}</h1>

      ${timeline.days.map((day) => html`
        <${DayCard} key=${day.date} day=${day} isToday=${day.date === today} ...${dayProps} />`)}

      ${timeline.other.length > 0 && html`
        <h2 class="section-title">${t('itinerary.otherDays')}</h2>
        <p class="muted other-days-hint">${t('itinerary.otherDaysHint')}</p>
        ${timeline.other.map((day) => html`
          <${DayCard} key=${day.date} day=${day} isToday=${day.date === today} ...${dayProps} />`)}`}

      ${titleFor && html`<${DayTitleDialog} trip=${trip} day=${titleFor} onClose=${() => setTitleFor(null)} />`}
      ${dialog && html`
        <${ItemDialog} trip=${trip} item=${dialog.item || null} date=${dialog.date}
          onClose=${() => setDialog(null)} />`}
    </section>`;
}
