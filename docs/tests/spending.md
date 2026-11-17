# Tests: milestone 7, Spending

## Step 7a: expenses, categories, totals in EUR (version 0.7.0)

✔ = passed in headless Edge on 2026-11-17. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Trip with travelers, a flight 499,99 € and a hotel 300 USD (bookings). Open tile **Išlaidos**. | "Iš viso išleista 499,99 €", bar Transportas; "Rezervacijos": the flight 499,99 €, the hotel 300,00 USD with "Kita valiuta: kol kas neįskaičiuota į sumą". | ✔ |
| 2 | **Nauja išlaida** → Išsaugoti; then amount "abc". | Currency = the trip's, date = first trip day (today during the trip), "Kas mokėjo" shown; "Įrašykite sumą." + "Pasirinkite kategoriją."; "Įrašykite sumą skaičiais, pvz., 12,50." | ✔ |
| 3 | 12,50 EUR, Maistas, "Picerija", paid by Ieva. | "Išlaida pridėta"; total 512,49 €; the row shows "Mokėjo: Ieva". | ✔ |
| 4 | 20 USD, Transportas, "Taksi" — save without the euro amount, then with 18,40. | "Suma eurais" appears for USD; "Įrašykite sumą eurais."; then "20,00 USD ≈ 18,40 €", total 530,89 €; rate 0.92 saved. | ✔ |
| 5 | 1 500 JPY, 9,20 €, Pirkiniai, on another day. | Grouped by day (newest first) with day totals; bars Transportas / Maistas / Pirkiniai. | ✔ |
| 6 | Tap an expense → change the amount; delete one → **Grąžinti**. | Form filled in; totals update; "Išlaida ištrinta · Grąžinti" and Undo. | ✔ |
| 7 | Dashboard. | The Išlaidos tile shows the total (542,59 €). | ✔ |
| 8 | Export; EN; 360 px; airplane mode. | Expenses (with rateUsed) in the trip file; "Spent in total €542.59"; no sideways scrolling; adding works offline. | ✔ |
| 9 | Phone: add an expense in a few seconds with the number keypad. | Quick enough to do at the till. | Phone |
