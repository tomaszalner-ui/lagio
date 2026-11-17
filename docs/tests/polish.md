# Tests: milestone 8, Polish

## Step 8c: Kas naujo, tile counts, one-line back link, Today times (version 0.8.2)

✔ = passed in headless Edge on 2026-11-17. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | A brand-new phone (no trips) opens Home. | No "updated" strip; the version is marked as seen; at the bottom "Lagio 0.8.2 · Kas naujo" (a link). | ✔ |
| 2 | A phone with trips that last saw 0.8.1 opens Home. | A slim blue strip "Lagio atnaujinta į 0.8.2 – kas naujo?" with ✕. | ✔ |
| 3 | Tap the strip; then go back to Home. | "Kas naujo": 11 versions, newest first, 0.8.2 framed, each with a date and a plain text (no raw keys); the strip is gone for good. ✕ does the same. | ✔ |
| 4 | Trip screen. | Tiles: "Bilietai ir rezervacijos · 2 rezervacijos", "Kelionės planas · 3 įrašai" (shown only when above 0), next to the packing, spending and notes badges. | ✔ |
| 5 | "Šiandien" with an item 09:00–11:30 and one 23:00–00:30. | The card shows "09:00–11:30" and "23:00–00:30 (+1)" like the plan, Kitas and dimming still work. | ✔ |
| 6 | Any trip screen of a trip with a long name. | The "‹ trip name" link at the top is one line, cut with "…"; no sideways scrolling. | ✔ |
| 7 | Edit a trip → Valiuta. | Hint: "Naujų išlaidų valiuta pagal nutylėjimą. Sumos ir biudžetas skaičiuojami eurais." | ✔ |
| 8 | EN. | "What's new", "Version 0.8.2", English texts; tiles "2 bookings", "3 items". | ✔ |
| 9 | Phone: after this update arrives, open Lagio. | The strip appears once; Kas naujo reads well. | Phone |

## Fix 0.8.3: the strip stays after "Kas naujo"

Reported on the phone with 0.8.2: after reading Kas naujo and going back, the strip was still on Home. Not reproduced in headless Edge; most likely Home re-read the setting before the save had finished. Now the "seen" state is kept in memory at once, and tapping the strip hides it immediately.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Production mode ([::1]), a trip, last seen 0.8.2. Tap the strip and go Back at once; the footer link and Back; ✕; reload. | The strip shows once ("Lagio 0.8.3"), then never again after any of these. Kas naujo starts with the 0.8.3 fix. | ✔ |
| 2 | Phone: after this update, tap the strip, read, go back; close and reopen Lagio. | The strip is gone and stays gone. | Phone |
