// packing-templates.js — "Add from template" and "Save as template" for the
// packing list. Built-in templates are turned into words in the current
// language here; items already on the list are not added twice.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { reloadChecklist } from '../store.js';
import { t } from '../i18n.js';
import { addItems, removeItems, newItemsOnly } from '../modules/checklist.js';
import {
  BUILT_IN_TEMPLATES, quantityFor, listOwnTemplates, saveOwnTemplate, renameOwnTemplate, deleteOwnTemplate
} from '../modules/packing-templates.js';
import { Modal, ConfirmDialog } from './dialog.js';
import { showToast } from './toast.js';
import { PencilIcon, TrashIcon } from './illustrations.js';

// A template's items as { text, category, quantity } for this trip
function resolve(template, trip, own) {
  if (own) return template.items;
  return template.items.map((item) => ({
    text: t(item.text),
    category: item.category,
    quantity: quantityFor(item, trip)
  }));
}

// items: the list the templates go to (one person's, or the shared one);
// ownerId: that person (null = shared)
export function TemplatePicker({ trip, items, ownerId = null, onClose }) {
  const [selected, setSelected] = useState(() => new Set(['essentials']));
  const [own, setOwn] = useState([]);
  const [renaming, setRenaming] = useState(null);   // { id, name }
  const [deleting, setDeleting] = useState(null);   // own template
  const [saving, setSaving] = useState(false);
  const titleId = useRef('template-picker').current;

  const loadOwn = () => listOwnTemplates().then(setOwn).catch((error) => console.error(error));
  useEffect(() => { loadOwn(); }, []);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  // Everything the chosen templates would add (without what is already there)
  const chosen = [
    ...BUILT_IN_TEMPLATES.filter((tpl) => selected.has(tpl.id)).map((tpl) => resolve(tpl, trip, false)),
    ...own.filter((tpl) => selected.has(tpl.id)).map((tpl) => resolve(tpl, trip, true))
  ].flat();
  const toAdd = newItemsOnly(items, chosen);

  async function add() {
    setSaving(true);
    try {
      const ids = await addItems(trip.id, toAdd, { ownerId });
      await reloadChecklist(trip.id);
      onClose();
      showToast({
        text: t('packing.addedItems', { count: ids.length }),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await removeItems(ids);
          await reloadChecklist(trip.id);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
      setSaving(false);
    }
  }

  async function saveRename(event) {
    event.preventDefault();
    if (!renaming.name.trim()) return;
    await renameOwnTemplate(renaming.id, renaming.name);
    setRenaming(null);
    loadOwn();
  }

  async function confirmDelete() {
    const template = deleting;
    setDeleting(null);
    await deleteOwnTemplate(template.id);
    const next = new Set(selected);
    next.delete(template.id);
    setSelected(next);
    loadOwn();
  }

  const row = (template, isOwn) => {
    const count = template.items.length;
    const inputId = 'tpl-' + template.id;
    if (isOwn && renaming && renaming.id === template.id) {
      return html`
        <li class="tpl-row" key=${template.id}>
          <form class="tpl-rename" onSubmit=${saveRename}>
            <input class="input" type="text" value=${renaming.name} maxLength="40" aria-label=${t('packing.templateName')}
              onInput=${(event) => setRenaming({ ...renaming, name: event.currentTarget.value })} />
            <button type="submit" class="button button-small button-primary">${t('common.save')}</button>
          </form>
        </li>`;
    }
    return html`
      <li class="tpl-row" key=${template.id}>
        <input id=${inputId} type="checkbox" class="pack-check" checked=${selected.has(template.id)} onChange=${() => toggle(template.id)} />
        <label class="tpl-label" for=${inputId}>
          <span class="tpl-name">${isOwn ? template.name : t(template.name)}</span>
          <span class="tpl-count">${t('packing.itemCount', { count })}</span>
        </label>
        ${isOwn && html`
          <button type="button" class="pack-edit" aria-label=${t('packing.renameTemplate', { name: template.name })}
            onClick=${() => setRenaming({ id: template.id, name: template.name })}><${PencilIcon} /></button>
          <button type="button" class="pack-edit" aria-label=${t('packing.deleteTemplate', { name: template.name })}
            onClick=${() => setDeleting(template)}><${TrashIcon} /></button>`}
      </li>`;
  };

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${t('packing.fromTemplate')}</h2>
      <p class="modal-text">${t('packing.fromTemplateText')}</p>
      <h3 class="tpl-heading">${t('packing.builtInTemplates')}</h3>
      <ul class="tpl-list">${BUILT_IN_TEMPLATES.map((template) => row(template, false))}</ul>
      ${own.length > 0 && html`
        <h3 class="tpl-heading">${t('packing.ownTemplates')}</h3>
        <ul class="tpl-list">${own.map((template) => row(template, true))}</ul>`}
      ${selected.size > 0 && toAdd.length === 0 && html`<p class="modal-text">${t('packing.nothingNew')}</p>`}
      <div class="modal-buttons">
        <button type="button" class="button" onClick=${onClose}>${t('common.cancel')}</button>
        <button type="button" class="button button-primary" disabled=${toAdd.length === 0 || saving} onClick=${add}>
          ${t('packing.addCount', { count: String(toAdd.length) })}
        </button>
      </div>
      <${ConfirmDialog}
        open=${!!deleting}
        title=${t('packing.deleteTemplateTitle')}
        text=${deleting ? t('packing.deleteTemplateText', { name: deleting.name }) : ''}
        confirmLabel=${t('delete.confirm')}
        danger=${true}
        onCancel=${() => setDeleting(null)}
        onConfirm=${confirmDelete}
      />
    <//>`;
}

export function SaveTemplateDialog({ trip, items, onClose }) {
  const [name, setName] = useState(trip.name);
  const [error, setError] = useState('');
  const titleId = useRef('save-template').current;

  async function save(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t('packing.error.templateName'));
      return;
    }
    try {
      await saveOwnTemplate(name, items);
      onClose();
      showToast({ text: t('toast.templateSaved', { name: name.trim() }) });
    } catch (failure) {
      console.error(failure);
      showToast({ text: t('common.error') });
    }
  }

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${t('packing.saveTemplate')}</h2>
      <p class="modal-text">${t('packing.saveTemplateText', { count: items.length })}</p>
      <form class="form modal-form" onSubmit=${save} noValidate>
        <div class=${'field' + (error ? ' has-error' : '')}>
          <label class="field-label" for="template-name">${t('packing.templateName')}</label>
          <input id="template-name" class="input" type="text" value=${name} maxLength="40"
            onInput=${(event) => { setName(event.currentTarget.value); setError(''); }} />
          ${error && html`<p class="field-error" role="alert">${error}</p>`}
        </div>
        <div class="modal-buttons">
          <button type="button" class="button" onClick=${onClose}>${t('common.cancel')}</button>
          <button type="submit" class="button button-primary">${t('common.save')}</button>
        </div>
      </form>
    <//>`;
}
