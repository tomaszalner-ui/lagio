// toast.js — a short message at the bottom of the screen that disappears
// by itself, optionally with one button (e.g. "Trip deleted · Undo").
// Usage: showToast({ text: t('…'), actionLabel: t('common.undo'), onAction })

import { html } from './html.js';
import { setState, useStore } from '../store.js';

let timer = null;

export function showToast({ text, actionLabel, onAction, duration = 6000 }) {
  clearTimeout(timer);
  setState({ toast: { id: Date.now(), text, actionLabel, onAction } });
  timer = setTimeout(hideToast, duration);
}

export function hideToast() {
  clearTimeout(timer);
  setState({ toast: null });
}

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;

  function act() {
    hideToast();
    toast.onAction();
  }

  return html`
    <div class="toast" role="status" key=${toast.id}>
      <span>${toast.text}</span>
      ${toast.actionLabel && html`
        <button type="button" class="toast-action" onClick=${act}>${toast.actionLabel}</button>`}
    </div>`;
}
