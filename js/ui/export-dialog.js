// export-dialog.js — "Export trip": prepares the .lagio file, then offers
// Share (when the phone can share such a file) and Download.
// Two taps on purpose: phones only allow sharing straight after a tap, and
// preparing a trip with many PDFs can take a few seconds.
// "Užrakinti slaptažodžiu…" is an optional extra step: the password is typed
// twice, the file is locked (crypto.js), then shared or downloaded the same way.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { t, formatFileSize } from '../i18n.js';
import { exportTrip, lockTripFile, markExported } from '../transfer.js';
import { Modal } from './dialog.js';
import { Field } from './field.js';
import { showToast } from './toast.js';
import { EyeIcon, EyeOffIcon } from './illustrations.js';

export const MIN_PASSWORD = 8;

// A password box with a 👁 button that shows or hides what was typed
export function PasswordInput({ id, value, onInput, shown, onToggle, autocomplete }) {
  return html`
    <div class="password-row">
      <input id=${id} class="input" type=${shown ? 'text' : 'password'} autocomplete=${autocomplete}
        autocapitalize="off" spellcheck="false" value=${value}
        onInput=${(event) => onInput(event.currentTarget.value)} />
      ${onToggle
        ? html`
          <button type="button" class="icon-button password-toggle" aria-pressed=${shown}
            aria-label=${shown ? t('lock.hide') : t('lock.show')} onClick=${onToggle}>
            ${shown ? html`<${EyeOffIcon} />` : html`<${EyeIcon} />`}
          </button>`
        : html`<span class="password-spacer" aria-hidden="true"></span>`}
    </div>`;
}

// The password form: two boxes, rules checked on "Užrakinti"
function LockForm({ onLock, onCancel }) {
  const [values, setValues] = useState({ first: '', second: '' });
  const [shown, setShown] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(values);

  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
    setError('');
  }

  function submit(event) {
    event.preventDefault();
    const { first, second } = latest.current;
    if (first.length < MIN_PASSWORD) {
      setError('short');
      document.getElementById('lock-password').focus();
      return;
    }
    if (first !== second) {
      setError('mismatch');
      document.getElementById('lock-repeat').focus();
      return;
    }
    onLock(first);
  }

  return html`
    <form class="form" onSubmit=${submit} noValidate>
      <p class="modal-text">${t('lock.text')}</p>
      <${Field} id="lock-password" label=${t('lock.password')} hint=${t('lock.rule')}
        error=${error === 'short' ? t('lock.error.short') : ''}>
        <${PasswordInput} id="lock-password" value=${values.first} onInput=${(v) => set('first', v)}
          shown=${shown} onToggle=${() => setShown(!shown)} autocomplete="new-password" />
      <//>
      <${Field} id="lock-repeat" label=${t('lock.repeat')} error=${error === 'mismatch' ? t('lock.error.mismatch') : ''}>
        <${PasswordInput} id="lock-repeat" value=${values.second} onInput=${(v) => set('second', v)}
          shown=${shown} autocomplete="new-password" />
      <//>
      <div class="modal-buttons">
        <button type="button" class="button" onClick=${onCancel}>${t('common.cancel')}</button>
        <button type="submit" class="button button-primary">${t('lock.confirm')}</button>
      </div>
    </form>`;
}

export function ExportDialog({ trip, onClose }) {
  // preparing | ready | lockForm | locking | failed
  const [status, setStatus] = useState('preparing');
  const [file, setFile] = useState(null);      // the plain .lagio file
  const [locked, setLocked] = useState(null);  // the locked one, once made
  const titleId = useRef('export-title-' + trip.id).current;

  useEffect(() => {
    let closed = false;
    exportTrip(trip.id)
      .then((made) => {
        if (closed) return;
        setFile(made);
        setStatus('ready');
      })
      .catch((error) => {
        console.error(error);
        if (!closed) setStatus('failed');
      });
    return () => { closed = true; };
  }, [trip.id]);

  async function lockWith(password) {
    setStatus('locking');
    try {
      setLocked(await lockTripFile(file, password));
      setStatus('ready');
    } catch (error) {
      console.error(error);
      setStatus('failed');
    }
  }

  const output = locked || file; // what Share and Download hand over
  const canShare = !!(output && navigator.canShare && navigator.canShare({ files: [output] }));

  function done(message) {
    markExported(trip.id).catch((error) => console.error(error));
    showToast({ text: message });
    onClose();
  }

  function share() {
    navigator.share({ files: [output], title: trip.name })
      .then(() => done(t('export.shared')))
      .catch((error) => {
        if (error.name === 'AbortError') return; // the user closed the share menu
        console.error(error);
        showToast({ text: t('common.error') });
      });
  }

  function download() {
    const url = URL.createObjectURL(output);
    const link = document.createElement('a');
    link.href = url;
    link.download = output.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    done(t('export.downloaded', { name: output.name }));
  }

  let title = t('dashboard.export');
  let text = t('export.preparing');
  if (status === 'ready') {
    title = locked ? t('export.lockedTitle') : t('export.readyTitle');
    text = t(locked ? 'export.lockedText' : 'export.readyText', { name: output.name, size: formatFileSize(output.size) });
  }
  if (status === 'lockForm') title = t('lock.title');
  if (status === 'locking') text = t('lock.locking');
  if (status === 'failed') text = t('export.failed');

  return html`
    <${Modal} open=${true} onClose=${status === 'locking' ? () => {} : onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${title}</h2>
      ${status === 'lockForm'
        ? html`<${LockForm} onLock=${lockWith} onCancel=${() => setStatus('ready')} />`
        : html`
          <p class="modal-text" role="status">${text}</p>
          ${status === 'ready' && !locked && html`
            <button type="button" class="link-button export-lock" onClick=${() => setStatus('lockForm')}>
              ${t('export.lock')}
            </button>`}
          <div class="modal-buttons">
            <button type="button" class="button" disabled=${status === 'locking'} onClick=${onClose}>${t('common.close')}</button>
            ${status === 'ready' && html`
              <button type="button" class=${'button' + (canShare ? '' : ' button-primary')} onClick=${download}>
                ${t('export.download')}
              </button>`}
            ${status === 'ready' && canShare && html`
              <button type="button" class="button button-primary" onClick=${share}>${t('export.share')}</button>`}
          </div>`}
    <//>`;
}
