// trip-actions.js — what happens when the user archives, restores,
// duplicates or deletes a trip: change the data (modules/trips.js), reload
// the trip list (store.js), move to the right screen and show a message,
// with Undo where it makes sense. Used by the dashboard and the archive.

import { t } from '../i18n.js';
import { reloadTrips } from '../store.js';
import { navigate, paths } from '../router.js';
import { archiveTrip, unarchiveTrip, duplicateTrip, deleteTrip, undoDeleteTrip } from '../modules/trips.js';
import { showToast } from './toast.js';

// Runs an action; if anything fails, logs it and tells the user
async function attempt(action) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    showToast({ text: t('common.error') });
  }
}

export function archiveWithUndo(trip) {
  return attempt(async () => {
    await archiveTrip(trip.id);
    await reloadTrips();
    navigate(paths.home());
    showToast({
      text: t('toast.archived'),
      actionLabel: t('common.undo'),
      onAction: () => attempt(async () => {
        await unarchiveTrip(trip.id);
        await reloadTrips();
      })
    });
  });
}

export function restoreFromArchive(trip) {
  return attempt(async () => {
    await unarchiveTrip(trip.id);
    await reloadTrips();
    showToast({ text: t('toast.unarchived') });
  });
}

export function duplicate(trip) {
  return attempt(async () => {
    const copy = await duplicateTrip(trip.id, { name: t('trips.copyName', { name: trip.name }) });
    await reloadTrips();
    navigate(paths.trip(copy.id));
    showToast({ text: t('toast.duplicated') });
  });
}

// Called after the user confirmed in the dialog
export function deleteWithUndo(trip) {
  return attempt(async () => {
    const deleted = await deleteTrip(trip.id);
    // Leave the trip's screen first, so it never shows "trip not found"
    navigate(paths.home(), { replace: true });
    await reloadTrips();
    showToast({
      text: t('toast.deleted'),
      actionLabel: t('common.undo'),
      onAction: () => attempt(async () => {
        await undoDeleteTrip(deleted);
        await reloadTrips();
      })
    });
  });
}
