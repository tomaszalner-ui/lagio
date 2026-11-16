// trip-packing.js — the trip's packing list (#/trip/:id/packing).
// Tap a row to tick it as packed. Add items at the top, edit or delete them
// with the pencil. "Hide packed" leaves only what is still missing, and
// "Start over" unticks everything (e.g. to pack for the way home).

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadChecklist } from '../store.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import {
  CATEGORIES, MAX_QUANTITY, validateItem, addItem, updateItem, setDone, deleteItem, undoDeleteItem,
  untickAll, undoUntickAll, progress, groupByCategory
} from '../modules/checklist.js';
import { EmptyState } from './empty-state.js';
import { Modal, ConfirmDialog } from './dialog.js';
import { NotFound } from './not-found.js';
import { showToast } from './toast.js';
import { ChevronLeft, PlusIcon, MinusIcon, PencilIcon } from './illustrations.js';

// Text key of each category's name
export const CATEGORY_NAMES = {
  documents: 'packing.category.documents',
  clothes: 'packing.category.clothes',
  toiletries: 'packing.category.toiletries',
  electronics: 'packing.category.electronics',
  health: 'packing.category.health',
  other: 'packing.category.other'
};

function CategorySelect({ id, value, onChange }) {
  return html`
    <select id=${id} class="input" value=${value} onChange=${(event) => onChange(event.currentTarget.value)}>
      ${CATEGORIES.map((category) => html`
        <option key=${category} value=${category}>${t(CATEGORY_NAMES[category])}</option>`)}
    </select>`;
}

// − ×3 + ; empty means "no quantity". "×1" says nothing, so it goes
// straight from empty to ×2 and back.
function QuantityStepper({ value, onChange }) {
  const current = value || 0;
  return html`
    <div class="stepper">
      <button type="button" class="stepper-button" aria-label=${t('packing.fewer')}
        disabled=${!value} onClick=${() => onChange(current <= 2 ? null : current - 1)}>
        <${MinusIcon} />
      </button>
      <span class="stepper-value" aria-live="polite">${value ? '×' + value : '–'}</span>
      <button type="button" class="stepper-button" aria-label=${t('packing.more')}
        disabled=${current >= MAX_QUANTITY} onClick=${() => onChange(Math.max(2, current + 1))}>
        <${PlusIcon} />
      </button>
    </div>`;
}

// The edit box for one item
function EditItemDialog({ item, onClose, onDelete }) {
  const [text, setText] = useState(item.text);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(item.quantity);
  const [error, setError] = useState('');
  const titleId = useRef('edit-item-' + item.id).current;

  async function save(event) {
    event.preventDefault();
    if (validateItem({ text }).text) {
      setError(t('packing.error.textRequired'));
      return;
    }
    try {
      await updateItem(item.id, { text, category, quantity });
      await reloadChecklist(item.tripId);
      onClose();
    } catch (failure) {
      console.error(failure);
      showToast({ text: t('common.error') });
    }
  }

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${t('packing.editTitle')}</h2>
      <form class="form modal-form" onSubmit=${save} noValidate>
        <div class=${'field' + (error ? ' has-error' : '')}>
          <label class="field-label" for="edit-item-text">${t('packing.item')}</label>
          <input id="edit-item-text" class="input" type="text" value=${text} maxLength="80"
            onInput=${(event) => { setText(event.currentTarget.value); setError(''); }} />
          ${error && html`<p class="field-error" role="alert">${error}</p>`}
        </div>
        <div class="field-row">
          <div class="field">
            <label class="field-label" for="edit-item-category">${t('packing.categoryLabel')}</label>
            <${CategorySelect} id="edit-item-category" value=${category} onChange=${setCategory} />
          </div>
          <div class="field">
            <span class="field-label">${t('packing.quantity')}</span>
            <${QuantityStepper} value=${quantity} onChange=${setQuantity} />
          </div>
        </div>
        <div class="modal-buttons">
          <button type="button" class="button button-danger-text" onClick=${onDelete}>${t('packing.delete')}</button>
          <button type="button" class="button" onClick=${onClose}>${t('common.cancel')}</button>
          <button type="submit" class="button button-primary">${t('common.save')}</button>
        </div>
      </form>
    <//>`;
}

function ItemRow({ item, onToggle, onEdit }) {
  const inputId = 'pack-' + item.id;
  return html`
    <li class=${'pack-item' + (item.done ? ' is-done' : '')}>
      <input id=${inputId} type="checkbox" class="pack-check" checked=${item.done} onChange=${() => onToggle(item)} />
      <label class="pack-label" for=${inputId}>
        <span class="pack-text">${item.text}</span>
        ${item.quantity && html`<span class="pack-quantity">×${item.quantity}</span>`}
      </label>
      <button type="button" class="pack-edit" aria-label=${t('packing.editItem', { name: item.text })} onClick=${() => onEdit(item)}>
        <${PencilIcon} />
      </button>
    </li>`;
}

export function TripPacking({ id }) {
  const trips = useStore((s) => s.trips);
  const checklist = useStore((s) => s.checklist);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('clothes');
  const [addError, setAddError] = useState('');
  const [hidePacked, setHidePacked] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    reloadChecklist(id).catch((error) => console.error(error));
  }, [id]);

  const trip = trips.find((item) => item.id === id);
  if (!trip) return html`<${NotFound} />`;

  const loaded = checklist.tripId === id;
  const items = loaded ? checklist.items : [];
  const { done, total } = progress(items);
  const shown = hidePacked ? items.filter((item) => !item.done) : items;
  const percent = total ? Math.round((done / total) * 100) : 0;

  async function add(event) {
    event.preventDefault();
    if (validateItem({ text }).text) {
      setAddError(t('packing.error.textRequired'));
      document.getElementById('packing-new-text')?.focus();
      return;
    }
    try {
      await addItem(id, { text, category });
      setText('');
      await reloadChecklist(id);
      document.getElementById('packing-new-text')?.focus(); // ready for the next item
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  async function toggle(item) {
    try {
      await setDone(item.id, !item.done);
      await reloadChecklist(id);
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  async function remove(item) {
    setEditing(null);
    try {
      const removedId = await deleteItem(item);
      await reloadChecklist(id);
      showToast({
        text: t('toast.itemDeleted'),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await undoDeleteItem(removedId);
          await reloadChecklist(id);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  async function startOver() {
    setConfirmingReset(false);
    try {
      const ids = await untickAll(id);
      await reloadChecklist(id);
      showToast({
        text: t('toast.packingReset'),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await undoUntickAll(ids);
          await reloadChecklist(id);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.trip(id)}>
        <${ChevronLeft} /><span>${trip.name}</span>
      </a>
      <h1 class="screen-title screen-head">${t('dashboard.tiles.packing')}</h1>

      ${total > 0 && html`
        <div class="pack-progress">
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax=${total} aria-valuenow=${done}
            aria-label=${t('packing.progress', { done: String(done), total: String(total) })}>
            <div class="progress-bar" style=${{ width: percent + '%' }}></div>
          </div>
          <p class="pack-progress-text">
            ${done === total ? t('packing.allDone') : t('packing.progress', { done: String(done), total: String(total) })}
          </p>
        </div>`}

      <form class="pack-add" onSubmit=${add} noValidate>
        <label class="field-label" for="packing-new-text">${t('packing.newItem')}</label>
        <input
          id="packing-new-text"
          class="input"
          type="text"
          value=${text}
          maxLength="80"
          placeholder=${t('packing.newItemPlaceholder')}
          autocomplete="off"
          enterkeyhint="done"
          aria-invalid=${!!addError}
          onInput=${(event) => { setText(event.currentTarget.value); setAddError(''); }}
        />
        ${addError && html`<p class="field-error" role="alert">${addError}</p>`}
        <div class="pack-add-row">
          <${CategorySelect} id="packing-new-category" value=${category} onChange=${setCategory} />
          <button type="submit" class="button button-primary"><${PlusIcon} /><span>${t('packing.add')}</span></button>
        </div>
      </form>

      ${total > 0 && html`
        <div class="pack-tools">
          <button type="button" class="chip-toggle" aria-pressed=${hidePacked} onClick=${() => setHidePacked(!hidePacked)}>
            ${t('packing.hidePacked')}
          </button>
          ${done > 0 && html`
            <button type="button" class="chip-toggle" onClick=${() => setConfirmingReset(true)}>${t('packing.reset')}</button>`}
        </div>`}

      ${loaded && total === 0 && html`
        <${EmptyState} title=${t('packing.emptyTitle')} text=${t('packing.emptyText')} />`}

      ${groupByCategory(shown).map((group) => html`
        <section class="pack-group" key=${group.category}>
          <h2 class="section-title">
            ${t(CATEGORY_NAMES[group.category])}
            <span class="pack-group-count">${progress(items.filter((item) => item.category === group.category)).done}/${items.filter((item) => item.category === group.category).length}</span>
          </h2>
          <ul class="pack-list">
            ${group.items.map((item) => html`
              <${ItemRow} key=${item.id} item=${item} onToggle=${toggle} onEdit=${setEditing} />`)}
          </ul>
        </section>`)}

      ${hidePacked && total > 0 && shown.length === 0 && html`
        <p class="pack-all-hidden">${t('packing.allDone')}</p>`}

      ${editing && html`
        <${EditItemDialog} item=${editing} onClose=${() => setEditing(null)} onDelete=${() => remove(editing)} />`}
      <${ConfirmDialog}
        open=${confirmingReset}
        title=${t('packing.resetTitle')}
        text=${t('packing.resetText')}
        confirmLabel=${t('packing.resetConfirm')}
        onCancel=${() => setConfirmingReset(false)}
        onConfirm=${startOver}
      />
    </section>`;
}
