// import-dialog.js — "Import trip": checks the chosen .lagio file, shows a
// short summary, and saves it as a new trip, a copy or a replacement.
// Nothing is saved before the user confirms, and then all or nothing.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { reloadTrips } from '../store.js';
import { t, formatDateRange, formatFileSize, formatTimestamp } from '../i18n.js';
import { navigate, paths } from '../router.js';
import { readTripFile, importStatus, importTrip, TripFileError } from '../transfer.js';
import { Modal } from './dialog.js';
import { Field } from './field.js';
import { showToast } from './toast.js';
import { PasswordInput } from './export-dialog.js';

// Problem code from transfer.js -> text key
const ERROR_TEXT = {
  tooLarge: 'import.error.tooLarge',
  noSpace: 'documents.noSpace',
  notTripFile: 'import.error.notTripFile',
  newerVersion: 'import.error.newerVersion',
  damaged: 'import.error.damaged'
};

function errorMessage(error) {
  if (error instanceof TripFileError) {
    console.info('Trip file refused:', error.message); // the file, not a bug
    return t(ERROR_TEXT[error.code] || 'import.error.failed');
  }
  if (error && error.name === 'QuotaExceededError') return t('documents.noSpace');
  console.error(error);
  return t('import.error.failed');
}

// The password step for a locked file
function PasswordStep({ wrong, busy, onUnlock, onCancel }) {
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const latest = useRef('');
  return html`
    <form class="form" noValidate onSubmit=${(event) => { event.preventDefault(); if (latest.current) onUnlock(latest.current); }}>
      <p class="modal-text">${t('import.lockedText')}</p>
      <${Field} id="unlock-password" label=${t('lock.password')} error=${wrong ? t('import.error.wrongPassword') : ''}>
        <${PasswordInput} id="unlock-password" value=${password} shown=${shown} onToggle=${() => setShown(!shown)}
          autocomplete="current-password"
          onInput=${(value) => { latest.current = value; setPassword(value); }} />
      <//>
      ${busy && html`<p class="modal-text" role="status">${t('import.unlocking')}</p>`}
      <div class="modal-buttons">
        <button type="button" class="button" disabled=${busy} onClick=${onCancel}>${t('common.cancel')}</button>
        <button type="submit" class="button button-primary" disabled=${busy}>${t('import.unlock')}</button>
      </div>
    </form>`;
}

export function ImportDialog({ file, onClose }) {
  // reading -> ready -> saving, or failed; a locked file first: password -> unlocking
  const [state, setState] = useState({ status: 'reading' });
  const titleId = useRef('import-title').current;
  const closed = useRef(false);

  // Reads and checks the file (with the password for a locked one)
  async function read(password) {
    try {
      const bundle = await readTripFile(file, { password });
      const exists = (await importStatus(bundle)) === 'exists';
      if (!closed.current) setState({ status: 'ready', bundle, exists });
    } catch (error) {
      if (closed.current) return;
      if (error instanceof TripFileError && error.code === 'locked') setState({ status: 'password' });
      else if (error instanceof TripFileError && error.code === 'wrongPassword') setState({ status: 'password', wrong: true });
      else setState({ status: 'failed', message: errorMessage(error) });
    }
  }

  useEffect(() => {
    closed.current = false;
    read();
    return () => { closed.current = true; };
  }, [file]);

  function unlock(password) {
    setState({ status: 'unlocking' });
    read(password);
  }

  async function save(mode) {
    const { bundle } = state;
    setState({ ...state, status: 'saving' });
    try {
      const tripId = await importTrip(bundle, mode, {
        copyName: t('trips.copyName', { name: bundle.trip.name })
      });
      await reloadTrips();
      onClose();
      navigate(paths.trip(tripId));
      showToast({ text: t('import.done') });
    } catch (error) {
      setState({ status: 'failed', message: errorMessage(error) });
    }
  }

  const { status, bundle, exists, message } = state;
  const busy = status === 'saving' || status === 'unlocking';

  if (status === 'password' || status === 'unlocking') {
    return html`
      <${Modal} open=${true} onClose=${busy ? () => {} : onClose} titleId=${titleId}>
        <h2 class="modal-title" id=${titleId}>${t('import.lockedTitle')}</h2>
        <${PasswordStep} wrong=${state.wrong} busy=${busy} onUnlock=${unlock} onCancel=${onClose} />
      <//>`;
  }

  let body;
  if (status === 'reading') {
    body = html`<p class="modal-text" role="status">${t('import.reading')}</p>`;
  } else if (status === 'failed') {
    body = html`<p class="modal-text" role="alert">${message}</p>`;
  } else {
    const { trip, manifest } = bundle;
    const dates = formatDateRange(trip.startDate, trip.endDate);
    const summary = [
      t('bookings.count', { count: bundle.bookingCount }),
      t('bookings.attachments', { count: bundle.documentCount }),
      formatFileSize(bundle.totalSize)
    ].join(' · ');
    body = html`
      <div class="import-summary">
        <p class="import-name">${trip.name}</p>
        ${dates && html`<p>${dates}</p>`}
        <p>${summary}</p>
        ${typeof manifest.exportedAt === 'string' && html`
          <p class="muted">${t('import.exportedOn', { date: formatTimestamp(manifest.exportedAt) })}</p>`}
      </div>
      ${exists && html`<p class="modal-text">${t('import.existsText')}</p>`}
      ${busy && html`<p class="modal-text" role="status">${t('import.saving')}</p>`}`;
  }

  return html`
    <${Modal} open=${true} onClose=${busy ? () => {} : onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>
        ${status === 'failed' ? t('import.failedTitle') : status === 'reading' ? t('home.importTrip') : t('import.title')}
      </h2>
      ${body}
      <div class="modal-buttons">
        <button type="button" class="button" disabled=${busy} onClick=${onClose}>
          ${status === 'ready' || busy ? t('common.cancel') : t('common.close')}
        </button>
        ${(status === 'ready' || busy) && !exists && html`
          <button type="button" class="button button-primary" disabled=${busy} onClick=${() => save('replace')}>
            ${t('import.confirm')}
          </button>`}
        ${(status === 'ready' || busy) && exists && html`
          <button type="button" class="button button-danger-text" disabled=${busy} onClick=${() => save('replace')}>
            ${t('import.replace')}
          </button>
          <button type="button" class="button button-primary" disabled=${busy} onClick=${() => save('copy')}>
            ${t('import.asCopy')}
          </button>`}
      </div>
    <//>`;
}
