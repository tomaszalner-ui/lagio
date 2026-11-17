// modules/news.js — "Kas naujo": what each version brought.
// The texts live in the language files under news.v<version> (dots become
// underscores: 0.8.2 -> news.v0_8_2). Newest first. Add an entry with every
// release that changes something the user can see.

import { getSetting, setSetting } from '../db.js';
import { APP_VERSION } from '../version.js';

export const NEWS = [
  { version: '0.8.3', date: '2026-11-17' },
  { version: '0.8.2', date: '2026-11-17' },
  { version: '0.8.1', date: '2026-11-17' },
  { version: '0.8.0', date: '2026-11-17' },
  { version: '0.7.1', date: '2026-11-17' },
  { version: '0.7.0', date: '2026-11-17' },
  { version: '0.6', date: '2026-11-17' },
  { version: '0.5', date: '2026-11-16' },
  { version: '0.4', date: '2026-11-16' },
  { version: '0.3', date: '2026-11-16' },
  { version: '0.2', date: '2026-11-16' },
  { version: '0.1', date: '2026-11-16' }
];

// The text key of a version's news
export const newsKey = (version) => 'news.v' + version.replace(/\./g, '_');

// Set the moment the news is seen, so Home never shows the strip again in
// this session, even if saving the setting has not finished yet
let seenNow = false;

// Should Home show the one-time "updated — what's new?" strip?
// Only after an update to a version that has news. Someone who just installed
// the app (no trips yet) has nothing to compare with, so it is marked seen.
export async function shouldShowNews(hasTrips) {
  if (seenNow) return false;
  const seen = await getSetting('newsSeen');
  if (seenNow) return false; // seen while we were reading
  if (seen === APP_VERSION) return false;
  if (!seen && !hasTrips) {
    await setSetting('newsSeen', APP_VERSION);
    return false;
  }
  return NEWS[0].version === APP_VERSION;
}

export function markNewsSeen() {
  seenNow = true;
  return setSetting('newsSeen', APP_VERSION);
}
