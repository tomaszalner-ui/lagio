// illustrations.js — small drawings used in empty states (inline SVG).
// Colours come from CSS variables, so they follow the app's theme.

import { html } from './html.js';

// A suitcase: the Lagio symbol (lagaminas = suitcase)
export function Suitcase() {
  return html`
    <svg class="illustration" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle cx="60" cy="62" r="54" fill="var(--color-primary-soft)" />
      <path d="M46 36v-8a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v8" fill="none"
        stroke="var(--color-primary)" stroke-width="6" stroke-linecap="round" />
      <rect x="26" y="36" width="68" height="54" rx="10" fill="var(--color-accent)" />
      <rect x="40" y="36" width="7" height="54" fill="var(--color-accent-dark)" />
      <rect x="73" y="36" width="7" height="54" fill="var(--color-accent-dark)" />
      <circle cx="38" cy="96" r="5" fill="var(--color-primary)" />
      <circle cx="82" cy="96" r="5" fill="var(--color-primary)" />
    </svg>`;
}

// A small "back" arrow for links
export function ChevronLeft() {
  return html`
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}
