// store.js — the app's shared state.
//
// "State" is the small set of facts the whole app shares: current language,
// current screen, the list of trips… Any file can change it with setState();
// every subscriber is told (that is the "emit"), and screens redraw.

import { useState, useEffect } from 'preact/hooks';
import { listTrips } from './modules/trips.js';
import { listDocuments } from './modules/documents.js';
import { listBookings } from './modules/bookings.js';
import { listItems } from './modules/checklist.js';
import { listItems as listPlanItems, listDays } from './modules/itinerary.js';

const state = {
  ready: false,        // true once the database and texts are loaded
  startupError: false, // true if the app could not start (e.g. no storage)
  lang: 'lt',          // current language
  route: { name: 'home', params: {} }, // current screen, set by router.js
  trips: [],           // all trips that are not deleted (archived included)
  documents: { tripId: null, items: [] }, // the open trip's documents
  bookings: { tripId: null, items: [] },  // the open trip's bookings, in time order
  checklist: { tripId: null, items: [] }, // the open trip's packing list
  itinerary: { tripId: null, items: [], days: [] }, // the open trip's plan items and day titles
  toast: null,         // short message at the bottom, see ui/toast.js
  updateReady: false   // a new app version is waiting (see pwa.js)
};

const listeners = new Set();

export function getState() {
  return state;
}

// Changes some fields and tells every subscriber.
// Always pass new values (a new array, a new object) rather than changing
// the old ones in place, so screens notice the change.
export function setState(changes) {
  Object.assign(state, changes);
  listeners.forEach((listener) => listener(state));
}

// Calls `listener(state)` after every change. Returns a function that stops it.
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// A Preact "hook": lets a component use one piece of the state and redraw
// when it changes. Example: const lang = useStore((s) => s.lang);
export function useStore(pick) {
  const [value, setValue] = useState(() => pick(state));
  useEffect(() => {
    setValue(pick(state)); // catch changes made before we subscribed
    return subscribe((current) => setValue(pick(current)));
  }, []);
  return value;
}

// ---------- loading data into the state ----------

// Reads the trips from the database again. Call after any trip change,
// and every screen showing trips redraws.
export async function reloadTrips() {
  setState({ trips: await listTrips() });
}

// Reads one trip's documents. Only the open trip's are kept in the state,
// so PDFs of other trips are never loaded.
export async function reloadDocuments(tripId) {
  setState({ documents: { tripId, items: await listDocuments(tripId) } });
}

// Reads one trip's bookings (only the open trip's are kept in the state).
export async function reloadBookings(tripId) {
  setState({ bookings: { tripId, items: await listBookings(tripId) } });
}

// Reads one trip's packing list (only the open trip's is kept in the state).
export async function reloadChecklist(tripId) {
  setState({ checklist: { tripId, items: await listItems(tripId) } });
}

// Reads one trip's plan items (only the open trip's are kept in the state).
export async function reloadItinerary(tripId) {
  const [items, days] = await Promise.all([listPlanItems(tripId), listDays(tripId)]);
  setState({ itinerary: { tripId, items, days } });
}
