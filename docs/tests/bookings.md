# Tests: milestone 3, Bookings and documents

## Step 3a: documents (version 0.3.0)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Open a trip → tile **Bilietai ir rezervacijos**. | Screen with the trip's name as the back link, section "Dokumentai", empty state with **Pridėti dokumentą**. | ✔ |
| 2 | **Pridėti dokumentą** → choose a PDF and a photo at once. | Message "Pridėti 2 dokumentai"; two rows with icon, name, size and "pridėta lapkričio 16 d."; "Užimta vieta: …" below. | ✔ |
| 3 | Pridėti dokumentą → take a photo with the camera. | The photo is added like any image. | Phone |
| 4 | Tap the PDF. | Full-screen viewer: name at the top, × to close, buttons Atidaryti naršyklėje · Bendrinti (if the phone can share) · Atsisiųsti · Ištrinti. | ✔ |
| 5 | In the viewer, try each way of opening the PDF. | Note for each: does the preview show inside the app? Does **Atidaryti naršyklėje** open it? Does **Bendrinti** offer a PDF app? Does **Atsisiųsti** save it? | Phone |
| 6 | Tap the photo. | The photo fills the viewer. | ✔ |
| 7 | In the viewer → Ištrinti → Ištrinti → **Grąžinti**. | Asks first; the row disappears with "Dokumentas ištrintas · Grąžinti"; Undo brings it back. | ✔ |
| 8 | Add a file over 20 MB. Cancel, then add it again → Pridėti. | "Didelis failas: Failas „…“ užima 21 MB…". Cancel adds nothing; Pridėti adds it. | ✔ |
| 9 | Reload, then airplane mode: open the trip's documents and both files. | Everything is still there and opens without network. | ✔ (headless) · ✔ phone (photo) |
| 10 | Delete the trip. | Its documents and files are deleted with it (and come back with Undo). | ✔ |
| 11 | EN, 360 px, console. | "Documents", "1 kB · added 16 November", "Space used: 21 MB"; no sideways scrolling; no errors. | ✔ |

Checked in code: sizes (1 kB, 47 kB, 1 MB, 3,4 MB, 21 MB); Lithuanian plurals
(Pridėtas 1 dokumentas, Pridėti 2 dokumentai, Pridėta 10 dokumentų, Pridėtas 21 dokumentas).

Known: a deleted document's file stays in storage (so Undo works) until a
clean-up is added. Planned for step 3c.

## Step 3b: bookings (version 0.3.1)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Trip → Bilietai ir rezervacijos with no bookings. | Section "Rezervacijos" with an empty state and **Nauja rezervacija**; documents below it. | ✔ |
| 2 | New booking: save with an empty title; then only an end date; then an end before the start; then price "abc". | "Įrašykite pavadinimą." (cursor in the field); "Nurodykite ir pradžios datą."; "Pabaiga negali būti anksčiau už pradžią."; "Įrašykite kainą skaičiais, pvz., 49,99." Nothing saved. Time fields stay disabled until a date is chosen. | ✔ |
| 3 | Flight "Vilnius → Roma", 20 Dec 06:10–08:25, Ryanair, ABC123, 49,99 €, address, two-line note → Save. | Booking screen: code box with **Kopijuoti**, Išvykimas / Atvykimas, Teikėjas, "49,99 €", address with **Atidaryti žemėlapyje** (Google Maps search), the note on two lines. | ✔ |
| 4 | Tap **Kopijuoti**, paste somewhere. | "Nukopijuota"; the code is pasted. | Phone |
| 5 | Tap **Atidaryti žemėlapyje**. | The maps app or site opens at the address. | Phone |
| 6 | Change the type in the form: Nakvynė, Automobilio nuoma, Renginys. | Labels change to Įsiregistravimas / Išsiregistravimas, Paėmimas / Grąžinimas, Pradžia / Pabaiga. | ✔ |
| 7 | Add a train on 19 Dec, a stay 20 Dec 15:00 → 27 Dec 11:00, a car on 22 Dec, an event without a date. | Grouped: "Gruodžio 19 d., šeštadienis", "Gruodžio 20 d., sekmadienis" (flight, then stay "15:00 → gruodžio 27 d. 11:00"), "Gruodžio 22 d., antradienis", "Be datos". | ✔ |
| 8 | Open a booking → Redaguoti, change the title, Save. Also open an edit address directly after a reload. | The form is filled in (price "49,99"); the new title shows. | ✔ |
| 9 | Ištrinti → Ištrinti → **Grąžinti**. | Asks first; list shows one fewer with "Rezervacija ištrinta · Grąžinti"; Undo brings it back. | ✔ |
| 10 | Delete the trip. | Its bookings are deleted with it. | ✔ |
| 11 | EN; 360 px; airplane mode; data from 0.3.0. | "Sunday 20 December", "Departure", "20 December 06:10"; no sideways scrolling; list, booking and form work offline; 0.3.0 documents still there. | ✔ |

Checked in code: price parsing ("49,99" and "49.99" → 4999, "1 250" → 125000, "12,345" and "abc" rejected, JPY without cents).

## Fixes from review (version 0.3.2)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

### Fix 1: space of deleted files is freed after 7 days

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1.1 | Delete a document; run the clean-up as if 6 days had passed; tap Undo. | Nothing is freed; the restored document still opens. | ✔ |
| 1.2 | Delete it again; run the clean-up as if 8 days had passed. | Its content is removed (`blob` empty, `contentRemovedAt` set); the record stays with `deletedAt`; `version` goes up. | ✔ |
| 1.3 | The same clean-up with a document that was never deleted. | Untouched; it still opens. A second clean-up frees nothing more. | ✔ |
| 1.4 | A file deleted 10 days ago; open the app. | About 3 seconds after start its content is removed, without slowing the first screen. | ✔ |

### Fix 2: arrival before departure on travel bookings

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 2.1 | Flight 20 Dec 21:00 → 20 Dec 09:00 (Tokyo → Honolulu). | Yellow note "Atvykimas anksčiau nei išvykimas…", no error; it saves; card "21:00–09:00". | ✔ |
| 2.2 | Flight 21 Dec 00:30 → 20 Dec 13:00 (previous calendar day). | The end date can be picked before the start; note shown; it saves. | ✔ |
| 2.3 | Flight arriving 3 days before departure. | Blocked: "Atvykimas negali būti daugiau nei parą anksčiau už išvykimą." | ✔ |
| 2.4 | Ferry exactly 26 hours earlier. | Allowed with the note (26 h is the limit). | ✔ |
| 2.5 | Stay with check-out one minute before check-in. | Blocked; the end date picker does not allow days before the start. | ✔ |

### Fix 3: error texts use the field names

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 3.1 | End before start for stay, car rental, event. | "Išsiregistravimas negali būti anksčiau už įsiregistravimą.", "Grąžinimas negali būti anksčiau už paėmimą.", "Pabaiga negali būti anksčiau už pradžią." | ✔ |
| 3.2 | Only an end date for flight, stay, car rental. | "Nurodykite ir išvykimo datą.", "…įsiregistravimo datą.", "…paėmimo datą." | ✔ |
| 3.3 | The same in English. | "Arrival can't be more than a day before departure.", "Add a check-in date too.", note "Arrival is before departure…" | ✔ |

### Fix 4: PDFs drawn with PDF.js

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 4.1 | Open a 3-page PDF. | All 3 pages, each fitted to the width, labelled "1 psl. iš 3"…; text and colours drawn correctly. | ✔ |
| 4.2 | Tap **+**, then **−**. | Pages redraw larger (344 → 516 px) and back; pages far away are cleared to save memory. | ✔ |
| 4.3 | Pinch with two fingers. | Pages grow while pinching and are redrawn sharp when the fingers lift; the spot under the fingers stays in place; the app's header and buttons do not zoom. | ✔ (simulated touch) · Phone |
| 4.4 | Open a damaged PDF. | "Šio PDF nepavyko parodyti…"; Atidaryti naršyklėje / Bendrinti / Atsisiųsti / Ištrinti still work. | ✔ |
| 4.5 | Airplane mode: open the 3-page PDF. | All pages drawn (PDF.js, its worker and fonts are cached: 232 offline files). | ✔ |
| 4.6 | A real ticket PDF on Android Chrome and/or iPhone Safari, from the installed app. | Every page shows inside Lagio; zoom works; nothing is blank. | Phone |
| 4.7 | Data from 0.3.1. | Updates; its PDF opens with PDF.js. The update banner still appears while the app is open (bigger download). | ✔ |

Phone test by the owner on 2026-11-16 (version 0.3.2): PDF viewing, zoom and the other fixes work.

## Step 3c: documents on bookings (version 0.3.3)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Open a booking with no files. | Section "Bilietai ir dokumentai": "Bilietų dar nėra", hint, **Pridėti bilietą**. | ✔ |
| 2 | **Pridėti bilietą** → a PDF. | "Pridėtas 1 dokumentas"; listed on the booking; it opens with all pages. | ✔ |
| 3 | Back to the list. | The booking's card shows 📎 1 (read aloud as "1 dokumentas"); the ticket is not under "Kiti dokumentai". | ✔ |
| 4 | Add a file under "Kiti dokumentai". | Listed there; "Užimta vieta" counts all the trip's files. | ✔ |
| 5 | Open it → **Perkelti** → choose a booking → then **Grąžinti**. | The sheet lists every booking (not where it already is); "Perkelta: Viešbutis · Grąžinti"; the count moves to that card; Undo moves it back. | ✔ |
| 6 | On a booking, open its ticket → Perkelti → **Kiti dokumentai** → Grąžinti. | The booking shows "Bilietų dar nėra"; Undo brings the ticket back. | ✔ |
| 7 | Delete a booking that has a ticket → Grąžinti. | The booking and its ticket are deleted (other documents stay); Undo brings both back. | ✔ |
| 8 | EN; plurals; 360 px; viewer with 5 buttons. | "Tickets and documents", "Other documents", "1 document"; 1 dokumentas / 2 dokumentai / 10 dokumentų / 21 dokumentas; buttons wrap on two lines without sideways scrolling. | ✔ |
| 9 | Data from 0.3.2; airplane mode. | Earlier files appear under "Kiti dokumentai" and still open; everything works offline. | ✔ |
| 10 | On the phone: attach a real ticket to a booking, move one, open it in airplane mode. | As above. | Phone |
