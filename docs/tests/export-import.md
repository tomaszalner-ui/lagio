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
