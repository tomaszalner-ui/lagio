// transfer.js — the trip file (.lagio): export and import.
// Uses only db.js; no screen code and no text.
//
// A .lagio file is a zip:
//   trip.json     { app: 'lagio', formatVersion, appVersion, exportedAt,
//                   tripId, records: { trips: [...], bookings: [...], … },
//                   files: [{ id, name, type, size, … }] }
//   files/<id>    the content of each attached PDF or photo
// Deleted records are not exported: the file is a copy for a person.

import {
  list, get, getSetting, setSetting, newId, importBundle, requestPersistentStorage
} from './db.js';
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
  records.trips = records.trips.map((item) => ({ ...item, tripId }));

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

// ---------- import: reading and checking a file ----------
// Nothing is written to the database until readTripFile() has checked the
// whole file. A broken or hostile file cannot fill the phone: sizes are
// limited and every entry is read in small pieces with a byte limit.

const MB = 1024 * 1024;
export const LIMITS = {
  file: 400 * MB,    // the whole .lagio file, and all its files together
  entry: 100 * MB,   // one attached PDF or photo
  manifest: 10 * MB  // trip.json
};

// Problems are reported with a code the screen turns into text:
//   tooLarge, noSpace, notTripFile, newerVersion, damaged
export class TripFileError extends Error {
  constructor(code, detail = '') {
    super(code + (detail ? ': ' + detail : ''));
    this.name = 'TripFileError';
    this.code = code;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_ENTRY = /^files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

// Reads one zip entry in pieces and stops as soon as it grows past maxBytes,
// so a "zip bomb" (tiny file that unpacks to gigabytes) is stopped early.
function readLimited(entry, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let stopped = false;
    const stream = entry.internalStream('uint8array');
    stream
      .on('data', (chunk) => {
        if (stopped) return;
        total += chunk.length;
        if (total > maxBytes) {
          stopped = true;
          stream.pause();
          reject(new TripFileError('damaged', `${entry.name} is larger than allowed`));
          return;
        }
        chunks.push(chunk);
      })
      .on('error', (error) => {
        if (stopped) return;
        stopped = true;
        reject(new TripFileError('damaged', `${entry.name}: ${error.message}`));
      })
      .on('end', () => {
        if (stopped) return;
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(bytes);
      })
      .resume();
  });
}

// Refuses a file that would not fit in the space the browser still allows
async function checkFreeSpace(bytes) {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return;
    const { quota, usage } = await navigator.storage.estimate();
    if (quota && quota - usage < bytes * 1.1 + 10 * MB) throw new TripFileError('noSpace');
  } catch (error) {
    if (error instanceof TripFileError) throw error;
    // The estimate is not available: the save itself will tell if space runs out
  }
}

// Checks that trip.json describes one complete, consistent trip
function checkManifest(manifest) {
  const fail = (why) => { throw new TripFileError('damaged', why); };
  if (typeof manifest.tripId !== 'string' || !UUID.test(manifest.tripId)) fail('tripId');
  const { records, files } = manifest;
  if (!records || typeof records !== 'object' || Array.isArray(records)) fail('records');
  if (!Array.isArray(files)) fail('files');

  const seen = new Set();
  const checkRecord = (record, where) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) fail(where);
    if (typeof record.id !== 'string' || !UUID.test(record.id)) fail(`${where}: id`);
    if (seen.has(record.id)) fail(`${where}: the same id twice`);
    seen.add(record.id);
    if (record.tripId !== manifest.tripId) fail(`${where}: belongs to another trip`);
    if (record.deletedAt) fail(`${where}: deleted record`);
  };
  for (const [store, list] of Object.entries(records)) {
    if (!EXPORTED_STORES.includes(store)) fail(`unknown store ${store}`);
    if (!Array.isArray(list)) fail(store);
    list.forEach((record) => checkRecord(record, store));
  }
  const trips = records.trips || [];
  if (trips.length !== 1 || trips[0].id !== manifest.tripId || typeof trips[0].name !== 'string') fail('trip');

  files.forEach((file) => {
    checkRecord(file, 'file');
    if (!Number.isInteger(file.size) || file.size < 0 || file.size > LIMITS.entry) fail('file size');
  });
  const fileIds = new Set(files.map((file) => file.id));
  const bookingIds = new Set((records.bookings || []).map((booking) => booking.id));
  for (const doc of records.documents || []) {
    if (!fileIds.has(doc.fileId)) fail('document without its file');
    if (doc.bookingId != null && !bookingIds.has(doc.bookingId)) fail('document points to a missing booking');
  }
}

// Reads and checks a .lagio file. Returns a "bundle" for the summary and
// for importTrip(), or throws TripFileError.
export async function readTripFile(file) {
  if (file.size > LIMITS.file) throw new TripFileError('tooLarge');
  await checkFreeSpace(file.size);

  const { default: JSZip } = await import('jszip');
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (error) {
    throw new TripFileError('notTripFile', 'not a zip');
  }

  // Only trip.json, the files/ folder and files/<id> may be inside
  let manifestEntry = null;
  const fileEntries = new Map();
  const unexpected = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    const match = path.match(FILE_ENTRY);
    if (path === 'trip.json' && !entry.dir) manifestEntry = entry;
    else if (path === 'files/' && entry.dir) continue;
    else if (match && !entry.dir) fileEntries.set(match[1].toLowerCase(), entry);
    else unexpected.push(path);
  }
  if (!manifestEntry) throw new TripFileError('notTripFile', 'no trip.json');

  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(await readLimited(manifestEntry, LIMITS.manifest)));
  } catch (error) {
    if (error instanceof TripFileError) throw error;
    throw new TripFileError('damaged', 'trip.json is not readable');
  }
  if (!manifest || manifest.app !== 'lagio') throw new TripFileError('notTripFile', 'not made by Lagio');
  if (!Number.isInteger(manifest.formatVersion) || manifest.formatVersion < 1) {
    throw new TripFileError('damaged', 'formatVersion');
  }
  if (manifest.formatVersion > FORMAT_VERSION) throw new TripFileError('newerVersion');
  if (unexpected.length) throw new TripFileError('damaged', 'unexpected entry ' + unexpected[0]);
  checkManifest(manifest);

  // Every listed file must be inside, with exactly the listed size
  const blobs = new Map();
  let totalSize = 0;
  for (const info of manifest.files) {
    const entry = fileEntries.get(info.id.toLowerCase());
    if (!entry) throw new TripFileError('damaged', 'missing file ' + info.id);
    const bytes = await readLimited(entry, LIMITS.entry);
    if (bytes.length !== info.size) throw new TripFileError('damaged', 'size mismatch ' + info.id);
    totalSize += bytes.length;
    if (totalSize > LIMITS.file) throw new TripFileError('tooLarge');
    blobs.set(info.id, new Blob([bytes], { type: info.type || 'application/octet-stream' }));
    fileEntries.delete(info.id.toLowerCase());
  }
  if (fileEntries.size) throw new TripFileError('damaged', 'file not listed in trip.json');

  return {
    manifest,
    trip: manifest.records.trips[0],
    bookingCount: (manifest.records.bookings || []).length,
    documentCount: (manifest.records.documents || []).length,
    totalSize,
    blobs
  };
}

// 'exists' when this trip is on the phone (not deleted), otherwise 'new'
export async function importStatus(bundle) {
  return (await get('trips', bundle.manifest.tripId)) ? 'exists' : 'new';
}

// ---------- import: saving ----------

// Saves a checked bundle. mode:
//   'replace'  the trip keeps its ids; the phone's version becomes the file's
//              (records on the phone that are not in the file are deleted).
//              Also used for a trip that is new or was deleted on this phone.
//   'copy'     every record and file gets a new id; links are remapped;
//              the trip is renamed to copyName
// Everything is saved in one transaction. Returns the trip's id.
export async function importTrip(bundle, mode, { copyName } = {}) {
  const { manifest, blobs } = bundle;
  const time = new Date().toISOString();
  const put = {};
  const softDeletes = {};
  const add = (store, record) => { (put[store] = put[store] || []).push(record); };
  let tripId = manifest.tripId;

  if (mode === 'copy') {
    // New id for every record and file. Any value equal to an old id is a
    // link (tripId, bookingId, fileId, …) and gets the new id too, so record
    // types added later are remapped without changing this code.
    const ids = new Map();
    for (const records of Object.values(manifest.records)) records.forEach((r) => ids.set(r.id, newId()));
    manifest.files.forEach((f) => ids.set(f.id, newId()));
    const remap = (value) => {
      if (typeof value === 'string') return ids.has(value) ? ids.get(value) : value;
      if (Array.isArray(value)) return value.map(remap);
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, remap(inner)]));
      }
      return value;
    };
    const asNew = (record) => ({ ...remap(record), createdAt: time, updatedAt: time, deletedAt: null, version: 1 });
    for (const [store, records] of Object.entries(manifest.records)) records.forEach((r) => add(store, asNew(r)));
    manifest.files.forEach((f) => add('files', { ...asNew(f), blob: blobs.get(f.id) }));
    tripId = ids.get(manifest.tripId);
    if (copyName) put.trips[0].name = copyName;
  } else {
    // Replace: versions go above the phone's own, so a future sync sees the
    // import as the newest change
    for (const store of [...EXPORTED_STORES, 'files']) {
      const existing = await list(store, { tripId, includeDeleted: true });
      if (store === 'trips') {
        const own = await get('trips', tripId, { includeDeleted: true });
        if (own && !existing.some((r) => r.id === own.id)) existing.push(own);
      }
      const versions = new Map(existing.map((r) => [r.id, r.version || 0]));
      const incoming = store === 'files' ? manifest.files : (manifest.records[store] || []);
      const incomingIds = new Set(incoming.map((r) => r.id));
      for (const r of incoming) {
        const record = { ...r, deletedAt: null, updatedAt: time, version: Math.max(versions.get(r.id) || 0, r.version || 0) + 1 };
        add(store, store === 'files' ? { ...record, blob: blobs.get(r.id) } : record);
      }
      const gone = existing.filter((r) => !r.deletedAt && !incomingIds.has(r.id)).map((r) => r.id);
      if (gone.length) softDeletes[store] = gone;
    }
  }

  await importBundle({ put, softDeletes });
  requestPersistentStorage();
  // The file it came from is a backup, so no reminder for this trip yet
  await markExported(tripId);
  return tripId;
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

// "Later" on the reminder: hide it until the trip changes again
export function dismissBackupReminder(tripId) {
  return setSetting('backupDismissed:' + tripId, new Date().toISOString());
}

// Should the trip's dashboard remind the user to make a backup?
// Yes when the trip has bookings or documents (something worth keeping) and
// something changed since the last export (or it was never exported) and
// since the user last tapped "Later". "Changed" = any record of the trip
// added, edited or deleted after that moment (from the records' updatedAt).
export async function backupStatus(tripId) {
  let lastChange = '';
  let hasContent = false;
  for (const store of [...EXPORTED_STORES, 'files']) {
    const records = await list(store, { tripId, includeDeleted: true });
    for (const record of records) {
      if (record.updatedAt > lastChange) lastChange = record.updatedAt;
    }
    if ((store === 'bookings' || store === 'documents') && records.some((r) => !r.deletedAt)) hasContent = true;
  }
  const trip = await get('trips', tripId, { includeDeleted: true });
  if (trip && trip.updatedAt > lastChange) lastChange = trip.updatedAt;

  const lastExport = await lastExportedAt(tripId);
  const dismissed = await getSetting('backupDismissed:' + tripId, null);
  const needed = hasContent &&
    (!lastExport || lastChange > lastExport) &&
    (!dismissed || lastChange > dismissed);
  return { needed, lastExport, lastChange };
}
