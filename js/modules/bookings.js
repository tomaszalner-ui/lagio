// modules/bookings.js — a trip's bookings (flights, trains, stays…).
// Uses only db.js; no screen code and no text.
//
// A booking record (base fields are added by db.js):
//   type              one of BOOKING_TYPES
//   title             'Vilnius → Roma' (required)
//   provider          'Ryanair'
//   confirmationCode  'ABC123'
//   startAt, endAt    '2026-12-20T06:10', or only a date '2026-12-20', or ''
//                     (local time of the place, like every date in Lagio)
//   address           'Via Roma 1, Roma'
//   price             whole cents (4999 = 49,99), or null when unknown
//   currency          'EUR', …
//   note              free text
// Documents point to their booking with `bookingId` (see documents.js).

import { create, get, list, update, softDelete, restore } from '../db.js';

export const BOOKING_TYPES = ['flight', 'train', 'bus', 'ferry', 'car', 'stay', 'event', 'other'];

// Which pair of labels the start and end use ("Departure / Arrival"…)
export function timeLabelKind(type) {
  if (['flight', 'train', 'bus', 'ferry'].includes(type)) return 'travel';
  if (type === 'stay') return 'stay';
  if (type === 'car') return 'car';
  return 'other';
}

// '2026-12-20' + '06:10' -> '2026-12-20T06:10'; no date -> ''
export function joinDateTime(date, time) {
  if (!date) return '';
  return time ? `${date}T${time}` : date;
}

// '2026-12-20T06:10' -> ['2026-12-20', '06:10']
export function splitDateTime(value) {
  const [date = '', time = ''] = String(value || '').split('T');
  return [date, time];
}

// For comparing: a start without a time counts from 00:00, an end without a
// time lasts until 23:59, so "20 Dec 10:00 → 20 Dec" is fine.
function startKey(value) {
  return value.includes('T') ? value : value + 'T00:00';
}
function endKey(value) {
  return value.includes('T') ? value : value + 'T23:59';
}

// '2026-12-20T06:10' -> minutes, for differences only (no time zones involved)
function toMinutes(key) {
  const [date, time] = key.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
}

// Minutes from start to end; negative when the end is earlier.
function endMinusStart(input) {
  return toMinutes(endKey(input.endAt)) - toMinutes(startKey(input.startAt));
}

// Times are local, so on a flight, train, bus or ferry the arrival can be
// "earlier" than the departure when crossing time zones (Tokyo 21:00 →
// Honolulu 09:00 the same day). The largest time-zone difference on Earth is
// 26 hours, so anything earlier than that is a typo.
const TRAVEL_EARLIER_LIMIT_MINUTES = 26 * 60;

// Problems as codes, e.g. { title: 'required', endAt: 'beforeStart' }.
// price must be null (unknown) or whole cents; NaN means "could not read it".
export function validateBooking(input) {
  const errors = {};
  if (!String(input.title || '').trim()) errors.title = 'required';
  if (input.endAt && !input.startAt) errors.startAt = 'requiredWithEnd';
  if (input.startAt && input.endAt) {
    const difference = endMinusStart(input);
    const travel = timeLabelKind(input.type) === 'travel';
    if (difference < 0 && (!travel || -difference > TRAVEL_EARLIER_LIMIT_MINUTES)) {
      errors.endAt = 'beforeStart';
    }
  }
  const price = input.price;
  if (price !== null && price !== undefined && !(Number.isInteger(price) && price >= 0)) errors.price = 'invalid';
  return errors;
}

// Things worth pointing out that do not stop saving, as codes:
// { endAt: 'arrivalBeforeDeparture' } for travel across time zones.
export function bookingNotices(input) {
  const notices = {};
  if (input.startAt && input.endAt && timeLabelKind(input.type) === 'travel') {
    const difference = endMinusStart(input);
    if (difference < 0 && -difference <= TRAVEL_EARLIER_LIMIT_MINUTES) {
      notices.endAt = 'arrivalBeforeDeparture';
    }
  }
  return notices;
}

function cleanBooking(input) {
  const text = (value) => String(value || '').trim();
  return {
    type: BOOKING_TYPES.includes(input.type) ? input.type : 'other',
    title: text(input.title),
    provider: text(input.provider),
    confirmationCode: text(input.confirmationCode),
    startAt: input.startAt || '',
    endAt: input.endAt || '',
    address: text(input.address),
    price: Number.isInteger(input.price) ? input.price : null,
    currency: input.currency || 'EUR',
    note: text(input.note)
  };
}

function assertValid(input) {
  const errors = validateBooking(input);
  if (Object.keys(errors).length) throw new Error('Invalid booking: ' + JSON.stringify(errors));
}

export async function createBooking(tripId, input) {
  assertValid(input);
  return create('bookings', { ...cleanBooking(input), tripId });
}

export async function updateBooking(id, changes) {
  const existing = await get('bookings', id);
  if (!existing) throw new Error('Booking not found: ' + id);
  const merged = { ...existing, ...changes };
  assertValid(merged);
  return update('bookings', id, cleanBooking(merged));
}

export function getBooking(id) {
  return get('bookings', id);
}

// A trip's bookings in time order. Without a date: last, newest first.
export async function listBookings(tripId) {
  const bookings = await list('bookings', { tripId });
  return bookings.sort((a, b) => {
    if (!a.startAt || !b.startAt) {
      if (a.startAt) return -1;
      if (b.startAt) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    }
    return startKey(a.startAt).localeCompare(startKey(b.startAt)) || a.createdAt.localeCompare(b.createdAt);
  });
}

// Bookings (already sorted) grouped by their start day:
// [{ date: '2026-12-20', bookings: [...] }, …, { date: '', bookings: [...] }]
// The group with date '' holds bookings without a date.
export function groupByDay(bookings) {
  const groups = [];
  for (const booking of bookings) {
    const [date] = splitDateTime(booking.startAt);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.bookings.push(booking);
    else groups.push({ date, bookings: [booking] });
  }
  return groups;
}

// Soft-deletes the booking and every document attached to it (with their
// files). Returns what to pass to undoDeleteBooking().
export async function deleteBooking(booking) {
  const deleted = [];
  await softDelete('bookings', booking.id);
  deleted.push({ store: 'bookings', id: booking.id });
  const docs = (await list('documents', { tripId: booking.tripId }))
    .filter((doc) => doc.bookingId === booking.id);
  for (const doc of docs) {
    await softDelete('documents', doc.id);
    await softDelete('files', doc.fileId);
    deleted.push({ store: 'documents', id: doc.id }, { store: 'files', id: doc.fileId });
  }
  return deleted;
}

export async function undoDeleteBooking(deleted) {
  for (const { store, id } of deleted) {
    await restore(store, id);
  }
}
