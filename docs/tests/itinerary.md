# Tests: milestone 6, Itinerary

## Step 6a: days, plan items, bookings on the timeline (version 0.6.0)

✔ = passed in headless Edge on 2026-11-17. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Trip 20–24 Dec with a flight (20 Dec 06:10), a stay (20 Dec 15:00 → 24 Dec 11:00), a train (22 Dec 09:00), a booking without a date, one on 26 Dec. Open tile **Kelionės planas**. | 5 day cards "Gruodžio 20 d., sekmadienis · Diena 1" …; day 1: 06:10 Vilnius → Roma (Išvykimas · Ryanair), 15:00 Viešbutis (Įsiregistravimas); day 3: the train; day 5: 11:00 Viešbutis (Išsiregistravimas). The undated booking is not shown; the 26 Dec one is under "Kitos dienos". | ✔ |
| 2 | Day 2 → **Pridėti**: save empty; then 12:30–10:00. | "Įrašykite pavadinimą."; "Pabaiga negali būti anksčiau už pradžią."; "Iki" is disabled until "Nuo" has a time; the day is preset. | ✔ |
| 3 | Add Koliziejus 10:00–12:30 with address and note; Picerija vakare (Maistas, no time); Pusryčiai 08:00. | Order: 08:00 Pusryčiai, 10:00–12:30 Koliziejus (address, note, map pin), then Picerija. The pin opens a Google Maps search. | ✔ |
| 4 | Tap Picerija → change the day to day 3 → Išsaugoti. | It moves to day 3 (the type stays "Maistas"). | ✔ |
| 5 | Tap Pusryčiai → Ištrinti → **Grąžinti**. | "Įrašas ištrintas · Grąžinti"; Undo brings it back. | ✔ |
| 6 | Tap a booking on the timeline. | The booking opens (with its ticket). | ✔ |
| 7 | Shorten the trip to 20–21 Dec. | Items and bookings of later days (also the hotel check-out) move to "Kitos dienos"; nothing is lost. | ✔ |
| 8 | A trip happening now. | Today's card has a green border and "Šiandien", and the screen opens scrolled to it. | ✔ |
| 9 | A trip without dates. | "Nurodykite kelionės datas" with **Nurodyti datas**. | ✔ |
| 10 | Export the trip; EN; 360 px; airplane mode. | Plan items are in the trip file; "Sunday 20 December · Day 1", "Departure", "Check-out"; no sideways scrolling; works offline. | ✔ |
| 11 | Phone: plan a real day. | Easy to add and read. | Phone |
