# Tests: milestone 2, Trips

Run on a phone (or DevTools at 360 px wide). ✔ = passed in headless Edge on
2026-11-16 (fresh profile, plus a profile with 0.1.0 data).

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Home with no trips → **Sukurti kelionę**. Name "Roma su draugais", places Roma and Florencija, dates in about two weeks, colour Saulėlydis → **Sukurti kelionę**. | The trip's screen opens: orange header, "Roma, Florencija", "lapkričio 28 d. – gruodžio 4 d.", "Iki kelionės liko 12 dienų", five tiles marked "Netrukus". Phone Back goes to Home, not to the form. | ✔ |
| 2 | New trip: save with an empty name. Then only an end date. Then an end date before the start. | "Įrašykite kelionės pavadinimą." with the cursor in the name field; "Nurodykite ir pradžios datą."; "Pabaiga negali būti anksčiau už pradžią." Start and end fields stay level while an error shows. Nothing is saved. | ✔ |
| 3 | Places: type "Roma" + Enter, then "roma" + Enter, then type "Siena" and tap Save without pressing Add. | Roma appears once; Siena is saved too. A chip's × removes it. | ✔ |
| 4 | Create trips: one without dates, one that started 2 days ago and ends in 4, one that ended in the past, one starting tomorrow. | Home groups them: "Dabar ir netrukus" (active first, then soonest), "Be datų", "Praėjusios". Badges: "Vyksta dabar", "Rytoj", "Po 12 dienų", "Be datų", "Baigėsi". Dashboards: "Diena 3 iš 7", "Kelionė prasideda rytoj!", "Kelionė baigėsi", "Datos dar nenustatytos" + **Pridėti datas**. | ✔ |
| 5 | Trip → **⋯** → Redaguoti, change the name, Save. Then ⋯ → Sukurti kopiją. | The form is filled in; the new name shows. The copy opens as "… (kopija)" with the message "Sukurta kopija", without dates ("Datos dar nenustatytos"), and is listed under "Be datų". | ✔ |
| 6 | ⋯ → Perkelti į archyvą → **Grąžinti** in the message. Archive again, open "Archyvas (1)" at the bottom of Home, tap **Grąžinti**. | The trip leaves Home and comes back with Undo. The archive lists it with the "Archyve" badge; Restore puts it back on Home. | ✔ |
| 7 | ⋯ → Ištrinti → Atšaukti. Then ⋯ → Ištrinti → Ištrinti → **Grąžinti**. Then delete again and reload. | Cancel keeps it. Delete asks first, goes to Home with "Kelionė ištrinta · Grąžinti"; Undo brings it back; after a real delete and reload it stays gone and its old address shows "Kelionė nerasta". | ✔ |
| 8 | Switch to **EN** on Home, a dashboard and the form. | "Now and upcoming", "In 12 days", "Day 3 of 7", "20–27 December", "Enter a name for the trip.", "EUR · Euro". | ✔ |
| 9 | Airplane mode: open Lagio, create a trip, open the archive. | Everything works without network. | ✔ |
| 10 | Open Lagio on a phone that had 0.1.0. | "Yra nauja Lagio versija" → Atnaujinti. Language choice kept; nothing breaks. | ✔ |
| 11 | All screens at 360 px, and the console. | No sideways scrolling; every button at least 44 px; no errors or warnings. | ✔ |

Checked in code: stage on the first and last day (Day 1 of 8, Day 8 of 8), the
day after the end, across the March summer-time change; Lithuanian plurals
(Po 2 dienų, Po 21 dienos, 21 diena, 22 dienos, 30 dienų); date ranges within a
month, across months, across years and in another year.

Not applicable yet: export round trip (milestone 4).
