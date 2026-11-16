# Lagio

Lagio (from Lithuanian *lagaminas*, suitcase) is a Lithuanian-first travel organizer
that runs in the phone's browser and can be installed like an app (PWA).
Everything for a trip in one place: itinerary, bookings, ticket PDFs, packing list,
spending and notes. All data stays on the device and works offline.

Status: milestones 1–4 (Foundation, Trips, Bookings and documents, Trip file export/import) done; working on 5 (Packing checklist).

## Run it on your computer

Service workers (the offline part) only run on `localhost` or `https`, so open the app
through a small local server, not by double-clicking `index.html`.

**Option A, VS Code:** install the "Live Server" extension, right-click `index.html` →
*Open with Live Server*.

**Option B, Node (already installed):** in the `lagio` folder run

```
node tools/serve.mjs
```

and open http://localhost:8080. Press Ctrl+C to stop it.

On localhost the app always loads your newest files first, so you see changes after a
normal reload. The published site uses its saved copy first, for speed and offline use.

## Before every commit

```
node tools/check.mjs
```

It checks that both language files have the same keys, that no text is written directly
in screen code, that `sw.js` lists every file for offline use, and that only `js/db.js`
touches IndexedDB. Then go through the checklist in `CLAUDE.md`.
Manual test cases are in `docs/tests/`.

## Publish a new version

1. Run `node tools/update-sw.mjs <new version>` and add a line to `CHANGELOG.md`.
2. Commit and push to `main`. GitHub Pages publishes it in a minute or two:
   https://tomaszalner-ui.github.io/lagio/
3. Open the site on the phone: a "new version available" banner appears. Tap *Update*.

## Folders

```
index.html  manifest.json  sw.js   app page, install info, offline worker
js/         app.js (start), db.js (storage), store.js (shared state),
            router.js (#/ addresses), i18n.js (texts, dates, money), pwa.js (updates)
js/modules/ logic per feature (trips, bookings, …), no screen code
js/ui/      screens and shared components
lang/       lt.json, en.json: every visible text
css/  icons/  vendor/ (Preact, htm, JSZip; versions in vendor/README.md)
tools/      serve.mjs (local server), check.mjs (pre-commit checks)
docs/tests/ written test cases per milestone
```
