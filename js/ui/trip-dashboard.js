// trip-dashboard.js — one trip's main screen (#/trip/:id).
// Top: coloured header with name, places and dates, and a ⋯ menu.
// Then a stage card that changes with the trip's stage (calculated from the
// dates), and tiles for the parts of the trip that later milestones fill in.

import { useEffect, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadChecklist, reloadItinerary, reloadBookings, reloadDocuments } from '../store.js';
import { t, formatDateRange, formatTimestamp } from '../i18n.js';
import { backupStatus, dismissBackupReminder } from '../transfer.js';
import { navigate, paths } from '../router.js';
import { getTripStage } from '../modules/trips.js';
import { progress } from '../modules/checklist.js';
import {
  ChevronLeft, MoreIcon, TicketIcon, CalendarIcon, ChecklistIcon, WalletIcon, NoteIcon, ShieldIcon, CloseIcon
} from './illustrations.js';
import { ActionSheet, ConfirmDialog } from './dialog.js';
import { NotFound } from './not-found.js';
import { archiveWithUndo, restoreFromArchive, duplicate, deleteWithUndo } from './trip-actions.js';
import { ExportDialog } from './export-dialog.js';
import { TodayCard } from './today-card.js';

// The parts of a trip, in the order shown. A tile with `path` opens its
// screen; the others are marked "coming soon" until their milestone.
const TILES = [
  { key: 'dashboard.tiles.bookings', Icon: TicketIcon, path: paths.tripBookings },
  { key: 'dashboard.tiles.itinerary', Icon: CalendarIcon, path: paths.tripItinerary },
  { key: 'dashboard.tiles.packing', Icon: ChecklistIcon, path: paths.tripPacking, packing: true },
  { key: 'dashboard.tiles.spending', Icon: WalletIcon },
  { key: 'dashboard.tiles.notes', Icon: NoteIcon }
];

// The card under the header: what matters at this stage of the trip
function StageCard({ trip }) {
  const info = getTripStage(trip);

  if (info.stage === 'planning') {
    if (info.daysUntil === 1) {
      return html`<div class="stage-card"><p class="stage-big">${t('dashboard.startsTomorrow')}</p></div>`;
    }
    return html`
      <div class="stage-card">
        <p class="stage-label">${t('dashboard.countdownLabel')}</p>
        <p class="stage-big">${t('dashboard.days', { count: info.daysUntil })}</p>
      </div>`;
  }

  if (info.stage === 'active') {
    return html`
      <div class="stage-card is-active">
        <p class="stage-label">${t('dashboard.activeLabel')}</p>
        <p class="stage-big">
          ${info.totalDays
            ? t('dashboard.dayOf', { day: info.day, total: info.totalDays })
            : t('dashboard.dayN', { day: info.day })}
        </p>
      </div>`;
  }

  if (info.stage === 'done') {
    return html`
      <div class="stage-card">
        <p class="stage-big">${t('dashboard.doneLabel')}</p>
        <p class="stage-text">${t('dashboard.doneText')}</p>
      </div>`;
  }

  return html`
    <div class="stage-card">
      <p class="stage-big">${t('dashboard.undatedLabel')}</p>
      <a class="button button-small" href=${paths.tripEdit(trip.id)}>${t('dashboard.addDates')}</a>
    </div>`;
}

// A slim one-line reminder to export the trip. Shown only when something
// changed since the last backup; ✕ hides it until the next change.
function BackupReminder({ lastExport, onExport, onDismiss }) {
  return html`
    <div class="backup-strip" role="status">
      <${ShieldIcon} />
      <p class="backup-text">
        ${lastExport
          ? t('backup.changed', { date: formatTimestamp(lastExport) })
          : t('backup.never')}
      </p>
      <button type="button" class="button button-small" onClick=${onExport}>${t('backup.export')}</button>
      <button type="button" class="backup-close" aria-label=${t('backup.later')} title=${t('backup.later')} onClick=${onDismiss}>
        <${CloseIcon} />
      </button>
    </div>`;
}

export function TripDashboard({ id }) {
  const trips = useStore((s) => s.trips);
  const checklist = useStore((s) => s.checklist);
  const itinerary = useStore((s) => s.itinerary);
  const bookings = useStore((s) => s.bookings);
  const documents = useStore((s) => s.documents);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backup, setBackup] = useState(null); // see transfer.backupStatus()

  // Check whether a backup reminder is due (again after each export)
  useEffect(() => {
    if (exporting) return;
    backupStatus(id).then(setBackup).catch((error) => console.error(error));
  }, [id, exporting]);

  // The packing list's progress for its tile; today's plan during the trip
  useEffect(() => {
    Promise.all([reloadChecklist(id), reloadItinerary(id), reloadBookings(id), reloadDocuments(id)])
      .catch((error) => console.error(error));
  }, [id]);

  const trip = trips.find((item) => item.id === id);
  if (!trip) return html`<${NotFound} />`;

  const places = trip.destinations.map((place) => place.name).join(', ');
  const packingItems = checklist.tripId === trip.id ? checklist.items : [];
  const { done: packingDone, total: packingTotal } = progress(packingItems);
  const dates = formatDateRange(trip.startDate, trip.endDate);

  const actions = [
    { label: t('dashboard.edit'), onClick: () => navigate(paths.tripEdit(trip.id)) },
    { label: t('dashboard.export'), onClick: () => setExporting(true) },
    { label: t('dashboard.duplicate'), onClick: () => duplicate(trip) },
    trip.archived
      ? { label: t('dashboard.unarchive'), onClick: () => restoreFromArchive(trip) }
      : { label: t('dashboard.archive'), onClick: () => archiveWithUndo(trip) },
    { label: t('dashboard.delete'), danger: true, onClick: () => setConfirmingDelete(true) }
  ];

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.home()}>
        <${ChevronLeft} /><span>${t('home.title')}</span>
      </a>

      <header class=${'trip-header cover-' + trip.coverColor}>
        <div class="trip-header-text">
          <h1 class="trip-header-name">${trip.name}</h1>
          ${places && html`<p class="trip-header-places">${places}</p>`}
          ${dates && html`<p class="trip-header-dates">${dates}</p>`}
        </div>
        <button
          type="button"
          class="icon-button"
          aria-label=${t('dashboard.menu')}
          aria-haspopup="dialog"
          onClick=${() => setMenuOpen(true)}
        ><${MoreIcon} /></button>
      </header>

      ${trip.archived && html`<p class="notice">${t('dashboard.archivedNote')}</p>`}

      <${StageCard} trip=${trip} />

      ${getTripStage(trip).stage === 'active' && itinerary.tripId === trip.id && bookings.tripId === trip.id && documents.tripId === trip.id && html`
        <${TodayCard} trip=${trip} items=${itinerary.items} days=${itinerary.days}
          bookings=${bookings.items} documents=${documents.items} />`}

      ${backup && backup.needed && !trip.archived && getTripStage(trip).stage !== 'done' && html`
        <${BackupReminder}
          lastExport=${backup.lastExport}
          onExport=${() => setExporting(true)}
          onDismiss=${() => {
            setBackup(null);
            dismissBackupReminder(trip.id).catch((error) => console.error(error));
          }}
        />`}

      <ul class="tiles">
        ${TILES.map(({ key, Icon, path, packing }) => path
          ? html`
            <li key=${key}>
              <a class="tile is-link" href=${path(trip.id)}>
                <${Icon} />
                <span class="tile-name">${t(key)}</span>
                ${packing && packingTotal > 0 && html`
                  <span class=${'badge ' + (packingDone === packingTotal ? 'badge-active' : 'badge-soon')}>
                    ${t('packing.tileProgress', { done: String(packingDone), total: String(packingTotal) })}
                  </span>`}
              </a>
            </li>`
          : html`
            <li key=${key}>
              <div class="tile" aria-disabled="true">
                <${Icon} />
                <span class="tile-name">${t(key)}</span>
                <span class="badge badge-muted">${t('common.comingSoon')}</span>
              </div>
            </li>`)}
      </ul>

      <${ActionSheet}
        open=${menuOpen}
        title=${trip.name}
        actions=${actions}
        onClose=${() => setMenuOpen(false)}
      />
      ${exporting && html`<${ExportDialog} trip=${trip} onClose=${() => setExporting(false)} />`}
      <${ConfirmDialog}
        open=${confirmingDelete}
        title=${t('delete.title')}
        text=${t('delete.text', { name: trip.name })}
        confirmLabel=${t('delete.confirm')}
        danger=${true}
        onCancel=${() => setConfirmingDelete(false)}
        onConfirm=${() => {
          setConfirmingDelete(false);
          deleteWithUndo(trip);
        }}
      />
    </section>`;
}
