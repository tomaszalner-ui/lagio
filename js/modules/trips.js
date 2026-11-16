// modules/trips.js — trip logic. Uses only db.js; no screen code and no text.
//
// A trip record (base fields are added by db.js):
//   name          'Roma su draugais' (required)
//   destinations  [{ name: 'Roma' }, { name: 'Florencija' }]  objects, so a
//                 country code or map coordinates can be added later
//   startDate     '2026-12-20' or '' (dates are optional)
//   endDate       '2026-12-27' or ''
//   coverColor    one of COVER_COLORS (a name, not a colour code)
//   currency      'EUR', …
//   archived      true / false
//   travelers     [{ id, name }] (optional) — for per-person packing lists
// A trip's own tripId is its id, so "everything of this trip" (the trip
// itself included) can be found with one tripId lookup in every store.
//
// The stage (planning / active / done) is NOT saved: it is calculated from
// the dates and today's date, so it can never go out of date.

import { STORES, newId, create, get, list, update, softDelete, restore, requestPersistentStorage } from '../db.js';

export const COVER_COLORS = ['sea', 'lagoon', 'forest', 'amber', 'sunset', 'berry', 'plum', 'slate'];
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'PLN', 'CHF', 'CZK', 'SEK', 'NOK', 'DKK', 'HUF', 'TRY', 'JPY'];
export const DEFAULT_CURRENCY = 'EUR';

// ---------- checking input ----------

// Returns problems as codes, e.g. { name: 'required', endDate: 'beforeStart' }.
// An empty object means the input is fine. The screen turns codes into text.
export function validateTrip(input) {
  const errors = {};
  if (!String(input.name || '').trim()) errors.name = 'required';
  if (input.endDate && !input.startDate) errors.startDate = 'requiredWithEnd';
  if (input.startDate && input.endDate && input.endDate < input.startDate) errors.endDate = 'beforeStart';
  return errors;
}

// Keeps only the fields a trip may have, cleaned up.
// Travelers: names trimmed, empty and repeated names dropped; each keeps its
// id (new ones get one), because packing items point to it (ownerId)
function cleanTravelers(list) {
  const seen = new Set();
  return (list || [])
    .map((person) => ({ id: person.id || newId(), name: String(person.name || '').trim() }))
    .filter((person) => {
      const key = person.name.toLocaleLowerCase();
      if (!person.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanTrip(input) {
  const seen = new Set();
  const destinations = (input.destinations || [])
    .map((place) => ({ ...place, name: String(place.name || '').trim() }))
    .filter((place) => {
      const key = place.name.toLowerCase();
      if (!place.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return {
    name: String(input.name || '').trim(),
    destinations,
    startDate: input.startDate || '',
    endDate: input.endDate || '',
    coverColor: COVER_COLORS.includes(input.coverColor) ? input.coverColor : COVER_COLORS[0],
    currency: CURRENCIES.includes(input.currency) ? input.currency : DEFAULT_CURRENCY,
    travelers: cleanTravelers(input.travelers)
  };
}

function assertValid(input) {
  const errors = validateTrip(input);
  if (Object.keys(errors).length) {
    throw new Error('Invalid trip: ' + JSON.stringify(errors));
  }
}

// ---------- saving ----------

let persistenceAsked = false;

export async function createTrip(input) {
  assertValid(input);
  const id = newId();
  const trip = await create('trips', { ...cleanTrip(input), id, tripId: id, archived: false });
  // First saved trip: ask the browser to keep our data (see db.js)
  if (!persistenceAsked) {
    persistenceAsked = true;
    requestPersistentStorage();
  }
  return trip;
}

export async function updateTrip(id, changes) {
  const existing = await get('trips', id);
  if (!existing) throw new Error('Trip not found: ' + id);
  const merged = { ...existing, ...changes };
  assertValid(merged);
  const saved = await update('trips', id, cleanTrip(merged));
  // A traveler was removed: their packing items become shared, nothing is lost
  const kept = new Set(saved.travelers.map((person) => person.id));
  for (const item of await list('checklistItems', { tripId: id })) {
    if (item.ownerId && !kept.has(item.ownerId)) await update('checklistItems', item.id, { ownerId: null });
  }
  return saved;
}

// Fills in fields that a trip saved by an older version may not have,
// so screens can always rely on them.
function withDefaults(trip) {
  return {
    destinations: [],
    startDate: '',
    endDate: '',
    coverColor: COVER_COLORS[0],
    currency: DEFAULT_CURRENCY,
    archived: false,
    travelers: [],
    ...trip
  };
}

export async function getTrip(id) {
  const trip = await get('trips', id);
  return trip && withDefaults(trip);
}

// All trips that are not deleted, archived ones included.
export async function listTrips() {
  return (await list('trips')).map(withDefaults);
}

// A copy with the same details, but without dates: a copy is usually the
// start of a new trip, so the old dates would be wrong. `name` comes from the
// screen, because this file has no text. The packing list is copied with
// nothing ticked; bookings and documents are not copied (they belong to the
// old trip).
export async function duplicateTrip(id, { name }) {
  const trip = await get('trips', id);
  if (!trip) throw new Error('Trip not found: ' + id);
  const copy = await createTrip({ ...cleanTrip(trip), name, startDate: '', endDate: '' });
  for (const item of await list('checklistItems', { tripId: id })) {
    const { listName, category, text, quantity, order, ownerId } = item;
    await create('checklistItems', {
      tripId: copy.id, listName, category, text, quantity: quantity || null, order, ownerId: ownerId || null, done: false
    });
  }
  return copy;
}

export function archiveTrip(id) {
  return update('trips', id, { archived: true });
}

export function unarchiveTrip(id) {
  return update('trips', id, { archived: false });
}

// Soft-deletes the trip and every record that belongs to it, in every store.
// Returns a list of what was deleted; pass it to undoDeleteTrip() to undo.
export async function deleteTrip(id) {
  const deleted = [];
  for (const store of STORES) {
    if (store === 'settings') continue;
    for (const record of await list(store, { tripId: id })) {
      await softDelete(store, record.id);
      deleted.push({ store, id: record.id });
    }
  }
  // Trips saved before tripId = id (milestone 1 tests) are found by id
  if (!deleted.some((item) => item.store === 'trips' && item.id === id)) {
    await softDelete('trips', id);
    deleted.push({ store: 'trips', id });
  }
  return deleted;
}

export async function undoDeleteTrip(deleted) {
  for (const { store, id } of deleted) {
    await restore(store, id);
  }
}

// ---------- dates and stages ----------

// Today as '2026-11-16', in this phone's local time.
export function todayIso(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Whole days from date a to date b (both '2026-11-16'). Uses UTC so that
// summer-time changes can never make a day 23 or 25 hours long.
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// Where the trip is today:
//   { stage: 'undated' }                          no dates yet
//   { stage: 'planning', daysUntil: 12 }          before the start
//   { stage: 'active', day: 3, totalDays: 7 }     during (totalDays null if no end date)
//   { stage: 'done', daysSince: 4 }               after the end
export function getTripStage(trip, today = todayIso()) {
  const { startDate, endDate } = trip;
  if (!startDate) return { stage: 'undated' };
  if (today < startDate) return { stage: 'planning', daysUntil: daysBetween(today, startDate) };
  if (!endDate || today <= endDate) {
    return {
      stage: 'active',
      day: daysBetween(startDate, today) + 1,
      totalDays: endDate ? daysBetween(startDate, endDate) + 1 : null
    };
  }
  return { stage: 'done', daysSince: daysBetween(endDate, today) };
}

// Splits trips into the Home screen's groups, each in a sensible order:
//   current: trips happening now (first), then upcoming ones, soonest first
//   undated: trips without dates, newest first
//   past:    finished trips, most recent first
export function groupTrips(trips, today = todayIso()) {
  const current = [];
  const undated = [];
  const past = [];
  for (const trip of trips) {
    const { stage } = getTripStage(trip, today);
    if (stage === 'undated') undated.push(trip);
    else if (stage === 'done') past.push(trip);
    else current.push(trip);
  }
  current.sort((a, b) => a.startDate.localeCompare(b.startDate));
  undated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  past.sort((a, b) => (b.endDate || b.startDate).localeCompare(a.endDate || a.startDate));
  return { current, undated, past };
}
