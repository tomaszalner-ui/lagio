// illustrations.js — drawings and icons (inline SVG).
// Colours come from CSS variables or `currentColor`, so they follow the theme.
// Every icon is decorative (aria-hidden): the button or link around it
// carries the text for screen readers.

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

// Small 24×24 line icons. `d` is the SVG path.
function Icon({ d, weight = 2 }) {
  return html`
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d=${d} fill="none" stroke="currentColor" stroke-width=${weight}
        stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}

export const ChevronLeft = () => html`<${Icon} d="M15 5l-7 7 7 7" />`;
export const PlusIcon = () => html`<${Icon} d="M12 5v14M5 12h14" />`;
export const CloseIcon = () => html`<${Icon} d="M6 6l12 12M18 6L6 18" />`;
export const MoreIcon = () => html`<${Icon} d="M5 12h.01M12 12h.01M19 12h.01" weight="4" />`;
export const TicketIcon = () => html`<${Icon} d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10" />`;
export const CalendarIcon = () => html`<${Icon} d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4" />`;
export const ChecklistIcon = () => html`<${Icon} d="M10 6h10M10 12h10M10 18h10M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" />`;
export const WalletIcon = () => html`<${Icon} d="M4 7h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3M16 13h.01" />`;
export const NoteIcon = () => html`<${Icon} d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6" />`;
export const FileIcon = () => html`<${Icon} d="M6 3h9l4 4v14H6zM15 3v4h4" />`;
export const ImageIcon = () => html`<${Icon} d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9h.01" />`;
