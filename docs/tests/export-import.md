# Tests: milestone 4, Trip file export and import

## Step 4a: export (version 0.4.0)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Trip → **⋯** → **Eksportuoti kelionę**. | "Ruošiamas failas…", then "Failas paruoštas": „Roma-su-draugais-2026-11-16.lagio“ (4 kB) with Uždaryti, Atsisiųsti and (where the phone can share it) Bendrinti. | ✔ |
| 2 | Open the file (any zip tool). | `trip.json` plus `files/<id>` for each attached PDF or photo; `app: "lagio"`, `formatVersion: 1`, `appVersion: "0.4.0"`. | ✔ |
| 3 | Check what is inside. | The trip, its bookings and documents; each file byte for byte the same as in the app. Not inside: deleted documents, deleted bookings, other trips. | ✔ |
| 4 | **Atsisiųsti**. | The file is saved; message "Failas „…“ išsaugotas atsisiuntimuose"; the export is remembered (for the backup reminder in 4c). | ✔ |
| 5 | A trip with a 21 MB PDF. | Exports in well under a second (files are stored, not recompressed); the file is about 21 MB. | ✔ |
| 6 | Airplane mode: export and download. | Works (JSZip is part of the offline copy). | ✔ |
| 7 | File names. | Spaces become "-", characters phones refuse are removed, Lithuanian letters stay: "Šiaurės-pašvaistė-…-2026-11-16.lagio"; a trip without a name gives "Lagio-….lagio". | ✔ |
| 8 | EN, 360 px. | "Export trip", "File ready", "Download", "Share"; the dialog fits without sideways scrolling. | ✔ |
| 9 | iPhone: **Bendrinti** → Messenger / Mail / Files. Android: **Atsisiųsti** → the file appears in Downloads and can be sent from there. | As described. | Phone |

## Step 4b: import, and PDF.js in its own cache (version 0.4.1)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Home → **Importuoti kelionę**. | The picker offers .lagio and .zip files (accept = `.lagio,.zip,application/zip,application/octet-stream`). | ✔ · Phone (Android: .lagio file not greyed out) |
| 2 | Export a trip (bookings, ticket on a booking, other document), delete it, import the file. | Summary "Importuoti kelionę? Roma · gruodžio 20–27 d. · 2 rezervacijos · 2 dokumentai · 5 kB · Eksportuota lapkričio 16 d." → **Importuoti** → the trip opens, "Kelionė importuota". Same ids; the ticket is on its flight (📎 1); PDF bytes identical; a document deleted before export stays deleted; other trips untouched. | ✔ |
| 3 | Import the same file while the trip is on the phone → **Pridėti kaip kopiją**. | Text "Ši kelionė jau yra šiame telefone…"; "Roma (kopija)" appears. Every record and file has a new id; links (tripId, bookingId, fileId) point to the copy; deleting the copy leaves the original. | ✔ |
| 4 | Rename the trip and add a booking, then import with **Pakeisti esamą**. | The file's name comes back; the added booking is deleted; version numbers go up. | ✔ |
| 5 | Files that must be refused: plain text, zip without trip.json, `app` not "lagio", newer `formatVersion`, missing attached file, extra entry (`../../evil.txt`), size mismatch, document pointing to a missing booking, record of another trip, 11 MB trip.json packed into 17 kB (zip bomb), file over 400 MB. | "Tai ne Lagio kelionės failas." / "Šis failas sukurtas naujesne Lagio versija…" / "Kelionės failas sugadintas arba neišsamus…" / "Failas per didelis…". The database is exactly unchanged. | ✔ |
| 6 | All or nothing: an import where one record cannot be saved. | Refused; nothing at all is saved. | ✔ |
| 7 | Cancel in the summary. | Nothing changes. | ✔ |
| 8 | Airplane mode: import a .lagio file. | Works. | ✔ |
| 9 | EN, 360 px. | "Import this trip?", "2 bookings · 2 documents · 5 kB", "Add as a copy", "Replace"; three buttons wrap without sideways scrolling. | ✔ |
| 10 | Update from 0.4.0 to 0.4.1. | PDF.js is downloaded once more into `lagio-pdfjs-6.5.438` (184 files); the app's files go into `lagio-v0.4.1` (53); the old cache is deleted. | ✔ |
| 11 | A later release (simulated 0.4.2). | **No** PDF.js file is requested again (54 requests, 0 for PDF.js); `lagio-pdfjs-6.5.438` is kept; PDFs still open offline. | ✔ |
| 12 | Phone: import the file exported in 4a (from Downloads, Files, Messenger…). | As in 2–3. | Phone |

Phone test by the owner on 2026-11-16 (version 0.4.1): export, import (file picker, copy, replace) and offline tickets work.

## Step 4c: backup reminder (version 0.4.2)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | A trip with no bookings or documents. | No reminder. | ✔ |
| 2 | Add the first booking, open the trip. | A slim strip (52 px) under the stage card: shield, "Atsarginės kopijos dar nėra.", **Eksportuoti**, ✕. No sideways scrolling. | ✔ |
| 3 | Tap ✕, reopen the trip. | Gone, and stays gone. | ✔ |
| 4 | Change something in the trip (e.g. rename a booking), reopen. | The strip is back. | ✔ |
| 5 | **Eksportuoti** → Atsisiųsti. | The export box opens; after the download the strip is gone. | ✔ |
| 6 | Change something after the export. | "Pakeista po kopijos (lapkričio 16 d.)." | ✔ |
| 7 | A trip happening now, with a booking. | The strip shows (until exported or ✕). | ✔ |
| 8 | A finished trip; an archived trip. | No strip. | ✔ |
| 9 | Import a trip file. | No strip for the imported trip (the file is its backup). | ✔ |
| 10 | EN; airplane mode. | "No backup yet." / "Changed since the backup (16 November)."; strip and export work offline. | ✔ |
| 11 | Phone: is it noticeable but not annoying? | Owner's judgement. | Phone |

Phone test by the owner on 2026-11-16 (version 0.4.2): the backup reminder works and is not annoying.
