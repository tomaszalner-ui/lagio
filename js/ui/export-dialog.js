// export-dialog.js — "Export trip": prepares the .lagio file, then offers
// Share (when the phone can share such a file) and Download.
// Two taps on purpose: phones only allow sharing straight after a tap, and
// preparing a trip with many PDFs can take a few seconds.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { t, formatFileSize } from '../i18n.js';
import { exportTrip, markExported } from '../transfer.js';
import { Modal } from './dialog.js';
import { showToast } from './toast.js';

export function ExportDialog({ trip, onClose }) {
  const [status, setStatus] = useState('preparing'); // preparing | ready | failed
  const [file, setFile] = useState(null);
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

  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));

  function done(message) {
    markExported(trip.id).catch((error) => console.error(error));
    showToast({ text: message });
    onClose();
  }

  function share() {
    navigator.share({ files: [file], title: trip.name })
      .then(() => done(t('export.shared')))
      .catch((error) => {
        if (error.name === 'AbortError') return; // the user closed the share menu
        console.error(error);
        showToast({ text: t('common.error') });
      });
  }

  function download() {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    done(t('export.downloaded', { name: file.name }));
  }

  let text = t('export.preparing');
  if (status === 'ready') text = t('export.readyText', { name: file.name, size: formatFileSize(file.size) });
  if (status === 'failed') text = t('export.failed');

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>
        ${status === 'ready' ? t('export.readyTitle') : t('dashboard.export')}
      </h2>
      <p class="modal-text" role="status">${text}</p>
      <div class="modal-buttons">
        <button type="button" class="button" onClick=${onClose}>${t('common.close')}</button>
        ${status === 'ready' && html`
          <button type="button" class=${'button' + (canShare ? '' : ' button-primary')} onClick=${download}>
            ${t('export.download')}
          </button>`}
        ${status === 'ready' && canShare && html`
          <button type="button" class="button button-primary" onClick=${share}>${t('export.share')}</button>`}
      </div>
    <//>`;
}
