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
| 9 | Reload, then airplane mode: open the trip's documents and both files. | Everything is still there and opens without network. | ✔ (headless) · Phone (installed app) |
| 10 | Delete the trip. | Its documents and files are deleted with it (and come back with Undo). | ✔ |
| 11 | EN, 360 px, console. | "Documents", "1 kB · added 16 November", "Space used: 21 MB"; no sideways scrolling; no errors. | ✔ |

Checked in code: sizes (1 kB, 47 kB, 1 MB, 3,4 MB, 21 MB); Lithuanian plurals
(Pridėtas 1 dokumentas, Pridėti 2 dokumentai, Pridėta 10 dokumentų, Pridėtas 21 dokumentas).

Known: a deleted document's file stays in storage (so Undo works) until a
clean-up is added. Planned for step 3c.
