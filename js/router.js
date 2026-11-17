// router.js — decides which screen to show from the address bar.
//
// We use "hash routes": the part after # (for example #/trip/abc).
// Changing it does not reload the page, works offline and needs no server
// setup, which is why it suits GitHub Pages. The phone's Back button works too.

import { setState } from './store.js';

// Each route: a name and a pattern. The ([^/]+) parts become params.
// Order matters: '/trip/new' must come before '/trip/:id'.
const ROUTES = [
  { name: 'home', pattern: /^\/$/, keys: [] },
  { name: 'archive', pattern: /^\/archive\/?$/, keys: [] },
  { name: 'tripNew', pattern: /^\/trip\/new\/?$/, keys: [] },
  { name: 'tripEdit', pattern: /^\/trip\/([^/]+)\/edit\/?$/, keys: ['id'] },
  { name: 'tripItinerary', pattern: /^\/trip\/([^/]+)\/itinerary\/?$/, keys: ['id'] },
  { name: 'tripPacking', pattern: /^\/trip\/([^/]+)\/packing\/?$/, keys: ['id'] },
  { name: 'tripBookings', pattern: /^\/trip\/([^/]+)\/bookings\/?$/, keys: ['id'] },
  { name: 'bookingNew', pattern: /^\/trip\/([^/]+)\/bookings\/new\/?$/, keys: ['id'] },
  { name: 'bookingEdit', pattern: /^\/trip\/([^/]+)\/bookings\/([^/]+)\/edit\/?$/, keys: ['id', 'bookingId'] },
  { name: 'booking', pattern: /^\/trip\/([^/]+)\/bookings\/([^/]+)\/?$/, keys: ['id', 'bookingId'] },
  { name: 'trip', pattern: /^\/trip\/([^/]+)\/?$/, keys: ['id'] }
];

// '#/trip/abc' -> { name: 'trip', params: { id: 'abc' } }
// Unknown addresses fall back to the home screen.
export function parseHash(hash) {
  const path = hash.replace(/^#/, '') || '/';
  for (const route of ROUTES) {
    const match = path.match(route.pattern);
    if (match) {
      const params = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });
      return { name: route.name, params };
    }
  }
  return { name: 'home', params: {} };
}

// Links for use in href="…"
export const paths = {
  home: () => '#/',
  archive: () => '#/archive',
  tripNew: () => '#/trip/new',
  trip: (id) => '#/trip/' + encodeURIComponent(id),
  tripEdit: (id) => '#/trip/' + encodeURIComponent(id) + '/edit',
  tripBookings: (id) => '#/trip/' + encodeURIComponent(id) + '/bookings',
  tripPacking: (id) => '#/trip/' + encodeURIComponent(id) + '/packing',
  tripItinerary: (id) => '#/trip/' + encodeURIComponent(id) + '/itinerary',
  bookingNew: (id) => paths.tripBookings(id) + '/new',
  booking: (id, bookingId) => paths.tripBookings(id) + '/' + encodeURIComponent(bookingId),
  bookingEdit: (id, bookingId) => paths.booking(id, bookingId) + '/edit'
};

// Go to a screen from code, e.g. navigate(paths.trip(id)).
// { replace: true } swaps the current page in the history instead of adding
// one, so Back skips it (used after saving a form).
export function navigate(hash, { replace = false } = {}) {
  if (replace) location.replace(location.pathname + location.search + hash);
  else location.hash = hash;
}

// Starts listening to address changes and sets the first route.
export function startRouter() {
  const update = () => {
    setState({ route: parseHash(location.hash) });
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', update);
  update();
}
