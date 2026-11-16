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
