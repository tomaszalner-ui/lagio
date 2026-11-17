// crypto.js — locks a file with a password, using the browser's own
// encryption (Web Crypto). Works offline; nothing is sent anywhere.
//
// How: the password is stretched into a key with PBKDF2 (600 000 rounds of
// SHA-256 — slow on purpose, so guessing passwords takes ages). The key
// encrypts the file with AES-GCM, which also notices a wrong password or a
// changed byte. The file is encrypted in 4 MB pieces, so big trips are
// handled piece by piece instead of as one huge block.
//
// A locked file:
//   "LAGIO-LOCKED\n"            13 bytes, so the app recognises it
//   header length               4 bytes
//   header (JSON)               { v, iterations, salt, iv, chunkSize, size, chunks }
//   piece 1, piece 2, …         each = encrypted piece + 16-byte check
// Each piece has its own IV (iv + piece number) and is tied to the header
// and its number, so pieces cannot be swapped, dropped or reused.

const MAGIC = new TextEncoder().encode('LAGIO-LOCKED\n');
const ITERATIONS = 600000;
const CHUNK = 4 * 1024 * 1024;
const TAG = 16; // AES-GCM check bytes per piece

// Problems: 'wrongPassword' (or a damaged first piece — AES-GCM cannot tell
// the two apart) and 'damaged'
export class LockError extends Error {
  constructor(code, detail = '') {
    super(code + (detail ? ': ' + detail : ''));
    this.name = 'LockError';
    this.code = code;
  }
}

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function uint32(n) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, n);
  return bytes;
}

async function makeKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// The IV of piece n: the file's 8 random bytes + n
function pieceIv(iv8, n) {
  const iv = new Uint8Array(12);
  iv.set(iv8);
  iv.set(uint32(n), 8);
  return iv;
}

// The extra data each piece is tied to: the header + the piece number
function pieceData(headerBytes, n) {
  const data = new Uint8Array(headerBytes.length + 4);
  data.set(headerBytes);
  data.set(uint32(n), headerBytes.length);
  return data;
}

// True when the file starts with the "locked" mark
export async function isLocked(blob) {
  if (blob.size < MAGIC.length) return false;
  const start = new Uint8Array(await blob.slice(0, MAGIC.length).arrayBuffer());
  return start.every((byte, i) => byte === MAGIC[i]);
}

// Returns the locked file content as a Blob
export async function lock(blob, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv8 = crypto.getRandomValues(new Uint8Array(8));
  const chunks = Math.ceil(blob.size / CHUNK);
  const header = { v: 1, iterations: ITERATIONS, salt: toBase64(salt), iv: toBase64(iv8), chunkSize: CHUNK, size: blob.size, chunks };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const key = await makeKey(password, salt, ITERATIONS);

  const parts = [MAGIC, uint32(headerBytes.length), headerBytes];
  for (let n = 0; n < chunks; n += 1) {
    const plain = await blob.slice(n * CHUNK, (n + 1) * CHUNK).arrayBuffer();
    parts.push(new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: pieceIv(iv8, n), additionalData: pieceData(headerBytes, n) }, key, plain
    )));
  }
  return new Blob(parts, { type: 'application/octet-stream' });
}

// Reads the header and checks it makes sense before any heavy work
async function readHeader(blob) {
  const fail = (why) => { throw new LockError('damaged', why); };
  if (!(await isLocked(blob))) fail('not locked');
  const lengthBytes = new Uint8Array(await blob.slice(MAGIC.length, MAGIC.length + 4).arrayBuffer());
  if (lengthBytes.length < 4) fail('too short');
  const length = new DataView(lengthBytes.buffer).getUint32(0);
  if (length < 2 || length > 4096) fail('header length');
  const start = MAGIC.length + 4;
  const headerBytes = new Uint8Array(await blob.slice(start, start + length).arrayBuffer());
  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(headerBytes));
  } catch (error) {
    fail('header');
  }
  const { v, iterations, chunkSize, size, chunks } = header || {};
  if (v !== 1) fail('version');
  // Limits, so a crafted file cannot make the phone work for hours
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 5000000) fail('iterations');
  if (!Number.isInteger(chunkSize) || chunkSize < 65536 || chunkSize > 16 * 1024 * 1024) fail('chunkSize');
  if (!Number.isInteger(size) || size < 0 || chunks !== Math.ceil(size / chunkSize)) fail('size');
  if (blob.size !== start + length + size + chunks * TAG) fail('file length');
  let salt;
  let iv8;
  try {
    salt = fromBase64(header.salt);
    iv8 = fromBase64(header.iv);
  } catch (error) {
    fail('salt or iv');
  }
  if (salt.length !== 16 || iv8.length !== 8) fail('salt or iv');
  return { header, headerBytes, salt, iv8, dataStart: start + length };
}

// Returns the original file content as a Blob, or throws LockError
export async function unlock(blob, password) {
  const { header, headerBytes, salt, iv8, dataStart } = await readHeader(blob);
  const key = await makeKey(password, salt, header.iterations);
  const parts = [];
  let offset = dataStart;
  for (let n = 0; n < header.chunks; n += 1) {
    const plainLength = Math.min(header.chunkSize, header.size - n * header.chunkSize);
    const piece = await blob.slice(offset, offset + plainLength + TAG).arrayBuffer();
    offset += plainLength + TAG;
    try {
      parts.push(new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: pieceIv(iv8, n), additionalData: pieceData(headerBytes, n) }, key, piece
      )));
    } catch (error) {
      throw new LockError(n === 0 ? 'wrongPassword' : 'damaged', 'piece ' + n);
    }
  }
  return new Blob(parts, { type: 'application/zip' });
}
