// document-viewer.js — a full-screen view of one document.
// Images show inside the app. PDFs are shown with the browser's own PDF
// viewer where the phone has one; the buttons below offer other ways:
//   Open in browser  the file in a new tab
//   Share            send it to another app (if the phone supports it)
//   Download         save a copy to the phone's Downloads
// All of these work offline: the file comes from this phone's storage.
//
// URL.createObjectURL(blob) gives a temporary "blob:" address for a file
// in memory, so <img>, <iframe> and new tabs can show it without a server.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { t } from '../i18n.js';
import { documentKind, loadDocumentBlob } from '../modules/documents.js';
import { Modal } from './dialog.js';
import { CloseIcon } from './illustrations.js';
import { showToast } from './toast.js';

export function DocumentViewer({ doc, onClose, onDelete }) {
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState(null);
  const [missing, setMissing] = useState(false);
  const titleId = useRef('viewer-title-' + doc.id).current;

  // Load the file when the viewer opens; free the memory after closing
  useEffect(() => {
    let objectUrl = null;
    let closed = false;
    loadDocumentBlob(doc)
      .then((content) => {
        if (closed) return;
        if (!content) {
          setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(content);
        setBlob(content);
        setUrl(objectUrl);
      })
      .catch((error) => {
        console.error(error);
        setMissing(true);
      });
    return () => {
      closed = true;
      // A tab opened from here may still be reading it, so wait a minute
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    };
  }, [doc.id]);

  const kind = documentKind(doc);
  const name = doc.name || t('documents.untitled');
  const file = blob && new File([blob], name, { type: doc.mimeType });
  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));

  function openInBrowser() {
    const opened = window.open(url, '_blank');
    if (!opened) showToast({ text: t('viewer.openFailed') });
  }

  function share() {
    navigator.share({ files: [file], title: name }).catch((error) => {
      if (error.name === 'AbortError') return; // the user closed the share menu
      console.error(error);
      showToast({ text: t('common.error') });
    });
  }

  function download() {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  let preview = null;
  if (missing) preview = html`<p class="viewer-message">${t('viewer.missing')}</p>`;
  else if (url && kind === 'image') preview = html`<img class="viewer-image" src=${url} alt=${name} />`;
  else if (url && kind === 'pdf') preview = html`<iframe class="viewer-frame" src=${url} title=${name}></iframe>`;
  else if (url) preview = html`<p class="viewer-message">${t('viewer.noPreview')}</p>`;

  return html`
    <${Modal} open=${true} onClose=${onClose} className="viewer" titleId=${titleId}>
      <div class="viewer-head">
        <h2 class="viewer-title" id=${titleId}>${name}</h2>
        <button type="button" class="icon-button" aria-label=${t('viewer.close')} onClick=${onClose}>
          <${CloseIcon} />
        </button>
      </div>
      <div class="viewer-body">${preview}</div>
      <div class="viewer-actions">
        <button type="button" class="button" disabled=${!url} onClick=${openInBrowser}>${t('viewer.openBrowser')}</button>
        ${canShare && html`
          <button type="button" class="button" onClick=${share}>${t('viewer.share')}</button>`}
        <button type="button" class="button" disabled=${!url} onClick=${download}>${t('viewer.download')}</button>
        <button type="button" class="button button-danger-text" onClick=${onDelete}>${t('viewer.delete')}</button>
      </div>
    <//>`;
}
