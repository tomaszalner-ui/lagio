# Tests: milestone 8, Notes

## Step 8a: notes per trip (version 0.8.0)

✔ = passed in headless Edge on 2026-11-17. "Phone" = to check on the owner's phone.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| 1 | Trip screen → **Užrašai** (no longer "Netrukus"). | Empty list: "Užrašų dar nėra" with the hint about addresses, phrases, contacts, door codes. | ✔ |
| 2 | **Naujas užrašas**: title "Viešbutis", a text with an address, +39 phone, e-mail, www address, a date, a price and a Lithuanian number "8 612 34567". Wait a second. | The cursor starts in the text box; "Saugoma…" while typing, then "Išsaugota"; the note is in the database without pressing anything. | ✔ |
| 3 | Add a line and press **Baigti** at once. | The last line is saved too; the note opens. Phone numbers, e-mail and the web address are links (tel:, mailto:, https://); the date, the price and the door code are not. | ✔ |
| 4 | **Kopijuoti**; **Dideliu šriftu**, then ✕. | "Nukopijuota" (with a real tap); the note fills the screen in big letters (34 px) and closes again. | ✔ |
| 5 | A new note without a title, then the Back link before it saved. | Saved anyway; in the list its first line is the heading and the second line the preview. | ✔ |
| 6 | Edit a note's title and switch to another app straight away. | Saved at once when the app goes to the background. | ✔ |
| 7 | A new note left empty → **Baigti**. Then empty an existing note → **Baigti** → **Grąžinti**. Then **Ištrinti** in a note → **Grąžinti**. | The empty note is not saved. The emptied note is deleted ("Užrašas ištrintas · Grąžinti") and comes back with Undo, as before emptying. Delete works the same. | ✔ |
| 8 | Trip screen; **Sukurti kopiją**; export, delete, import. | Tile badge "2 užrašai"; the copy has both notes; the trip file has the notes and they come back unchanged. | ✔ |
| 9 | EN; 360 px; network off. | "Notes · 2 notes", "Edit, Copy, Show big, Delete", "Changed 17 November"; no sideways scrolling; list, new note and saving work offline. | ✔ |
| 10 | Phone: write a note, tap a phone number, show a note in big letters. | The phone app offers the call; the big text is readable at arm's length. | Phone |
