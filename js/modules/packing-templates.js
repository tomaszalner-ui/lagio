// modules/packing-templates.js — ready-made packing lists and the user's own.
// Uses only db.js; no screen code and no text.
//
// Built-in templates hold text KEYS ('packing.item.passport'); the screen
// turns them into words in the current language when they are added, so the
// saved items are plain text the user can edit.
//   perDay: true  -> quantity = number of trip days (at most 7), e.g. socks
//   quantity: 2   -> a fixed quantity
// The user's own templates are saved in settings (not per trip), so they are
// not part of a trip file.

import { getSetting, setSetting, newId } from '../db.js';

export const BUILT_IN_TEMPLATES = [
  {
    id: 'essentials',
    name: 'packing.template.essentials',
    items: [
      { text: 'packing.item.passport', category: 'documents' },
      { text: 'packing.item.bankCards', category: 'documents' },
      { text: 'packing.item.cash', category: 'documents' },
      { text: 'packing.item.insurance', category: 'documents' },
      { text: 'packing.item.drivingLicence', category: 'documents' },
      { text: 'packing.item.underwear', category: 'clothes', perDay: true },
      { text: 'packing.item.socks', category: 'clothes', perDay: true },
      { text: 'packing.item.tshirts', category: 'clothes', perDay: true },
      { text: 'packing.item.trousers', category: 'clothes' },
      { text: 'packing.item.jumper', category: 'clothes' },
      { text: 'packing.item.pyjamas', category: 'clothes' },
      { text: 'packing.item.comfyShoes', category: 'clothes' },
      { text: 'packing.item.toothbrush', category: 'toiletries' },
      { text: 'packing.item.toothpaste', category: 'toiletries' },
      { text: 'packing.item.deodorant', category: 'toiletries' },
      { text: 'packing.item.shampoo', category: 'toiletries' },
      { text: 'packing.item.comb', category: 'toiletries' },
      { text: 'packing.item.phoneCharger', category: 'electronics' },
      { text: 'packing.item.powerBank', category: 'electronics' },
      { text: 'packing.item.headphones', category: 'electronics' },
      { text: 'packing.item.plugAdapter', category: 'electronics' },
      { text: 'packing.item.ownMedicine', category: 'health' },
      { text: 'packing.item.painkillers', category: 'health' },
      { text: 'packing.item.plasters', category: 'health' },
      { text: 'packing.item.homeKeys', category: 'other' }
    ]
  },
  {
    id: 'beach',
    name: 'packing.template.beach',
    items: [
      { text: 'packing.item.swimsuit', category: 'clothes', quantity: 2 },
      { text: 'packing.item.shorts', category: 'clothes' },
      { text: 'packing.item.lightShirt', category: 'clothes' },
      { text: 'packing.item.flipFlops', category: 'clothes' },
      { text: 'packing.item.sunHat', category: 'clothes' },
      { text: 'packing.item.sunscreen', category: 'toiletries' },
      { text: 'packing.item.afterSun', category: 'toiletries' },
      { text: 'packing.item.insectRepellent', category: 'toiletries' },
      { text: 'packing.item.waterproofCase', category: 'electronics' },
      { text: 'packing.item.sunglasses', category: 'other' },
      { text: 'packing.item.beachTowel', category: 'other' },
      { text: 'packing.item.beachBag', category: 'other' },
      { text: 'packing.item.waterBottle', category: 'other' }
    ]
  },
  {
    id: 'city',
    name: 'packing.template.city',
    items: [
      { text: 'packing.item.walkingShoes', category: 'clothes' },
      { text: 'packing.item.rainJacket', category: 'clothes' },
      { text: 'packing.item.eveningClothes', category: 'clothes' },
      { text: 'packing.item.lightScarf', category: 'clothes' },
      { text: 'packing.item.offlineMap', category: 'electronics' },
      { text: 'packing.item.blisterPlasters', category: 'health' },
      { text: 'packing.item.dayBackpack', category: 'other' },
      { text: 'packing.item.waterBottle', category: 'other' },
      { text: 'packing.item.earplugs', category: 'other' },
      { text: 'packing.item.sleepMask', category: 'other' }
    ]
  },
  {
    id: 'winter',
    name: 'packing.template.winter',
    items: [
      { text: 'packing.item.warmJacket', category: 'clothes' },
      { text: 'packing.item.hat', category: 'clothes' },
      { text: 'packing.item.scarf', category: 'clothes' },
      { text: 'packing.item.gloves', category: 'clothes' },
      { text: 'packing.item.thermalUnderwear', category: 'clothes' },
      { text: 'packing.item.warmSocks', category: 'clothes', perDay: true },
      { text: 'packing.item.warmJumper', category: 'clothes', quantity: 2 },
      { text: 'packing.item.winterBoots', category: 'clothes' },
      { text: 'packing.item.lipBalm', category: 'toiletries' },
      { text: 'packing.item.richFaceCream', category: 'toiletries' },
      { text: 'packing.item.handCream', category: 'toiletries' },
      { text: 'packing.item.thermos', category: 'other' },
      { text: 'packing.item.handWarmers', category: 'other' },
      { text: 'packing.item.snowSunglasses', category: 'other' }
    ]
  }
];

export const MAX_PER_DAY = 7;

// Trip length in days (both dates needed), e.g. 20–24 Dec = 5; else null
export function tripDays(trip) {
  if (!trip.startDate || !trip.endDate) return null;
  const [y1, m1, d1] = trip.startDate.split('-').map(Number);
  const [y2, m2, d2] = trip.endDate.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

// A template item's quantity on this trip: per day (max 7), fixed, or none.
// ×1 says nothing, so it becomes "no quantity".
export function quantityFor(item, trip) {
  let quantity = null;
  if (item.perDay) {
    const days = tripDays(trip);
    quantity = days ? Math.min(days, MAX_PER_DAY) : null;
  } else if (Number.isInteger(item.quantity)) {
    quantity = item.quantity;
  }
  return quantity && quantity >= 2 ? quantity : null;
}

// ---------- the user's own templates (settings) ----------

const SETTING = 'packingTemplates';

// [{ id, name, items: [{ text, category, quantity }] }]
export async function listOwnTemplates() {
  const templates = await getSetting(SETTING, []);
  return Array.isArray(templates) ? templates : [];
}

// Saves the current list as a template: text, category and quantity only
// (no ticks, no owners).
export async function saveOwnTemplate(name, items) {
  const templates = await listOwnTemplates();
  const template = {
    id: newId(),
    name: String(name).trim(),
    items: items.map(({ text, category, quantity }) => ({ text, category, quantity: quantity || null }))
  };
  await setSetting(SETTING, [...templates, template]);
  return template;
}

export async function renameOwnTemplate(id, name) {
  const templates = await listOwnTemplates();
  await setSetting(SETTING, templates.map((template) =>
    template.id === id ? { ...template, name: String(name).trim() } : template));
}

// Returns the deleted template, for Undo
export async function deleteOwnTemplate(id) {
  const templates = await listOwnTemplates();
  const removed = templates.find((template) => template.id === id);
  await setSetting(SETTING, templates.filter((template) => template.id !== id));
  return removed;
}

export async function restoreOwnTemplate(template) {
  const templates = await listOwnTemplates();
  if (!templates.some((item) => item.id === template.id)) await setSetting(SETTING, [...templates, template]);
}
