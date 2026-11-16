# Tests: milestone 5, Packing checklist

## Step 5a: the list (version 0.5.0)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Trip → tile **Daiktų sąrašas**. | The tile is a link; the screen shows "Naujas daiktas" (name + category + Pridėti) and "Sąrašas tuščias". | ✔ |
| 2 | Tap Pridėti with an empty name. | "Įrašykite daikto pavadinimą."; nothing added. | ✔ |
| 3 | Add Pasas (Dokumentai), Marškinėliai and Kojinės (Drabužiai), Įkroviklis (Elektronika). | Grouped by category in a fixed order with counts ("DRABUŽIAI 0/2"); "0 iš 4 sudėta"; after each add the name field is empty and ready for the next item. | ✔ |
| 4 | Tap the row "Pasas" (anywhere on it). | Ticked, struck through; "1 iš 4 sudėta"; the bar fills. | ✔ |
| 5 | Pencil on Kojinės → + + → rename → Išsaugoti. Also try saving an empty name. | The first + gives ×2 (×1 is skipped); saved as "Kojinės (poros) ×3"; empty name is refused. | ✔ |
| 6 | Pencil → Ištrinti → **Grąžinti**. | "Daiktas ištrintas · Grąžinti"; Undo brings it back. | ✔ |
| 7 | **Slėpti sudėtus**, then tick everything. | Packed items disappear; at the end "Viskas sudėta!". | ✔ |
| 8 | Dashboard. | The tile shows "4 / 4" (green when all packed). | ✔ |
| 9 | **Pradėti iš naujo** → Atžymėti viską → **Grąžinti**. | Asks first; "0 iš 4 sudėta" with "Visi daiktai atžymėti · Grąžinti"; Undo ticks them again. | ✔ |
| 10 | Reload; export the trip and import it as a copy. | Everything stays; the copy has the same list (with ×3 and ticks). | ✔ |
| 11 | EN; 360 px; airplane mode. | "Everything is packed!", "Documents 1/1"; no sideways scrolling; ticking and adding work offline. | ✔ |
| 12 | Phone: pack for real with it. | Rows are easy to tap; nothing feels slow. | Phone |

Phone test by the owner on 2026-11-16 (version 0.5.0): adding items works.

## Step 5b: templates (version 0.5.1)

✔ = passed in headless Edge on 2026-11-16. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Empty list → **Pridėti iš šablono**. | "Lagio šablonai": Būtiniausi (25 daiktai, ticked), Paplūdimys (13 daiktų), Miestas (10 daiktų), Žiema (14 daiktų); button "Pridėti (25)". | ✔ |
| 2 | Tick Paplūdimys, then Miestas. | "Pridėti (38)", then "Pridėti (47)": Gertuvė, in both themes, counts once. | ✔ |
| 3 | Add Būtiniausi + Paplūdimys on a 5-day trip. | "Pridėti 38 daiktai · Grąžinti"; Apatiniai ×5, Kojinės ×5, Marškinėliai ×5, Maudymosi kostiumėlis ×2; all 6 categories filled. | ✔ |
| 4 | **Grąžinti**. | All 38 removed again. | ✔ |
| 5 | Apply a template whose items are all already there. | "Visi pasirinktų šablonų daiktai jau yra sąraše."; "Pridėti (0)" is greyed out. | ✔ |
| 6 | 10-day trip; trip without dates. | Per-day items stop at ×7; without dates they get no number. | ✔ |
| 7 | **Išsaugoti šabloną** → name "Mano kelionė". | "Šablone bus 25 daiktai, be pažymėjimų…"; "Šablonas „Mano kelionė“ išsaugotas". | ✔ |
| 8 | Another trip → picker → "Mano šablonai": rename to "Mano slidinėjimas", apply it, then delete it (asks first). | Renamed; applied without ticks (own templates keep the quantities they were saved with); deleted, trip lists unchanged. | ✔ |
| 9 | Duplicate a trip whose list has ticks. | The copy has the whole list, nothing ticked, ×N kept; the original keeps its ticks. | ✔ |
| 10 | EN; airplane mode; 360 px. | "Essentials, Beach, City, Winter", items "Passport or ID card…", "25 items added"; templates work offline; the picker fits without sideways scrolling. | ✔ |
| 11 | Phone: start a real list from templates. | Lithuanian wording reads well; nothing important is missing. | Phone |
