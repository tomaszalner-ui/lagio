// places-input.js — add names one at a time; each shows as a chip with ×.
// Used for the trip's places and for its travelers.
// value: [{ name: 'Roma' }, …]   onChange(newList)
// Whatever is typed is also added when the field loses focus, so a name
// typed but not yet added is not lost when the form is saved.
// With `editable`, tapping a chip's name lets the user rename it (the item
// keeps its other fields, e.g. a traveler's id).
// `labels` gives the text keys: { placeholder, add, remove, rename }.

import { useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { t } from '../i18n.js';
import { CloseIcon } from './illustrations.js';

const PLACE_LABELS = {
  placeholder: 'tripForm.placePlaceholder',
  add: 'tripForm.addPlace',
  remove: 'tripForm.removePlace',
  rename: 'tripForm.renamePlace'
};

export function PlacesInput({ id, value, onChange, labels = PLACE_LABELS, editable = false }) {
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState(null); // { index, name }
  // The newest typed name right away (the screen may not have redrawn yet
  // when Enter is pressed), same idea as in trip-form.js
  const latestRename = useRef(null);
  const startRename = (value) => {
    latestRename.current = value;
    setRenaming(value);
  };

  const taken = (name, except = -1) =>
    value.some((item, i) => i !== except && item.name.toLocaleLowerCase() === name.toLocaleLowerCase());

  function add() {
    const name = draft.trim();
    if (!name) return;
    if (!taken(name)) onChange([...value, { name }]);
    setDraft('');
  }

  function remove(index) {
    onChange(value.filter((_, i) => i !== index));
  }

  function finishRename() {
    const current = latestRename.current;
    if (!current) return;
    latestRename.current = null;
    const name = current.name.trim();
    if (name && !taken(name, current.index)) {
      onChange(value.map((item, i) => (i === current.index ? { ...item, name } : item)));
    }
    setRenaming(null);
  }

  return html`
    <div class="places">
      ${value.length > 0 && html`
        <ul class="chips">
          ${value.map((item, index) => html`
            <li class="chip" key=${item.id || item.name}>
              ${renaming && renaming.index === index
                ? html`<input
                    class="chip-input"
                    type="text"
                    value=${renaming.name}
                    aria-label=${t(labels.rename, { name: item.name })}
                    autofocus
                    onInput=${(event) => startRename({ index, name: event.currentTarget.value })}
                    onKeyDown=${(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        finishRename();
                      }
                    }}
                    onBlur=${finishRename}
                  />`
                : editable
                  ? html`<button type="button" class="chip-name" aria-label=${t(labels.rename, { name: item.name })}
                      onClick=${() => startRename({ index, name: item.name })}>${item.name}</button>`
                  : html`<span>${item.name}</span>`}
              <button
                type="button"
                class="chip-remove"
                aria-label=${t(labels.remove, { name: item.name })}
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
          placeholder=${t(labels.placeholder)}
          autocomplete="off"
          enterkeyhint="done"
          onInput=${(event) => setDraft(event.currentTarget.value)}
          onKeyDown=${(event) => {
            if (event.key === 'Enter') {
              event.preventDefault(); // add the name instead of sending the form
              add();
            }
          }}
          onBlur=${add}
        />
        <button type="button" class="button" onClick=${add} disabled=${!draft.trim()}>
          ${t(labels.add)}
        </button>
      </div>
    </div>`;
}
