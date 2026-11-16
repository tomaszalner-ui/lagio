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
export const PlaneIcon = () => html`<${Icon} d="M12 2.5c.8 0 1.5.7 1.5 1.5v5l7 4v2l-7-2v4.5l2 1.5v1.5L12 19.5 8.5 20.5V19l2-1.5V13l-7 2v-2l7-4V4c0-.8.7-1.5 1.5-1.5z" />`;
export const TrainIcon = () => html`<${Icon} d="M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M9 13.5h.01M15 13.5h.01M8 17l-2 4M16 17l2 4" />`;
export const BusIcon = () => html`<${Icon} d="M6 3h12a2 2 0 0 1 2 2v12H4V5a2 2 0 0 1 2-2zM4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01" />`;
export const FerryIcon = () => html`<${Icon} d="M4 14h16l-2 5H6zM7 14V9h10v5M10 9V6h4v3M3 21.5c2 0 2.5-1 4.5-1s2.5 1 4.5 1 2.5-1 4.5-1 2.5 1 4.5 1" />`;
export const CarIcon = () => html`<${Icon} d="M5 16v-5l2-5h10l2 5v5zM5 11h14M8 13.5h.01M16 13.5h.01M6 16v3M18 16v3" />`;
export const BedIcon = () => html`<${Icon} d="M3 19V6M3 14h18v5M21 14a3 3 0 0 0-3-3h-8v3M6.5 11h.01" />`;
export const StarIcon = () => html`<${Icon} d="M12 3l2.6 5.5 6 .7-4.4 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.4 9.2l6-.7z" />`;
export const PinIcon = () => html`<${Icon} d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 9.5h.01" />`;
export const CopyIcon = () => html`<${Icon} d="M9 9h10v12H9zM5 15V3h10v2" />`;
export const FileIcon = () => html`<${Icon} d="M6 3h9l4 4v14H6zM15 3v4h4" />`;
export const ImageIcon = () => html`<${Icon} d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9h.01" />`;
