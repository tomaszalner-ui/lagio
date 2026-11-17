// shell.js — the frame around every screen: top bar, current screen,
// and the bottom messages (toast, update banner). Picks the screen from the
// route (see router.js).
//
// A "component" is a function that returns a piece of screen. Preact calls it
// again whenever the data it uses changes, and updates only what is different.

import { html } from './html.js';
import { useStore } from '../store.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { LangSwitch } from './lang-switch.js';
import { UpdateBanner } from './update-banner.js';
import { Toast } from './toast.js';
import { EmptyState } from './empty-state.js';
import { Home } from './home.js';
import { Archive } from './archive.js';
import { TripForm } from './trip-form.js';
import { TripDashboard } from './trip-dashboard.js';
import { TripBookings } from './trip-bookings.js';
import { TripPacking } from './trip-packing.js';
import { TripItinerary } from './trip-itinerary.js';
import { TripSpending } from './trip-spending.js';
import { BookingForm } from './booking-form.js';
import { BookingDetail } from './booking-detail.js';

// Shown if the app cannot start, e.g. the browser blocks storage
function StartupError() {
  return html`
    <section class="screen">
      <${EmptyState} title=${t('error.startupTitle')} text=${t('error.startupText')}>
        <button type="button" class="button button-primary" onClick=${() => location.reload()}>
          ${t('error.retry')}
        </button>
      <//>
    </section>`;
}

// Route name -> screen
function Screen({ route }) {
  switch (route.name) {
    case 'archive': return html`<${Archive} />`;
    case 'tripNew': return html`<${TripForm} />`;
    // key: a different trip gets a fresh form instead of reusing the old one
    case 'tripEdit': return html`<${TripForm} id=${route.params.id} key=${'edit-' + route.params.id} />`;
    case 'trip': return html`<${TripDashboard} id=${route.params.id} key=${'trip-' + route.params.id} />`;
    case 'tripSpending': return html`<${TripSpending} id=${route.params.id} key=${'spend-' + route.params.id} />`;
    case 'tripItinerary': return html`<${TripItinerary} id=${route.params.id} key=${'plan-' + route.params.id} />`;
    case 'tripPacking': return html`<${TripPacking} id=${route.params.id} key=${'packing-' + route.params.id} />`;
    case 'tripBookings': return html`<${TripBookings} id=${route.params.id} key=${'bookings-' + route.params.id} />`;
    case 'bookingNew': return html`<${BookingForm} tripId=${route.params.id} key=${'booking-new-' + route.params.id} />`;
    case 'bookingEdit': return html`<${BookingForm} tripId=${route.params.id} bookingId=${route.params.bookingId} key=${'booking-edit-' + route.params.bookingId} />`;
    case 'booking': return html`<${BookingDetail} tripId=${route.params.id} bookingId=${route.params.bookingId} key=${'booking-' + route.params.bookingId} />`;
    default: return html`<${Home} />`;
  }
}

export function Shell() {
  // Using `lang` here means the whole app redraws when the language changes
  useStore((s) => s.lang);
  const route = useStore((s) => s.route);
  const startupError = useStore((s) => s.startupError);

  return html`
    <header class="topbar">
      <a class="brand" href=${paths.home()}>${t('app.name')}</a>
      <${LangSwitch} />
    </header>
    <main class="main">
      ${startupError ? html`<${StartupError} />` : html`<${Screen} route=${route} />`}
    </main>
    <div class="bottom-stack">
      <${Toast} />
      <${UpdateBanner} />
    </div>`;
}
