// places-input.js — add places one at a time; each shows as a chip with ×.
// value: [{ name: 'Roma' }, …]   onChange(newList)
// Whatever is typed is also added when the field loses focus, so a place
// typed but not yet added is not lost when the form is saved.

import { useState } from 'preact/hooks';
import { html } from './html.js';
import { t } from '../i18n.js';
import { CloseIcon } from './illustrations.js';

export function PlacesInput({ id, value, onChange }) {
  const [draft, setDraft] = useState('');

  function add() {
    const name = draft.trim();
    if (!name) return;
    const exists = value.some((place) => place.name.toLowerCase() === name.toLowerCase());
    if (!exists) onChange([...value, { name }]);
    setDraft('');
  }

  function remove(index) {
    onChange(value.filter((_, i) => i !== index));
  }

  return html`
    <div class="places">
      ${value.length > 0 && html`
        <ul class="chips">
          ${value.map((place, index) => html`
            <li class="chip" key=${place.name}>
              <span>${place.name}</span>
              <button
                type="button"
                class="chip-remove"
                aria-label=${t('tripForm.removePlace', { name: place.name })}
                onClick=${() => remove(index)}
              ><${CloseIcon} /></button>
            </li>`)}
        </ul>`}
      <div class="places-add">
        <input
          id=${id}
          type="text"
          class="input"
          value=${draft}
          placeholder=${t('tripForm.placePlaceholder')}
          autocomplete="off"
          enterkeyhint="done"
          onInput=${(event) => setDraft(event.currentTarget.value)}
          onKeyDown=${(event) => {
            if (event.key === 'Enter') {
              event.preventDefault(); // add the place instead of sending the form
              add();
            }
          }}
          onBlur=${add}
        />
        <button type="button" class="button" onClick=${add} disabled=${!draft.trim()}>
          ${t('tripForm.addPlace')}
        </button>
      </div>
    </div>`;
}
