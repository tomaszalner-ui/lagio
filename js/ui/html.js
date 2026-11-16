// html.js — lets us write screens with HTML-like markup inside JavaScript:
//   html`<p class="hint">${t('home.emptyText')}</p>`
// htm turns that into Preact elements. No build step needed.

import { h } from 'preact';
import htm from 'htm';

export const html = htm.bind(h);
