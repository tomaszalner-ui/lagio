// modules/checklist.js — the trip's packing list.
// Uses only db.js; no screen code and no text.
//
// A checklist item (base fields are added by db.js):
//   listName  'packing' (kept for a possible "before you leave" list later)
//   category  one of CATEGORIES (a key; the screen translates it)
//   text      'Pasas'
//   quantity  whole number 1–99, or null (most items have none)
//   done      true when packed
//   order     position inside its category (new items go last)
//   ownerId   which traveler it belongs to; null = shared (milestone 5c)

import { create, list, update, softDelete, restore } from '../db.js';

export const CATEGORIES = ['documents', 'clothes', 'toiletries', 'electronics', 'health', 'other'];
export const PACKING_LIST = 'packing';
export const MAX_QUANTITY = 99;

// Problems as codes, e.g. { text: 'required' }
export function validateItem(input) {
  const errors = {};
  if (!String(input.text || '').trim()) errors.text = 'required';
  if (input.category !== undefined && !CATEGORIES.includes(input.category)) errors.category = 'invalid';
  const q = input.quantity;
  if (q !== null && q !== undefined && !(Number.isInteger(q) && q >= 1 && q <= MAX_QUANTITY)) errors.quantity = 'invalid';
  return errors;
}

function assertValid(input) {
  const errors = validateItem(input);
  if (Object.keys(errors).length) throw new Error('Invalid item: ' + JSON.stringify(errors));
}

// A trip's packing list: categories in CATEGORIES order, then by order
export async function listItems(tripId) {
  const items = (await list('checklistItems', { tripId })).filter((item) => item.listName === PACKING_LIST);
  return items.sort((a, b) =>
    CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
    (a.order || 0) - (b.order || 0) ||
    a.createdAt.localeCompare(b.createdAt));
}

export async function addItem(tripId, input) {
  assertValid(input);
  const category = CATEGORIES.includes(input.category) ? input.category : 'other';
  const existing = await listItems(tripId);
  const last = existing.filter((item) => item.category === category)
    .reduce((max, item) => Math.max(max, item.order || 0), 0);
  return create('checklistItems', {
    tripId,
    listName: PACKING_LIST,
    category,
    text: String(input.text).trim(),
    quantity: Number.isInteger(input.quantity) ? input.quantity : null,
    done: false,
    order: last + 1,
    ownerId: input.ownerId || null
  });
}

// Changes text, category or quantity
export function updateItem(id, changes) {
  assertValid({ text: 'x', ...changes });
  const clean = {};
  if (changes.text !== undefined) clean.text = String(changes.text).trim();
  if (changes.category !== undefined) clean.category = changes.category;
  if (changes.quantity !== undefined) clean.quantity = Number.isInteger(changes.quantity) ? changes.quantity : null;
  return update('checklistItems', id, clean);
}

export function setDone(id, done) {
  return update('checklistItems', id, { done: !!done });
}

export async function deleteItem(item) {
  await softDelete('checklistItems', item.id);
  return item.id;
}

export function undoDeleteItem(id) {
  return restore('checklistItems', id);
}

// Unticks everything (e.g. to pack for the way home). Returns the ids that
// were ticked, for Undo.
export async function untickAll(tripId) {
  const ticked = (await listItems(tripId)).filter((item) => item.done);
  for (const item of ticked) await setDone(item.id, false);
  return ticked.map((item) => item.id);
}

export async function undoUntickAll(ids) {
  for (const id of ids) await setDone(id, true);
}

// ---------- adding many at once (templates) ----------

const sameText = (a, b) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

// Of `items` ({ text, category, quantity }), the ones not already on the list
// (same text, ignoring case) and not repeated inside `items` itself
export function newItemsOnly(existing, items) {
  const result = [];
  for (const item of items) {
    const taken = existing.some((other) => sameText(other.text, item.text)) ||
      result.some((other) => sameText(other.text, item.text));
    if (!taken) result.push(item);
  }
  return result;
}

// Adds the items that are not on the list yet. Returns the new ids (for Undo).
export async function addItems(tripId, items, { ownerId = null } = {}) {
  const existing = await listItems(tripId);
  const ids = [];
  for (const item of newItemsOnly(existing, items)) {
    const created = await addItem(tripId, { ...item, ownerId });
    ids.push(created.id);
  }
  return ids;
}

// Undo for addItems()
export async function removeItems(ids) {
  for (const id of ids) await softDelete('checklistItems', id);
}

// { done: 12, total: 30 }
export function progress(items) {
  return { done: items.filter((item) => item.done).length, total: items.length };
}

// Items grouped by category, only categories that have items:
// [{ category: 'clothes', items: [...] }, …]
export function groupByCategory(items) {
  return CATEGORIES
    .map((category) => ({ category, items: items.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
}
