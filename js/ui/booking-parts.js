// booking-parts.js — small pieces shared by the booking screens:
// type names and icons, the start/end labels per type, and the booking card.

import { html } from './html.js';
import { t, formatTime, formatDateTime } from '../i18n.js';
import { paths } from '../router.js';
import { timeLabelKind, splitDateTime } from '../modules/bookings.js';
import {
  PlaneIcon, TrainIcon, BusIcon, FerryIcon, CarIcon, BedIcon, TicketIcon, StarIcon
} from './illustrations.js';

// Text key and icon for each booking type
export const TYPE_INFO = {
  flight: { key: 'bookings.type.flight', Icon: PlaneIcon },
  train: { key: 'bookings.type.train', Icon: TrainIcon },
  bus: { key: 'bookings.type.bus', Icon: BusIcon },
  ferry: { key: 'bookings.type.ferry', Icon: FerryIcon },
  car: { key: 'bookings.type.car', Icon: CarIcon },
  stay: { key: 'bookings.type.stay', Icon: BedIcon },
  event: { key: 'bookings.type.event', Icon: TicketIcon },
  other: { key: 'bookings.type.other', Icon: StarIcon }
};

// Start and end labels: "Išvykimas / Atvykimas", "Įsiregistravimas / Išsiregistravimas"…
const TIME_LABELS = {
  travel: { start: 'bookings.time.departure', end: 'bookings.time.arrival' },
  stay: { start: 'bookings.time.checkIn', end: 'bookings.time.checkOut' },
  car: { start: 'bookings.time.pickUp', end: 'bookings.time.dropOff' },
  other: { start: 'bookings.time.start', end: 'bookings.time.end' }
};

export function timeLabels(type) {
  return TIME_LABELS[timeLabelKind(type)];
}

export function TypeIcon({ type }) {
  const { Icon } = TYPE_INFO[type] || TYPE_INFO.other;
  return html`<${Icon} />`;
}

// The time line of a card:
//   same day      "06:10–08:25" or "06:10"
//   later day     "15:00 → gruodžio 27 d. 11:00", or "iki gruodžio 27 d."
export function timeSummary(booking) {
  const [startDate, startTime] = splitDateTime(booking.startAt);
  const [endDate, endTime] = splitDateTime(booking.endAt);
  if (!startDate) return '';
  const start = startTime ? formatTime(booking.startAt) : '';
  if (!endDate) return start;
  if (endDate === startDate) {
    return start && endTime ? `${start}–${formatTime(booking.endAt)}` : start;
  }
  return start
    ? t('bookings.toLaterDay', { start, end: formatDateTime(booking.endAt) })
    : t('bookings.untilDay', { end: formatDateTime(booking.endAt) });
}

export function BookingCard({ tripId, booking }) {
  const time = timeSummary(booking);
  const meta = [booking.provider, booking.confirmationCode].filter(Boolean).join(' · ');
  return html`
    <a class="booking-card" href=${paths.booking(tripId, booking.id)}>
      <span class="booking-icon"><${TypeIcon} type=${booking.type} /></span>
      <span class="booking-body">
        <span class="booking-title">${booking.title}</span>
        ${time && html`<span class="booking-time">${time}</span>`}
        ${meta && html`<span class="booking-meta">${meta}</span>`}
      </span>
    </a>`;
}
