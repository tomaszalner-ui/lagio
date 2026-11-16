// empty-state.js — shown when a list has nothing in it yet.
// Tells the user what will appear here and what to do next.
// Usage: <${EmptyState} illustration=${…} title=${t('…')} text=${t('…')}>
//          optional buttons go here
//        <//>

import { html } from './html.js';

export function EmptyState({ illustration, title, text, children }) {
  return html`
    <div class="empty-state">
      ${illustration}
      <h2 class="empty-state-title">${title}</h2>
      ${text && html`<p class="empty-state-text">${text}</p>`}
      ${children}
    </div>`;
}
