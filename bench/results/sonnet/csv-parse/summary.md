All 5 tests now pass. I rewrote `parseCSV` in `src/csv.js`.

The old version split on `\n` and then on `,`. That broke quoted commas, doubled quotes, CRLF line endings and line breaks inside quotes. The new version is a small character-by-character parser that tracks whether it is inside quotes. It handles all four cases and keeps the existing behaviour for simple input, such as empty fields and a trailing newline. I didn't commit anything.
