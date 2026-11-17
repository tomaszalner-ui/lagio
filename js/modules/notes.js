// modules/notes.js — free-text notes of a trip: addresses, phrases, contacts.
// Uses only db.js; no screen code and no text.
//
// A note (base fields are added by db.js), in the 'notes' store:
//   title  'Taksi į viešbutį' (optional)
//   body   free text, kept exactly as typed (line breaks included)
// A note with neither title nor text is never saved (the screen checks
// isEmptyNote before saving).

import { create, list, update, softDelete, restore } from '../db.js';

export function isEmptyNote(input) {
  return !String(input.title || '').trim() && !String(input.body || '').trim();
}

function cleanNote(input) {
  return {
    title: String(input.title || '').trim(),
    body: String(input.body || '').replace(/\s+$/, '') // trailing blank lines dropped
  };
}

// Most recently changed first
export async function listNotes(tripId) {
  const notes = await list('notes', { tripId });
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createNote(tripId, input) {
  if (isEmptyNote(input)) throw new Error('Empty note');
  return create('notes', { ...cleanNote(input), tripId });
}

export function updateNote(id, input) {
  if (isEmptyNote(input)) throw new Error('Empty note');
  return update('notes', id, cleanNote(input));
}

export async function deleteNote(note) {
  await softDelete('notes', note.id);
  return note.id;
}

export function undoDeleteNote(id) {
  return restore('notes', id);
}

// What a list row shows: the title, or else the first line of the text,
// and the next line of text as a preview. { heading, preview }
export function noteHeading(note) {
  const lines = String(note.body || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (note.title) return { heading: note.title, preview: lines[0] || '' };
  return { heading: lines[0] || '', preview: lines[1] || '' };
}

// ---------- tappable links ----------

// Web addresses, e-mail addresses and phone numbers. Phone numbers must
// start with + or with 0 / 8 (Lithuanian style), so dates and prices are
// not taken for phone numbers.
const LINK = /((?:https?:\/\/|www\.)[^\s<>]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|((?:\+|\b[08])[\d ()-]{6,18}\d)/g;

// Splits text into parts: [{ text }, { text, href, kind: 'web' | 'email' | 'phone' }]
export function linkParts(text) {
  const parts = [];
  let last = 0;
  for (const match of String(text || '').matchAll(LINK)) {
    let [found] = match;
    const kind = match[1] ? 'web' : match[2] ? 'email' : 'phone';
    if (kind === 'web') found = found.replace(/[.,;:!?)]+$/, ''); // "(see www.x.lt)." -> www.x.lt
    if (kind === 'phone' && found.replace(/\D/g, '').length < 8) continue;
    const start = match.index;
    if (start > last) parts.push({ text: text.slice(last, start) });
    const href = kind === 'web' ? (/^www\./i.test(found) ? 'https://' + found : found) // external link (tapped by the user)
      : kind === 'email' ? 'mailto:' + found
      : 'tel:' + found.replace(/[^\d+]/g, '');
    parts.push({ text: found, href, kind });
    last = start + found.length;
  }
  if (last < String(text || '').length) parts.push({ text: text.slice(last) });
  return parts;
}
