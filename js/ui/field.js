// field.js — a labelled form field with an optional hint and error message.
// Usage:
//   <${Field} id="trip-name" label=${t('…')} error=${errorText} hint=${t('…')}>
//     <input id="trip-name" … />
//   <//>
// The input's id must match `id`, so tapping the label focuses the input.

import { html } from './html.js';

export function Field({ id, label, hint, error, children }) {
  return html`
    <div class=${'field' + (error ? ' has-error' : '')}>
      <label class="field-label" for=${id}>${label}</label>
      ${children}
      ${hint && !error && html`<p class="field-hint">${hint}</p>`}
      ${error && html`<p class="field-error" id=${id + '-error'} role="alert">${error}</p>`}
    </div>`;
}
