// store.js — the app's shared state.
//
// "State" is the small set of facts the whole app shares: current language,
// current screen, the list of trips… Any file can change it with setState();
// every subscriber is told (that is the "emit"), and screens redraw.

import { useState, useEffect } from 'preact/hooks';

const state = {
  ready: false,        // true once the database and texts are loaded
  startupError: false, // true if the app could not start (e.g. no storage)
  lang: 'lt',          // current language
  route: { name: 'home', params: {} }, // current screen, set by router.js
  trips: [],           // trips shown on the home screen
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
