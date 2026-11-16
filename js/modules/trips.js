// modules/trips.js — trip logic. Uses only db.js; no screen code and no text.
// Milestone 1 only reads trips. Milestone 2 adds create, edit and delete.

import { list } from '../db.js';

// All trips that are not deleted, newest first.
export async function listTrips() {
  const trips = await list('trips');
  return trips.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
