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
