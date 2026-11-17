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

## Step 7b: exchange rates, budget, who paid, summary after the trip (version 0.7.1)

✔ = passed in headless Edge on 2026-11-17 (the network switched off in the browser for the offline cases).

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Finished trip (2–6 Nov) with travelers, a flight 400 € and a hotel 500 USD. Open **Išlaidos** with internet. | The hotel shows "500,00 USD ≈ 445,79 €" and counts in the total (845,79 €); the booking saved priceEur, priceRate and the rate's date (its start day). | ✔ |
| 2 | **Nauja išlaida**: USD, date 3 Nov, amount 20. | "Suma eurais" fills itself (17,89); hint "Automatinis kursas: 1 USD = 0,8945 € (2026 m. lapkričio 3 d.). Galite pataisyti pagal banko išrašą." Saved as rateSource auto with the rate and its date. | ✔ |
| 3 | Open it again; type 19,00 in "Suma eurais"; change the amount; clear the euro field; type 22,50 and save. | Opens with the saved rate (no new lookup). Typed: "Įrašyta ranka. Ištrynę sumą, naudosite automatinį kursą." and the euro amount no longer follows the amount; cleared: back to the rate; saved as manual. | ✔ |
| 4 | 3 000 JPY. | Rate shown per 100: "100 JPY = 0,5609 €"; 16,83 €. | ✔ |
| 5 | Network off: USD on 3 Nov; then 5 Nov; then GBP (never looked up). | 3 Nov: the saved rate as before. 5 Nov: "Išsaugotas kursas: … , nes nėra interneto". GBP: "Kurso gauti nepavyko (gal nėra interneto?) …"; saving asks for the euro amount; typed amount saves. | ✔ |
| 6 | **Nustatyti biudžetą**: "abc"; then 1 500 total and Maistas 10. | "Įrašykite sumą skaičiais …"; summary "iš 1 500,00 € · liko 606,88 €" with a bar; Maistas "16,83 € iš 10,00 €" in red. | ✔ |
| 7 | Budget with the total empty and Transportas 600. Then **Pašalinti biudžetą** → **Grąžinti**. | Total = categories added up (610 €), and the total box stays empty next time; "viršyta 283,12 €" in red; removed, then back with Undo. | ✔ |
| 8 | Expenses paid by Ieva and with nobody set. | "Kas mokėjo": Tomas 0,00 €, Ieva 22,50 €, Nenurodyta 24,83 € (expenses only). | ✔ |
| 9 | Trip screen of the finished trip. | "Kelionė baigėsi", total, "≈ 178,62 € per dieną", the budget line, the 3 biggest categories, **Visos išlaidos**. A finished trip without spending: "Išlaidų neįrašyta." | ✔ |
| 10 | Export; edit the hotel price to 600 USD; EN; 360 px. | Budget, priceEur and rate types in the trip file; the edited booking is converted again (≈ 534,95 €); English texts; no sideways scrolling. | ✔ |
| 11 | Phone, at a shop abroad (or a foreign-currency expense at home). | The euro amount appears within a second or two; works offline with a rate seen before. | Phone |
