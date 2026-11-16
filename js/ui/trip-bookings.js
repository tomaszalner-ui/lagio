// trip-bookings.js — the trip's "Tickets and bookings" screen
// (#/trip/:id/bookings): bookings grouped by day, then the trip's documents
// (add, view, delete).

import { useEffect, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadDocuments, reloadBookings } from '../store.js';
import { t, formatDate, formatFileSize, formatTimestamp } from '../i18n.js';
import { paths } from '../router.js';
import {
  ACCEPTED_TYPES, isLarge, documentKind, addDocument, totalSize, deleteDocument, undoDeleteDocument
} from '../modules/documents.js';
import { groupByDay } from '../modules/bookings.js';
import { BookingCard } from './booking-parts.js';
import { EmptyState } from './empty-state.js';
import { ConfirmDialog } from './dialog.js';
import { DocumentViewer } from './document-viewer.js';
import { NotFound } from './not-found.js';
import { showToast } from './toast.js';
import { ChevronLeft, PlusIcon, FileIcon, ImageIcon } from './illustrations.js';

const INPUT_ID = 'trip-document-input';

// "Add document" is a <label> for a hidden file input: tapping a label opens
// the phone's file picker reliably on every phone (camera included).
function AddDocumentButton({ primary }) {
  return html`
    <label class=${'button' + (primary ? ' button-primary' : '')} for=${INPUT_ID}>
      <${PlusIcon} /><span>${t('documents.add')}</span>
    </label>`;
}

function DocumentRow({ doc, onOpen }) {
  return html`
    <li>
      <button type="button" class="doc-row" onClick=${() => onOpen(doc)}>
        <span class="doc-icon">${documentKind(doc) === 'image' ? html`<${ImageIcon} />` : html`<${FileIcon} />`}</span>
        <span class="doc-text">
          <span class="doc-name">${doc.name || t('documents.untitled')}</span>
          <span class="doc-meta">
            ${t('documents.meta', { size: formatFileSize(doc.size), date: formatTimestamp(doc.createdAt) })}
          </span>
        </span>
      </button>
    </li>`;
}

// The bookings, one block per day ("gruodžio 20 d., sekmadienis")
function BookingList({ tripId, bookings }) {
  return html`
    ${groupByDay(bookings).map((group) => html`
      <div class="day-group" key=${group.date || 'undated'}>
        <h3 class="day-title">${group.date ? formatDate(group.date, 'day') : t('bookings.undated')}</h3>
        <ul class="card-list">
          ${group.bookings.map((booking) => html`
            <li key=${booking.id}><${BookingCard} tripId=${tripId} booking=${booking} /></li>`)}
        </ul>
      </div>`)}`;
}

export function TripBookings({ id }) {
  const trips = useStore((s) => s.trips);
  const documents = useStore((s) => s.documents);
  const bookings = useStore((s) => s.bookings);
  const [viewing, setViewing] = useState(null);          // document open in the viewer
  const [waitingLarge, setWaitingLarge] = useState(null); // files waiting for "add anyway?"
  const [deleting, setDeleting] = useState(null);        // document waiting for "delete?"
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([reloadBookings(id), reloadDocuments(id)]).catch((error) => console.error(error));
  }, [id]);

  const trip = trips.find((item) => item.id === id);
  if (!trip) return html`<${NotFound} />`;

  const loaded = documents.tripId === id;
  const allDocs = loaded ? documents.items : [];
  const bookingsLoaded = bookings.tripId === id;
  const tripBookings = bookingsLoaded ? bookings.items : [];
  const tripDocs = allDocs.filter((doc) => !doc.bookingId);

  async function addFiles(files) {
    setAdding(true);
    let added = 0;
    let failedMessage = '';
    for (const file of files) {
      try {
        await addDocument(id, file);
        added += 1;
      } catch (error) {
        console.error(error);
        failedMessage = error && error.name === 'QuotaExceededError'
          ? t('documents.noSpace')
          : t('documents.addFailed', { name: file.name });
      }
    }
    await reloadDocuments(id);
    setAdding(false);
    if (failedMessage) showToast({ text: failedMessage });
    else if (added) showToast({ text: t('documents.added', { count: added }) });
  }

  function onPick(event) {
    const files = [...event.currentTarget.files];
    event.currentTarget.value = ''; // so picking the same file again works
    if (files.length === 0) return;
    if (files.some(isLarge)) setWaitingLarge(files);
    else addFiles(files);
  }

  async function confirmDelete() {
    const doc = deleting;
    setDeleting(null);
    try {
      const deleted = await deleteDocument(doc);
      await reloadDocuments(id);
      showToast({
        text: t('toast.documentDeleted'),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await undoDeleteDocument(deleted);
          await reloadDocuments(id);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  const firstLarge = waitingLarge && waitingLarge.find(isLarge);

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.trip(id)}>
        <${ChevronLeft} /><span>${trip.name}</span>
      </a>
      <h1 class="screen-title screen-head">${t('dashboard.tiles.bookings')}</h1>

      <section class="booking-section">
        <div class="section-head">
          <h2 class="section-title">${t('bookings.title')}</h2>
          ${tripBookings.length > 0 && html`
            <a class="button button-primary button-small" href=${paths.bookingNew(id)}>
              <${PlusIcon} /><span>${t('bookings.new')}</span>
            </a>`}
        </div>
        ${bookingsLoaded && tripBookings.length === 0
          ? html`
            <${EmptyState} title=${t('bookings.emptyTitle')} text=${t('bookings.emptyText')}>
              <a class="button button-primary" href=${paths.bookingNew(id)}>
                <${PlusIcon} /><span>${t('bookings.new')}</span>
              </a>
            <//>`
          : html`<${BookingList} tripId=${id} bookings=${tripBookings} />`}
      </section>

      <section class="doc-section">
        <h2 class="section-title">${t('documents.title')}</h2>
        ${loaded && tripDocs.length === 0
          ? html`
            <${EmptyState} title=${t('documents.emptyTitle')} text=${t('documents.emptyText')}>
              <${AddDocumentButton} primary=${true} />
            <//>`
          : html`
            <ul class="doc-list">
              ${tripDocs.map((doc) => html`<${DocumentRow} key=${doc.id} doc=${doc} onOpen=${setViewing} />`)}
            </ul>
            <div class="doc-actions">
              <${AddDocumentButton} />
            </div>`}
        ${adding && html`<p class="muted" role="status">${t('documents.adding')}</p>`}
        ${allDocs.length > 0 && html`
          <p class="muted storage-line">${t('documents.storageUsed', { size: formatFileSize(totalSize(allDocs)) })}</p>`}
        <input
          id=${INPUT_ID}
          class="visually-hidden"
          type="file"
          accept=${ACCEPTED_TYPES}
          multiple
          onChange=${onPick}
        />
      </section>

      ${viewing && html`
        <${DocumentViewer}
          doc=${viewing}
          onClose=${() => setViewing(null)}
          onDelete=${() => { setDeleting(viewing); setViewing(null); }}
        />`}

      <${ConfirmDialog}
        open=${!!waitingLarge}
        title=${t('documents.largeTitle')}
        text=${firstLarge ? t('documents.largeText', { name: firstLarge.name, size: formatFileSize(firstLarge.size) }) : ''}
        confirmLabel=${t('documents.largeConfirm')}
        onCancel=${() => setWaitingLarge(null)}
        onConfirm=${() => {
          const files = waitingLarge;
          setWaitingLarge(null);
          addFiles(files);
        }}
      />
      <${ConfirmDialog}
        open=${!!deleting}
        title=${t('documents.deleteTitle')}
        text=${deleting ? t('documents.deleteText', { name: deleting.name || t('documents.untitled') }) : ''}
        confirmLabel=${t('delete.confirm')}
        danger=${true}
        onCancel=${() => setDeleting(null)}
        onConfirm=${confirmDelete}
      />
    </section>`;
}
