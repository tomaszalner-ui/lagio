// dialog.js — boxes that open over the screen.
// They use the browser's own <dialog> element: it keeps the keyboard focus
// inside, closes with Esc / the phone's Back gesture, and dims the page.
//   Modal         the base: open={true/false}, onClose
//   ConfirmDialog "Delete this trip?" with Cancel / Delete
//   ActionSheet   a list of actions sliding up from the bottom (the ⋯ menu)

import { useLayoutEffect, useRef } from 'preact/hooks';
import { html } from './html.js';
import { t } from '../i18n.js';

let nextId = 1;

export function Modal({ open, onClose, className = '', titleId, children }) {
  const ref = useRef(null);

  // useLayoutEffect runs right after the screen is updated (useEffect waits
  // for a timer), so the box opens or closes in the same moment, never late.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return html`
    <dialog
      ref=${ref}
      class=${'modal ' + className}
      aria-labelledby=${titleId}
      onCancel=${(event) => { event.preventDefault(); onClose(); }}
      onClick=${(event) => { if (event.target === ref.current) onClose(); }}
    >
      <div class="modal-box">${open && children}</div>
    </dialog>`;
}

export function ConfirmDialog({ open, title, text, confirmLabel, danger = false, onConfirm, onCancel }) {
  const titleId = useRef('dialog-title-' + nextId++).current;
  return html`
    <${Modal} open=${open} onClose=${onCancel} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${title}</h2>
      ${text && html`<p class="modal-text">${text}</p>`}
      <div class="modal-buttons">
        <button type="button" class="button" onClick=${onCancel}>${t('common.cancel')}</button>
        <button type="button" class=${'button ' + (danger ? 'button-danger' : 'button-primary')} onClick=${onConfirm}>
          ${confirmLabel}
        </button>
      </div>
    <//>`;
}

// actions: [{ label, onClick, danger }]
export function ActionSheet({ open, title, actions, onClose }) {
  const titleId = useRef('sheet-title-' + nextId++).current;
  return html`
    <${Modal} open=${open} onClose=${onClose} className="sheet" titleId=${titleId}>
      <h2 class="sheet-title" id=${titleId}>${title}</h2>
      <ul class="sheet-list">
        ${actions.map((action) => html`
          <li key=${action.label}>
            <button
              type="button"
              class=${'sheet-action' + (action.danger ? ' is-danger' : '')}
              onClick=${() => { onClose(); action.onClick(); }}
            >${action.label}</button>
          </li>`)}
      </ul>
      <button type="button" class="button sheet-cancel" onClick=${onClose}>${t('common.cancel')}</button>
    <//>`;
}
