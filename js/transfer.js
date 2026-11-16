// transfer.js — the trip file (.lagio): export now, import in step 4b.
// Uses only db.js; no screen code and no text.
//
// A .lagio file is a zip:
//   trip.json     { app: 'lagio', formatVersion, appVersion, exportedAt,
//                   tripId, records: { trips: [...], bookings: [...], … },
//                   files: [{ id, name, type, size, … }] }
//   files/<id>    the content of each attached PDF or photo
// Deleted records are not exported: the file is a copy for a person.

import { list, get, getSetting, setSetting } from './db.js';
import { APP_VERSION } from './version.js';

export const FORMAT_VERSION = 1;
export const FILE_EXTENSION = '.lagio';

// Every store that holds a trip's data. tools/check.mjs makes sure each
// store in db.js is either listed here or is 'files' / 'settings'.
export const EXPORTED_STORES = [
  'trips',
  'days',
  'itineraryItems',
  'bookings',
  'documents',
  'checklistItems',
  'expenses',
  'notes'
];

// 'Roma su draugais' -> 'Roma-su-draugais-2026-11-16.lagio'
// (letters like ą, č stay; characters phones do not allow in names go)
export function exportFileName(trip, date = new Date()) {
  const base = String(trip.name || 'Lagio')
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'Lagio';
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${base}-${day}${FILE_EXTENSION}`;
}

// Makes the .lagio file for one trip. Returns a File (a Blob with a name).
export async function exportTrip(tripId) {
  const trip = await get('trips', tripId);
  if (!trip) throw new Error('Trip not found: ' + tripId);

  const records = {};
  for (const store of EXPORTED_STORES) {
    records[store] = await list(store, { tripId });
  }
  // A trip saved before tripId = id (very first test version) is found by id
  if (!records.trips.some((item) => item.id === tripId)) records.trips.push(trip);

  // Only files that a live document points to
  const wantedFiles = new Set(records.documents.map((doc) => doc.fileId));
  const files = (await list('files', { tripId })).filter((file) => wantedFiles.has(file.id) && file.blob);

  // JSZip (about 100 kB) is loaded only when a trip is exported
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const fileInfo = [];
  for (const file of files) {
    const { blob, ...info } = file;
    // PDFs and photos are already compressed: store them as they are (fast)
    zip.file('files/' + file.id, blob, { compression: 'STORE' });
    fileInfo.push(info);
  }
  const manifest = {
    app: 'lagio',
    formatVersion: FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    tripId,
    records,
    files: fileInfo
  };
  zip.file('trip.json', JSON.stringify(manifest, null, 2), { compression: 'DEFLATE' });

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  return new File([blob], exportFileName(trip), { type: 'application/zip' });
}

// ---------- remembering exports (for the backup reminder) ----------

// Notes that the trip was just exported (shared or downloaded)
export function markExported(tripId) {
  return setSetting('lastExport:' + tripId, new Date().toISOString());
}

// When the trip was last exported, or null
export function lastExportedAt(tripId) {
  return getSetting('lastExport:' + tripId, null);
}
