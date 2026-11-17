# Lagio

Lagio (from Lithuanian *lagaminas*, suitcase) is a Lithuanian-first travel organizer that runs as a phone web app (PWA). It keeps everything for a trip in one place: itinerary, bookings, ticket PDFs, packing list, spending and notes. Everything is stored on the device and works offline.

Full plan and decisions: https://claude.ai/artifact/FFVHvmndgw6YtoSiQNHyfN

## About the owner
- Knows basic HTML, CSS and some JavaScript. Explain new ideas (components, state, IndexedDB, service workers) in a sentence or two the first time they come up.
- Prefers small steps: propose the plan, wait for an OK, build, then test together.
- Earlier app built the same way: Mokis (bills PWA on GitHub Pages). Copy and adapt useful parts from it; no shared library.

## Stack
- Preact + htm, **no build step**. Library files are downloaded into `/vendor/` and imported as ES modules. Never load them from a CDN at runtime.
- IndexedDB for all records and files (PDFs, images).
- Service worker + web manifest, so the app works offline and can be installed.
- JSZip for the trip file; Web Crypto (AES-GCM + PBKDF2) for the password lock.
- Hosted on GitHub Pages.

## Run locally
Serve the folder over localhost (service workers need localhost or HTTPS), for example:
- VS Code "Live Server" extension, or
- `node tools/serve.mjs`, then open http://localhost:8080 (Python is not installed on the owner's PC)

On localhost the service worker loads the newest files first; on the published site it uses its saved copy first.
Run `node tools/check.mjs` before every commit (language keys, hard-coded text, offline file list, storage rule).

## Folder map
```
/index.html  /manifest.json  /sw.js  /CHANGELOG.md
/js/          app.js db.js store.js router.js i18n.js pwa.js transfer.js crypto.js
/js/modules/  trips itinerary bookings checklist spending notes (one .js file each)
/js/ui/       screens and shared components (html.js, shell.js, empty-state.js, …)
/lang/        lt.json en.json (flat keys like "home.title"; plurals as {one, few, many, other})
/css/  /icons/  /vendor/ (preact, htm, jszip + README with versions)
/tools/       serve.mjs (local server) check.mjs (pre-commit checks) update-sw.mjs (offline file list + version)
/docs/tests/  written test cases per milestone
```
When adding a file the app loads, run `node tools/update-sw.mjs` (rewrites the `FILES` list in `sw.js`; `node tools/update-sw.mjs 0.3.3` also sets the version).

## Rules that must never break
1. Only `js/db.js` touches IndexedDB. Everything else calls its functions.
2. No visible text in code: always `t('key')`, with the key in both `lang/lt.json` and `lang/en.json`. Lithuanian is the default language.
3. Every record has the base fields `id` (UUID), `tripId`, `createdAt`, `updatedAt`, `deletedAt` (soft delete) and `version`.
4. Every record type and attached file is included in trip export and import.
5. No network calls except the optional exchange-rate fetch. The app must work with the network off.
6. Mobile first: everything works at 360 px wide.
7. Plain, readable code with short comments.

## Workflow
- Skills, if available: `lagio-core` (context), `lagio-feature` (recipe for each feature), `lagio-ship` (checklist before commits and releases).
- For every feature: agree the scope, then data, module logic, screen, LT and EN text, export support, written test cases.
- Before every commit: works offline, no hard-coded text, Lithuanian checked, export then import loses nothing, 360 px layout, no console errors, data from the previous version still opens.
- Commit messages: one line in English saying what the user gets.

## Decisions
Technical decisions made while building (the full list is in the plan doc and the `lagio-core` skill).

| Topic | Decision |
| --- | --- |
| Trip stage | Calculated from the dates each time (`getTripStage`); no saved `status` field |
| Preact version | Stay on 10.x (10.29.8) until 11 has settled; upgrade = swap two vendor files |
| Persistent storage | Requested when the first trip is saved, not at startup (Firefox shows a popup) |
| Shared origin with Mokis | Both apps live on tomaszalner-ui.github.io and share storage. Cache names start with `lagio-`, the service worker only deletes `lagio-` caches, and Lagio never clears storage site-wide. Own domain (lagio.lt) before testers |
| Trip's own tripId | A trip's `tripId` is its own `id`, so one tripId lookup per store finds everything of a trip |
| Duplicating a trip | Copies name, places, colour and currency; no dates |
| Document ↔ booking | Only the document's `bookingId` links them; bookings have no `documentIds[]` |
| Files | PDF or image; ask before adding a file over 20 MB; show space used per trip. File content in `files`, description in `documents` |
| PDF viewer | PDF.js 6.5.438 legacy build in `vendor/pdfjs/` (with cmaps and standard fonts), loaded only when a PDF opens; pages drawn to canvas near the screen; pinch and +/− zoom |
| Deleted files | Content freed on app start once deleted more than 7 days ago (`purgeDeletedFiles`); the record stays with `deletedAt` and `contentRemovedAt` |
| Travel times | Flight, train, bus, ferry may end up to 26 h "before" they start (time zones): a note, not an error. Stays and car rentals stay strict |
| Trip file | `.lagio` zip: `trip.json` (`app`, `formatVersion` 1, `appVersion`, records per store) + `files/<id>` stored uncompressed. Deleted records are left out. Every store except `files`/`settings` must be in `EXPORTED_STORES` (check.mjs) |
| Export flow | Two taps: prepare the file, then Bendrinti (if the phone can share it; iPhone yes, Android Chrome no) or Atsisiųsti. The app version lives in `js/version.js`, written by `update-sw.mjs` |
| Import | File checked fully before saving: only `trip.json` and `files/<uuid>` entries; limits 400 MB per file, 100 MB per attached file, 10 MB for trip.json (read in pieces, so zip bombs stop early). Same trip on the phone: copy (new ids, links remapped, "(kopija)") or replace; otherwise saved with its ids. One transaction (`importBundle`) |
| Offline caches | `lagio-v<version>` for app files; `lagio-pdfjs-<PDF.js version>` for PDF.js, filled only with missing files and kept between releases |
| Backup reminder | Slim strip on the dashboard when the trip has bookings/documents and changed (any record updatedAt) since the last export and since ✕; before and during the trip, never after or when archived. Import counts as a backup |
| Packing list | One list per trip (`listName` "packing"), 6 fixed categories (keys), optional `quantity` ×2–99, `ownerId` null = shared. Steps: 5a list, 5b templates (built-in texts in lang files; own templates in settings), 5c travelers on the trip + per-person lists |
| Packing templates | Built-in: Būtiniausi (pre-ticked), Paplūdimys, Miestas, Žiema; item texts are lang keys, saved as text in the current language; `perDay` = trip days up to 7, ×1 means none. Own templates in setting `packingTemplates` keep the quantities they were saved with. Duplicate copies the list unticked |
| Travelers | Optional `travelers: [{ id, name }]` on the trip; packing items point to one with `ownerId` (null = Bendri). Removing a traveler moves their items to Bendri. Traveler ids only matter inside one trip, so copies keep them. Templates and "already on the list" work per person |
| Itinerary | Plan items store their own `date` (not a dayId), so they keep their real date when the trip's dates change; dates outside the trip show under "Kitos dienos". Day records only for day titles (6b). Bookings appear on the timeline automatically (start, and end for travel/stay/car); no `bookingId` on items. Types: activity, food, transport, note. Timed entries sorted by time; untimed get ↑↓ (6b). A plan item's end time earlier than its start means the next day: allowed, shown "23:00–00:30 (+1)" (`endsNextDay`) |
| Today | During the trip (stage active) the dashboard shows a "Šiandien" card under the stage card: today's timeline; a booking with 1 file gets **Bilietas** (opens the viewer directly, no delete there), with more files a link to the booking. `dayProgress` marks the first entry still to start as **Kitas** and dims ended ones (end time passed; without an end, once the next entry started; past-midnight items never end that day). The clock is re-read when the card opens and when the app returns to the front (visibilitychange, focus, pageshow) |
| Spending | Expenses store amount + currency + amountEur + rateUsed (+ rateSource, rateDate, paidBy); totals always EUR. Categories: transport, accommodation, food, activities, shopping, other. Booking prices count automatically; other currencies get `priceEur` (+ priceRate, priceRateDate) at the rate of the start day, cleared on every booking save so it is converted again. Budget: `trip.budget` { total, byCategory } in euro cents, total empty = categories added up; duplicates copy it. "Kas mokėjo" = expenses only. After the trip the stage card shows the summary |
| Exchange rates | `js/rates.js` is the only network call: `api.frankfurter.dev/v1/<date or latest>?from=XXX&to=EUR` (ECB; future days use latest). Every rate saved in setting `rates` for offline use; offline falls back to the newest saved rate of that currency ("Išsaugotas kursas"), else the user types the euro amount. Typing the euro amount makes it manual; clearing it brings the rate back. check.mjs allows the line marked "allowed network call" only in rates.js |
| Booking types | flight, train, bus, ferry, car, stay, event, other; start/end labels follow the type. Address opens a Google Maps search link (tapped by the user, not fetched) |

## Build order (phase 1)
1. Foundation ✓ (0.1.0, phone-tested 16 Nov 2026)
2. Trips ✓ (0.2.1, phone-tested 16 Nov 2026)
3. Bookings and documents ✓ (0.3.3, phone-tested 16 Nov 2026)
4. Trip file export/import ✓ (0.4.2, phone-tested 16 Nov 2026)
5. Packing checklist ✓ (0.5.2, phone-tested 17 Nov 2026)
6. Itinerary ✓ (0.6.2, phone-tested 17 Nov 2026)
7. Spending  ← current
8. Password lock, notes, polish
9. Real test on the owner's own trip
10. Testers

Update the "current" marker when a milestone is finished.
