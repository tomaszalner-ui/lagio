// document-section.js — a list of documents with Add, view, move and delete.
// Used twice:
//   - on the trip's bookings screen: "Kiti dokumentai" (bookingId null)
//   - on a booking's screen: "Bilietai ir dokumentai" (that booking's id)
// The documents come from the store (reloadDocuments loads the whole trip's).

import { useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadDocuments } from '../store.js';
import { t, formatFileSize, formatTimestamp } from '../i18n.js';
import {
  ACCEPTED_TYPES, isLarge, documentKind, addDocument, deleteDocument, undoDeleteDocument, moveDocument
} from '../modules/documents.js';
import { EmptyState } from './empty-state.js';
import { ActionSheet, ConfirmDialog } from './dialog.js';
import { DocumentViewer } from './document-viewer.js';
import { showToast } from './toast.js';
import { PlusIcon, FileIcon, ImageIcon } from './illustrations.js';

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

// labels: { title, emptyTitle, emptyText, add } — text keys for this section
export function DocumentSection({ tripId, bookingId = null, labels }) {
  const documents = useStore((s) => s.documents);
  const bookings = useStore((s) => s.bookings);
  const [viewing, setViewing] = useState(null);          // document open in the viewer
  const [moving, setMoving] = useState(null);            // document waiting for "move where?"
  const [waitingLarge, setWaitingLarge] = useState(null); // files waiting for "add anyway?"
  const [deleting, setDeleting] = useState(null);        // document waiting for "delete?"
  const [adding, setAdding] = useState(false);

  const loaded = documents.tripId === tripId;
  const docs = loaded ? documents.items.filter((doc) => (doc.bookingId || null) === bookingId) : [];
  const tripBookings = bookings.tripId === tripId ? bookings.items : [];
  const inputId = 'document-input-' + (bookingId || 'trip');

  async function addFiles(files) {
    setAdding(true);
    let added = 0;
    let failedMessage = '';
    for (const file of files) {
      try {
        await addDocument(tripId, file, { bookingId });
        added += 1;
      } catch (error) {
        console.error(error);
        failedMessage = error && error.name === 'QuotaExceededError'
          ? t('documents.noSpace')
          : t('documents.addFailed', { name: file.name });
      }
    }
    await reloadDocuments(tripId);
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
      await reloadDocuments(tripId);
      showToast({
        text: t('toast.documentDeleted'),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await undoDeleteDocument(deleted);
          await reloadDocuments(tripId);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  // Where a document can go: the trip's other documents, or any booking
  // (except where it already is)
  function moveTargets(doc) {
    const targets = [{ bookingId: null, label: t('documents.otherTitle') }]
      .concat(tripBookings.map((booking) => ({ bookingId: booking.id, label: booking.title })));
    return targets.filter((target) => target.bookingId !== (doc.bookingId || null));
  }

  async function move(doc, target) {
    const from = doc.bookingId || null;
    try {
      await moveDocument(doc, target.bookingId);
      await reloadDocuments(tripId);
      showToast({
        text: t('toast.documentMoved', { target: target.label }),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await moveDocument(doc, from);
          await reloadDocuments(tripId);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  const addButton = (primary) => html`
    <label class=${'button' + (primary ? ' button-primary' : '')} for=${inputId}>
      <${PlusIcon} /><span>${t(labels.add)}</span>
    </label>`;
  const firstLarge = waitingLarge && waitingLarge.find(isLarge);

  return html`
    <section class="doc-section">
      <h2 class="section-title">${t(labels.title)}</h2>
      ${loaded && docs.length === 0
        ? html`<${EmptyState} title=${t(labels.emptyTitle)} text=${t(labels.emptyText)}>${addButton(true)}<//>`
        : html`
          <ul class="doc-list">
            ${docs.map((doc) => html`<${DocumentRow} key=${doc.id} doc=${doc} onOpen=${setViewing} />`)}
          </ul>
          <div class="doc-actions">${addButton(false)}</div>`}
      ${adding && html`<p class="muted" role="status">${t('documents.adding')}</p>`}
      <input
        id=${inputId}
        class="visually-hidden"
        type="file"
        accept=${ACCEPTED_TYPES}
        multiple
        onChange=${onPick}
      />

      ${viewing && html`
        <${DocumentViewer}
          doc=${viewing}
          onClose=${() => setViewing(null)}
          onDelete=${() => { setDeleting(viewing); setViewing(null); }}
          onMove=${moveTargets(viewing).length > 0 ? () => { setMoving(viewing); setViewing(null); } : null}
        />`}

      <${ActionSheet}
        open=${!!moving}
        title=${t('documents.moveTitle')}
        actions=${moving ? moveTargets(moving).map((target) => ({ label: target.label, onClick: () => move(moving, target) })) : []}
        onClose=${() => setMoving(null)}
      />
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
