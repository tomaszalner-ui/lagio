# Tests: milestone 1, Foundation

Run on a phone (or DevTools at 360 px wide). Start with a fresh browser profile
or after clearing the site's data. ✔ = passed in headless Edge on 2026-11-16.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Open the app for the first time. | Title "Lagio", heading "Mano kelionės", suitcase picture, "Kelionių dar nėra" and a short hint. Everything in Lithuanian. | ✔ |
| 2 | Tap **EN**. Then reload the page. | All text switches to English at once. After reload it is still English. Tap **LT** to switch back. | ✔ |
| 3 | Change the address to `#/trip/abc`, then tap **Atgal**. Then try `#/anything`. | A "Kelionės puslapis kuriamas" placeholder with a back link. Back returns to Home. An unknown address shows Home. | ✔ |
| 4 | Load the app once, then turn on airplane mode (or DevTools → Network → Offline) and reload. | The app opens normally, both Home and `#/trip/abc`. | ✔ |
| 5 | Publish a new version (raise `VERSION` in `sw.js`) while the app is open, then return to it. | Banner "Yra nauja Lagio versija." with **Atnaujinti**. Tapping it reloads the app; the banner is gone and the language choice is kept. | ✔ |
| 6 | Install: Chrome menu → *Install app* / Safari → Share → *Add to Home Screen*. | Lagio icon (blue square, amber suitcase) on the home screen. Opens without the browser bar. | to test on phone |
| 7 | At 360 px wide, look at every screen. | No sideways scrolling; LT/EN buttons and links are easy to tap. | ✔ |
| 8 | DevTools → Console during tests 1 to 5. | No errors or warnings. | ✔ |

Checked in code (not by hand): plural forms (0 kelionių, 1 kelionė, 2 kelionės,
10 kelionių, 21 kelionė, 1,5 kelionės), money (12,50 € / €12.50, JPY without cents),
dates ("2026 m. lapkričio 16 d." / "16 November 2026"), and db.js create, update,
soft delete, restore, files and settings.

Not applicable yet: export round trip (milestone 4), data from a previous version
(this is the first version).
