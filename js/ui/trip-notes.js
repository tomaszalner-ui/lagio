// trip-notes.js — the trip's notes.
//   #/trip/:id/notes          the list, last changed first
//   #/trip/:id/notes/new      a new note, straight in editing
//   #/trip/:id/notes/:noteId  one note: links and phone numbers can be tapped;
//                             Redaguoti, Kopijuoti, Dideliu šriftu, Ištrinti
// Editing saves by itself while typing (a moment after the last key), and
// again when leaving the screen or switching to another app, so nothing is
// lost. An emptied note is deleted when editing ends (with Undo).

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadNotes } from '../store.js';
import { t, formatTimestamp } from '../i18n.js';
import { navigate, paths } from '../router.js';
import {
  isEmptyNote, createNote, updateNote, deleteNote, undoDeleteNote, noteHeading, linkParts
} from '../modules/notes.js';
import { EmptyState } from './empty-state.js';
import { Modal } from './dialog.js';
import { NotFound } from './not-found.js';
import { showToast } from './toast.js';
import { copyText } from './copy-text.js';
import { ChevronLeft, PlusIcon, PencilIcon, CopyIcon, ExpandIcon, TrashIcon, CloseIcon } from './illustrations.js';

const SAVE_DELAY_MS = 600;

// Deletes a note and offers Undo
async function removeWithUndo(note, tripId) {
  const id = await deleteNote(note);
  await reloadNotes(tripId);
  showToast({
    text: t('toast.noteDeleted'),
    actionLabel: t('common.undo'),
    onAction: async () => {
      await undoDeleteNote(id);
      await reloadNotes(tripId);
    }
  });
}

// The whole note as one text (for copying and big text)
const fullText = (note) => [note.title, note.body].filter(Boolean).join('\n');

// ---------- the list ----------

export function TripNotes({ id }) {
  const trips = useStore((s) => s.trips);
  const notes = useStore((s) => s.notes);

  useEffect(() => {
    reloadNotes(id).catch((error) => console.error(error));
  }, [id]);

  const trip = trips.find((item) => item.id === id);
  if (!trip) return html`<${NotFound} />`;
  const loaded = notes.tripId === id;
  const items = loaded ? notes.items : [];

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.trip(id)}><${ChevronLeft} /><span>${trip.name}</span></a>
      <h1 class="screen-title screen-head">${t('dashboard.tiles.notes')}</h1>

      <a class="button button-primary notes-add" href=${paths.noteNew(id)}>
        <${PlusIcon} /><span>${t('notes.add')}</span>
      </a>

      ${loaded && items.length === 0 && html`
        <${EmptyState} title=${t('notes.emptyTitle')} text=${t('notes.emptyText')} />`}

      ${items.length > 0 && html`
        <ul class="notes-list">
          ${items.map((note) => {
            const { heading, preview } = noteHeading(note);
            return html`
              <li key=${note.id}>
                <a class="note-row" href=${paths.note(id, note.id)}>
                  <span class="note-row-title">${heading}</span>
                  ${preview && html`<span class="note-row-preview">${preview}</span>`}
                </a>
              </li>`;
          })}
        </ul>`}
    </section>`;
}

// ---------- one note ----------

// Text with web addresses, e-mails and phone numbers as links
function LinkedText({ text }) {
  return linkParts(text).map((part, index) => (part.href
    ? html`<a key=${index} href=${part.href} target=${part.kind === 'web' ? '_blank' : undefined}
        rel=${part.kind === 'web' ? 'noopener' : undefined}>${part.text}</a>`
    : part.text));
}

// The note full-screen in big letters, to show someone (a driver, a waiter)
function BigText({ note, onClose }) {
  const titleId = useRef('big-text-title').current;
  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId} className="big-text">
      <button type="button" class="icon-button big-text-close" aria-label=${t('common.close')} onClick=${onClose}>
        <${CloseIcon} />
      </button>
      ${note.title && html`<h2 class="big-text-title" id=${titleId}>${note.title}</h2>`}
      <p class="big-text-body">${note.body}</p>
    <//>`;
}

// Title and text boxes that save by themselves
function NoteEditor({ tripId, note, onDone }) {
  const [draft, setDraft] = useState(() => ({ title: note ? note.title : '', body: note ? note.body : '' }));
  const [status, setStatus] = useState(''); // '' | 'saving' | 'saved'
  const latest = useRef(draft);     // newest typed values right away
  const record = useRef(note);      // the saved note (null until the first save)
  const saved = useRef(draft);      // what is in the database now
  const timer = useRef(null);
  const queue = useRef(Promise.resolve()); // saves run one after another

  // Saves the newest values if they changed (an empty note is not saved)
  function flush() {
    clearTimeout(timer.current);
    queue.current = queue.current.then(async () => {
      const values = latest.current;
      if (values.title === saved.current.title && values.body === saved.current.body) return;
      if (isEmptyNote(values)) return;
      record.current = record.current
        ? await updateNote(record.current.id, values)
        : await createNote(tripId, values);
      saved.current = values;
      setStatus('saved');
    }).catch((error) => {
      console.error(error);
      showToast({ text: t('common.error') });
    });
    return queue.current;
  }

  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setDraft(latest.current);
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  // Ends editing (Baigti, or leaving the screen): save, and delete a note
  // that was emptied. Runs once. Returns the saved note, or null.
  const ended = useRef(false);
  async function wrapUp() {
    if (ended.current) return record.current;
    ended.current = true;
    await flush();
    if (isEmptyNote(latest.current) && record.current) {
      await removeWithUndo(record.current, tripId).catch((error) => console.error(error));
      return null;
    }
    await reloadNotes(tripId);
    return record.current;
  }

  async function finish() {
    onDone(await wrapUp());
  }

  // A new note: start typing straight away
  const bodyRef = useRef(null);
  useEffect(() => {
    if (!note && bodyRef.current) bodyRef.current.focus();
  }, []);

  // Save when the app goes to the background, and when leaving the screen
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      wrapUp();
    };
  }, []);

  return html`
    <div class="note-editor">
      <div class="note-editor-bar">
        <span class="note-status" role="status">
          ${status === 'saved' ? t('notes.saved') : status === 'saving' ? t('notes.saving') : ''}
        </span>
        <button type="button" class="button button-primary button-small" onClick=${finish}>${t('notes.done')}</button>
      </div>
      <input id="note-title" class="input note-title-input" type="text" maxLength="120" autocomplete="off"
        aria-label=${t('notes.titleLabel')} placeholder=${t('notes.titlePlaceholder')}
        value=${draft.title} onInput=${(event) => set('title', event.currentTarget.value)} />
      <textarea id="note-body" class="input textarea note-body-input" rows="12"
        aria-label=${t('notes.bodyLabel')} placeholder=${t('notes.bodyPlaceholder')}
        value=${draft.body} ref=${bodyRef}
        onInput=${(event) => set('body', event.currentTarget.value)}></textarea>
    </div>`;
}

export function NoteScreen({ tripId, noteId }) {
  const trips = useStore((s) => s.trips);
  const notes = useStore((s) => s.notes);
  const [editing, setEditing] = useState(!noteId);
  const [big, setBig] = useState(false);

  useEffect(() => {
    if (notes.tripId !== tripId) reloadNotes(tripId).catch((error) => console.error(error));
  }, [tripId]);

  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return html`<${NotFound} />`;
  const listHref = paths.tripNotes(tripId);
  const back = html`<a class="back-link" href=${listHref}><${ChevronLeft} /><span>${t('dashboard.tiles.notes')}</span></a>`;

  // A new note
  if (!noteId) {
    return html`
      <section class="screen">
        ${back}
        <h1 class="visually-hidden">${t('notes.newTitle')}</h1>
        <${NoteEditor} tripId=${tripId} note=${null}
          onDone=${(saved) => navigate(saved ? paths.note(tripId, saved.id) : listHref, { replace: true })} />
      </section>`;
  }

  if (notes.tripId !== tripId) return null; // still loading (a moment)
  const note = notes.items.find((item) => item.id === noteId);
  if (!note) {
    return html`<${NotFound} title=${t('notes.notFoundTitle')} text=${t('trips.notFoundText')}
      backHref=${listHref} backLabel=${t('dashboard.tiles.notes')} />`;
  }

  if (editing) {
    return html`
      <section class="screen">
        ${back}
        <h1 class="visually-hidden">${t('notes.editTitle')}</h1>
        <${NoteEditor} tripId=${tripId} note=${note}
          onDone=${(saved) => (saved ? setEditing(false) : navigate(listHref, { replace: true }))} />
      </section>`;
  }

  async function copy() {
    const copied = await copyText(fullText(note));
    showToast({ text: copied ? t('toast.copied') : t('common.error') });
  }

  async function remove() {
    try {
      navigate(listHref, { replace: true }); // leave first, so this screen never shows "not found"
      await removeWithUndo(note, tripId);
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  return html`
    <section class="screen">
      ${back}
      <h1 class=${'screen-title note-title' + (note.title ? '' : ' is-untitled')}>${note.title || t('notes.untitled')}</h1>
      ${note.body && html`<p class="note-body"><${LinkedText} text=${note.body} /></p>`}
      <p class="note-updated">${t('notes.updated', { date: formatTimestamp(note.updatedAt) })}</p>

      <div class="note-actions">
        <button type="button" class="button button-small" onClick=${() => setEditing(true)}>
          <${PencilIcon} /><span>${t('notes.edit')}</span>
        </button>
        <button type="button" class="button button-small" onClick=${copy}>
          <${CopyIcon} /><span>${t('notes.copy')}</span>
        </button>
        <button type="button" class="button button-small" onClick=${() => setBig(true)}>
          <${ExpandIcon} /><span>${t('notes.big')}</span>
        </button>
        <button type="button" class="button button-small button-danger-text" onClick=${remove}>
          <${TrashIcon} /><span>${t('notes.delete')}</span>
        </button>
      </div>

      ${big && html`<${BigText} note=${note} onClose=${() => setBig(false)} />`}
    </section>`;
}
