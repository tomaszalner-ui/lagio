// color-picker.js — a row of round colour swatches; one can be chosen.
// Works like radio buttons, so screen readers announce "Jūra, selected".

import { html } from './html.js';
import { t } from '../i18n.js';
import { COVER_COLORS } from '../modules/trips.js';

// Text key for each colour's name
const COLOR_NAMES = {
  sea: 'colors.sea',
  lagoon: 'colors.lagoon',
  forest: 'colors.forest',
  amber: 'colors.amber',
  sunset: 'colors.sunset',
  berry: 'colors.berry',
  plum: 'colors.plum',
  slate: 'colors.slate'
};

export function ColorPicker({ labelId, value, onChange }) {
  return html`
    <div class="color-picker" role="radiogroup" aria-labelledby=${labelId}>
      ${COVER_COLORS.map((color) => html`
        <button
          type="button"
          key=${color}
          role="radio"
          class=${'swatch cover-' + color}
          aria-checked=${color === value}
          aria-label=${t(COLOR_NAMES[color])}
          title=${t(COLOR_NAMES[color])}
          onClick=${() => onChange(color)}
        ></button>`)}
    </div>`;
}
