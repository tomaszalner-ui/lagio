// db.js — the ONLY file that talks to IndexedDB.
//
// IndexedDB is a database built into the browser. It keeps records and whole
// files (PDFs, photos) on this device, so everything works offline.
// It is organised in "stores" (like tables). Every other file in the app calls
// the functions below instead of using IndexedDB directly.

const DB_NAME = 'lagio';

// Raise this number when stores or indexes change, and add a step to migrate().
const DB_VERSION = 1;

// All stores of the v1 data model. Created up front so later milestones
// do not need a database upgrade just to add a store.
export const STORES = [
  'trips',
  'days',
  'itineraryItems',
  'bookings',
  'documents',
  'checklistItems',
  'expenses',
  'notes',
  'settings',
  'files' // file contents (PDFs, images) as Blobs, see putFile()
];

// Fields that db.js manages itself. update() ignores them in `changes`.
const BASE_FIELDS = ['id', 'tripId', 'createdAt', 'updatedAt', 'deletedAt', 'version'];

let dbPromise = null;

// Opens the database once and reuses it.
export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in self)) {
        reject(new Error('IndexedDB is not available'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Runs only when the database is new or DB_VERSION went up
      request.onupgradeneeded = (event) => {
        migrate(request.result, event.oldVersion, request.transaction);
      };

      request.onsuccess = () => {
        const db = request.result;
        // A newer Lagio opened in another tab wants to upgrade:
        // close our connection and reload so both tabs run the same version.
        db.onversionchange = () => {
          db.close();
          location.reload();
        };
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

// migrate(): brings an older database up to DB_VERSION, one step at a time.
// A phone that skipped several versions runs every step in order.
// Rule: never delete the user's data in a migration.
function migrate(db, oldVersion, tx) {
  if (oldVersion < 1) {
    for (const name of STORES) {
      const store = db.createObjectStore(name, { keyPath: 'id' });
      // Lets us quickly find every record of one trip
      store.createIndex('tripId', 'tripId');
    }
  }

  // Example of a future step:
  // if (oldVersion < 2) {
  //   tx.objectStore('bookings').createIndex('startAt', 'startAt');
  // }
}

// ---------- small helpers ----------

function now() {
  return new Date().toISOString();
}

// A random unique id. crypto.randomUUID() only exists on https or localhost,
// so there is a fallback for testing from a phone on the home Wi-Fi network.
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Runs `work(store, setResult)` inside one transaction.
// The promise resolves only when the transaction has finished saving.
function withStore(storeName, mode, work) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    let result;
    work(tx.objectStore(storeName), (value) => { result = value; });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  }));
}

// Reads a record, lets `change(record)` return the new fields, saves it.
// Bumps updatedAt and version. Resolves with the saved record.
function modify(storeName, id, change) {
  let missing = false;
  return withStore(storeName, 'readwrite', (store, setResult) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result;
      if (!record) {
        missing = true;
        request.transaction.abort();
        return;
      }
      const saved = {
        ...record,
        ...change(record),
        id: record.id,
        tripId: record.tripId,
        createdAt: record.createdAt,
        updatedAt: now(),
        version: (record.version || 0) + 1
      };
      store.put(saved);
      setResult(saved);
    };
  }).catch((error) => {
    throw missing ? new Error(`Not found: ${storeName}/${id}`) : error;
  });
}

function withoutBaseFields(changes) {
  const clean = { ...changes };
  for (const field of BASE_FIELDS) delete clean[field];
  return clean;
}

// ---------- records ----------

// Saves a new record and adds the base fields:
// id, tripId, createdAt, updatedAt, deletedAt (null) and version (1).
export function create(storeName, data) {
  const time = now();
  const record = {
    ...data,
    id: data.id || newId(),
    tripId: data.tripId ?? null,
    createdAt: time,
    updatedAt: time,
    deletedAt: null,
    version: 1
  };
  return withStore(storeName, 'readwrite', (store, setResult) => {
    store.add(record);
    setResult(record);
  });
}

// One record by id, or null. Soft-deleted records count as missing
// unless { includeDeleted: true } is passed.
export function get(storeName, id, { includeDeleted = false } = {}) {
  return withStore(storeName, 'readonly', (store, setResult) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result || null;
      setResult(record && record.deletedAt && !includeDeleted ? null : record);
    };
  });
}

// All records of a store, or only one trip's records with { tripId }.
export function list(storeName, { tripId, includeDeleted = false } = {}) {
  return withStore(storeName, 'readonly', (store, setResult) => {
    const request = tripId === undefined
      ? store.getAll()
      : store.index('tripId').getAll(tripId);
    request.onsuccess = () => {
      setResult(includeDeleted ? request.result : request.result.filter((r) => !r.deletedAt));
    };
  });
}

// Changes some fields of a record. Base fields cannot be changed here.
export function update(storeName, id, changes) {
  return modify(storeName, id, () => withoutBaseFields(changes));
}

// Soft delete: the record stays, marked with deletedAt, so undo is possible
// and a future sync can tell other devices it was deleted.
export function softDelete(storeName, id) {
  return modify(storeName, id, () => ({ deletedAt: now() }));
}

// Undo a soft delete.
export function restore(storeName, id) {
  return modify(storeName, id, () => ({ deletedAt: null }));
}

// ---------- import (all or nothing) ----------

// Writes a whole imported trip in ONE transaction across all stores: if any
// part fails (even "the phone is full"), nothing at all is saved.
//   put:         { storeName: [complete records…] }  saved exactly as given
//   softDeletes: { storeName: [ids…] }               marked deleted
// Used only by transfer.js, which checks and prepares the records first.
export function importBundle({ put = {}, softDeletes = {} }) {
  const names = [...new Set([...Object.keys(put), ...Object.keys(softDeletes)])];
  for (const name of names) {
    if (!STORES.includes(name)) return Promise.reject(new Error('Unknown store: ' + name));
  }
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    const time = now();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Import aborted'));
    try {
      for (const [name, records] of Object.entries(put)) {
        const store = tx.objectStore(name);
        for (const record of records) store.put(record);
      }
      for (const [name, ids] of Object.entries(softDeletes)) {
        const store = tx.objectStore(name);
        for (const id of ids) {
          const request = store.get(id);
          request.onsuccess = () => {
            const record = request.result;
            if (record && !record.deletedAt) {
              store.put({ ...record, deletedAt: time, updatedAt: time, version: (record.version || 0) + 1 });
            }
          };
        }
      }
    } catch (error) {
      // A record that cannot be saved: undo everything written so far
      tx.abort();
      reject(error);
    }
  }));
}

// ---------- files (PDFs, images) ----------

// Saves a file (a Blob or a File from <input type="file">) for a trip.
// Resolves with the file's record without the content.
export async function putFile(tripId, blob, { name } = {}) {
  const record = await create('files', {
    tripId,
    name: name || blob.name || '',
    type: blob.type || 'application/octet-stream',
    size: blob.size,
    blob
  });
  const { blob: _content, ...info } = record;
  return info;
}

// The file's record including `blob`, or null.
export function getFile(id, options) {
  return get('files', id, options);
}

// Frees the space of a deleted file: removes its content but keeps the small
// record (with deletedAt), so a future sync still knows it was deleted.
export function dropFileContent(id) {
  return modify('files', id, () => ({ blob: null, contentRemovedAt: now() }));
}

// ---------- settings ----------
// Settings are records too (id = the setting's name, tripId = null).

export async function getSetting(key, fallback = null) {
  const record = await get('settings', key);
  return record ? record.value : fallback;
}

export async function setSetting(key, value) {
  const existing = await get('settings', key, { includeDeleted: true });
  return existing
    ? modify('settings', key, () => ({ value, deletedAt: null }))
    : create('settings', { id: key, value });
}

// ---------- storage ----------

// Asks the browser to keep our data even when the phone runs low on space.
// Without this, a browser may quietly clear saved PDFs. Returns true or false.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return (await navigator.storage.persisted()) || (await navigator.storage.persist());
    }
  } catch (error) {
    // Not supported: nothing to do
  }
  return false;
}
