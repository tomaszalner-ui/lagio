// modules/documents.js — files attached to a trip (tickets, insurance,
// passport copies…). Uses only db.js; no screen code and no text.
//
// Two records per file:
//   'documents' store: { name, mimeType, size, fileId, bookingId }
//                      the small description, quick to list
//   'files' store:     the file content itself (a Blob), see db.putFile()
// bookingId links a document to one booking (milestone 3c);
// null means it belongs to the whole trip.

import { create, list, softDelete, restore, putFile, getFile } from '../db.js';

// Files above this size ask before they are added (20 MB)
export const LARGE_FILE_BYTES = 20 * 1024 * 1024;

// What the file picker offers: PDFs and images (photos too)
export const ACCEPTED_TYPES = 'application/pdf,image/*';

export function isLarge(file) {
  return file.size > LARGE_FILE_BYTES;
}

// 'pdf', 'image' or 'other', for the icon and the viewer
export function documentKind(doc) {
  const type = doc.mimeType || '';
  if (type === 'application/pdf' || /\.pdf$/i.test(doc.name)) return 'pdf';
  if (type.startsWith('image/')) return 'image';
  return 'other';
}

// Saves a file from the picker for a trip (and optionally a booking).
export async function addDocument(tripId, file, { bookingId = null } = {}) {
  const stored = await putFile(tripId, file, { name: file.name });
  return create('documents', {
    tripId,
    bookingId,
    name: file.name || '',
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    fileId: stored.id
  });
}

// A trip's documents, oldest first.
export async function listDocuments(tripId) {
  const docs = await list('documents', { tripId });
  return docs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// The file content of a document, or null if it is missing.
export async function loadDocumentBlob(doc) {
  const file = await getFile(doc.fileId);
  return file ? file.blob : null;
}

// Total size of some documents, in bytes
export function totalSize(docs) {
  return docs.reduce((sum, doc) => sum + (doc.size || 0), 0);
}

// Soft-deletes the document and its file. Returns what to pass to
// undoDeleteDocument().
export async function deleteDocument(doc) {
  await softDelete('documents', doc.id);
  await softDelete('files', doc.fileId);
  return [{ store: 'documents', id: doc.id }, { store: 'files', id: doc.fileId }];
}

export async function undoDeleteDocument(deleted) {
  for (const { store, id } of deleted) {
    await restore(store, id);
  }
}
