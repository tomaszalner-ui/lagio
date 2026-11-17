// modules/itinerary.js — the trip's day-by-day plan.
// Uses only db.js; no screen code and no text.
//
// A plan item (base fields are added by db.js), in the 'itineraryItems' store:
//   date       '2026-12-20' — the day it belongs to (stored on the item, so
//              items stay on their real date if the trip's dates change)
//   type       one of ITEM_TYPES
//   title      'Koliziejus' (required)
//   startTime  '10:00' or ''   endTime '12:30' or ''
//   address    'Piazza del Colosseo, Roma'
//   note       free text
//   order      position among the day's items without a time (step 6b)
// Bookings are not copied into the plan: they appear on their days
// automatically (see buildTimeline).

import { create, list, update, softDelete, restore } from '../db.js';
import { splitDateTime } from './bookings.js';

export const ITEM_TYPES = ['activity', 'food', 'transport', 'note'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const MAX_DAYS = 90; // a longer trip still works; the plan shows the first 90 days

// Problems as codes, e.g. { title: 'required', endTime: 'beforeStart' }
export function validateItem(input) {
  const errors = {};
  if (!String(input.title || '').trim()) errors.title = 'required';
  if (!ISO_DATE.test(input.date || '')) errors.date = 'required';
  if (input.startTime && !TIME.test(input.startTime)) errors.startTime = 'invalid';
  if (input.endTime && !input.startTime) errors.startTime = 'requiredWithEnd';
  // An end earlier than the start is fine: it means the next day (23:00–00:30)
  return errors;
}

// True when a plan item ends after midnight (end time earlier than the start)
export function endsNextDay(item) {
  return Boolean(item.startTime && item.endTime && item.endTime < item.startTime);
}

function cleanItem(input) {
  const text = (value) => String(value || '').trim();
  return {
    date: input.date,
    type: ITEM_TYPES.includes(input.type) ? input.type : 'activity',
    title: text(input.title),
    startTime: input.startTime || '',
    endTime: input.startTime ? input.endTime || '' : '',
    address: text(input.address),
    note: text(input.note)
  };
}

function assertValid(input) {
  const errors = validateItem(input);
  if (Object.keys(errors).length) throw new Error('Invalid plan item: ' + JSON.stringify(errors));
}

export function listItems(tripId) {
  return list('itineraryItems', { tripId });
}

export async function createItem(tripId, input) {
  assertValid(input);
  const sameDay = (await listItems(tripId)).filter((item) => item.date === input.date);
  const order = sameDay.reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
  return create('itineraryItems', { ...cleanItem(input), tripId, order });
}

export async function updateItem(item, changes) {
  const merged = { ...item, ...changes };
  assertValid(merged);
  return update('itineraryItems', item.id, cleanItem(merged));
}

export async function deleteItem(item) {
  await softDelete('itineraryItems', item.id);
  return item.id;
}

export function undoDeleteItem(id) {
  return restore('itineraryItems', id);
}

// ---------- day titles ('days' store: { date, title }) ----------

export function listDays(tripId) {
  return list('days', { tripId });
}

// Sets (or clears, with '') the title of one day, e.g. 'Florencija'
export async function setDayTitle(tripId, date, title) {
  const clean = String(title || '').trim();
  const existing = (await listDays(tripId)).find((day) => day.date === date);
  if (existing) return update('days', existing.id, { title: clean });
  if (!clean) return null;
  return create('days', { tripId, date, title: clean, order: 0 });
}

// ---------- order of items without a time ----------

// Moves an untimed item one place up (-1) or down (+1) among the day's
// untimed items. Orders are renumbered 1, 2, 3… so they stay tidy.
export async function moveUntimed(tripId, item, direction) {
  const untimed = (await listItems(tripId))
    .filter((other) => other.date === item.date && !other.startTime)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt.localeCompare(b.createdAt));
  const from = untimed.findIndex((other) => other.id === item.id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= untimed.length) return;
  [untimed[from], untimed[to]] = [untimed[to], untimed[from]];
  for (let i = 0; i < untimed.length; i += 1) {
    if (untimed[i].order !== i + 1) await update('itineraryItems', untimed[i].id, { order: i + 1 });
  }
}

// ---------- days and the timeline ----------

// All dates of the trip: ['2026-12-20', '2026-12-21', …]; [] without dates.
// Only a start date: just that day.
export function tripDates(trip) {
  if (!trip.startDate) return [];
  const end = trip.endDate && trip.endDate >= trip.startDate ? trip.endDate : trip.startDate;
  const dates = [];
  const [y, m, d] = trip.startDate.split('-').map(Number);
  for (let i = 0; i < MAX_DAYS; i += 1) {
    const day = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    if (day > end) break;
    dates.push(day);
  }
  return dates;
}

// Which bookings show a second entry on their end day
const SHOWS_END = ['flight', 'train', 'bus', 'ferry', 'car', 'stay'];

// One day's entries, sorted: entries with a time first (by time), then the
// rest (bookings, then items in their order).
//   { kind: 'booking', booking, role: 'start' | 'end', time }
//   { kind: 'item', item, time }
function entriesFor(date, items, bookings) {
  const entries = [];
  for (const booking of bookings) {
    const [startDate, startTime] = splitDateTime(booking.startAt);
    const [endDate, endTime] = splitDateTime(booking.endAt);
    if (startDate === date) entries.push({ kind: 'booking', booking, role: 'start', time: startTime });
    if (endDate && endDate !== startDate && endDate === date && SHOWS_END.includes(booking.type)) {
      entries.push({ kind: 'booking', booking, role: 'end', time: endTime });
    }
  }
  for (const item of items) {
    if (item.date === date) entries.push({ kind: 'item', item, time: item.startTime });
  }
  const rank = (entry) => (entry.kind === 'booking' ? 0 : 1);
  return entries.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time) || rank(a) - rank(b);
    if (a.time) return -1;
    if (b.time) return 1;
    return rank(a) - rank(b) || ((a.item && a.item.order) || 0) - ((b.item && b.item.order) || 0);
  });
}

// When an entry is over on its day: a time, 'later' (goes on past midnight)
// or null (no end of its own: it lasts until the next entry starts)
function entryEnd(entry, date) {
  if (entry.kind === 'item') {
    if (!entry.item.endTime) return null;
    return endsNextDay(entry.item) ? 'later' : entry.item.endTime;
  }
  if (entry.role === 'end') return null; // arrival, check-out: a moment
  const [endDate, endTime] = splitDateTime(entry.booking.endAt);
  if (endDate === date && endTime) return endTime; // e.g. a concert 19:00–22:00
  if (endDate > date && !SHOWS_END.includes(entry.booking.type)) return 'later';
  return null; // departure, check-in: a moment
}

// Today's progress for the "Šiandien" card. now = the time now ('14:05').
// Returns one status per entry: 'ended', 'next' (the first entry still to
// start) or '' (going on now, or without a time).
export function dayProgress(entries, date, now) {
  const timed = entries.filter((entry) => entry.time);
  const statuses = new Map();
  timed.forEach((entry, index) => {
    let end = entryEnd(entry, date);
    if (end === null) end = (timed.slice(index + 1).find((other) => other.time > entry.time) || {}).time || 'later';
    if (end !== 'later' && end <= now) statuses.set(entry, 'ended');
  });
  const next = timed.find((entry) => entry.time > now);
  if (next) statuses.set(next, 'next');
  return entries.map((entry) => statuses.get(entry) || '');
}

// The whole plan:
//   days:  [{ date, number (1, 2, …), title, entries }] for each trip date
//   other: [{ date, entries }] for dates outside the trip that still have
//          items or bookings (e.g. after the trip's dates were changed)
export function buildTimeline(trip, items, bookings, dayRecords = []) {
  const titles = new Map(dayRecords.filter((day) => day.title).map((day) => [day.date, day.title]));
  const dates = tripDates(trip);
  const days = dates.map((date, index) => ({
    date, number: index + 1, title: titles.get(date) || '', entries: entriesFor(date, items, bookings)
  }));
  const inTrip = new Set(dates);
  const outside = new Set();
  for (const item of items) if (!inTrip.has(item.date)) outside.add(item.date);
  for (const booking of bookings) {
    const [startDate] = splitDateTime(booking.startAt);
    const [endDate] = splitDateTime(booking.endAt);
    if (startDate && !inTrip.has(startDate)) outside.add(startDate);
    // e.g. a hotel's check-out after the trip's dates were shortened
    if (endDate && endDate !== startDate && SHOWS_END.includes(booking.type) && !inTrip.has(endDate)) outside.add(endDate);
  }
  const other = [...outside].sort().map((date) => ({ date, title: titles.get(date) || '', entries: entriesFor(date, items, bookings) }));
  return { days, other };
}
