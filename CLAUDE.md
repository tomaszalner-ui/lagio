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
/tools/       serve.mjs (local server) check.mjs (pre-commit checks)
/docs/tests/  written test cases per milestone
```
When adding a file the app loads, also add it to `FILES` in `sw.js`.

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

## Build order (phase 1)
1. Foundation  ← current
2. Trips
3. Bookings and documents
4. Trip file export/import
5. Packing checklist
6. Itinerary
7. Spending
8. Password lock, notes, polish
9. Real test on the owner's own trip
10. Testers

Update the "current" marker when a milestone is finished.
