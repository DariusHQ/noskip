All 5 tests now pass with `npm test`.

**What was wrong:** `src/csv.js` split the input on `\n` and `,` and stripped quote characters at the start and end of each field. That can't handle commas or newlines inside quoted fields, doubled quotes, or `\r\n` line endings.

**What I changed:** I replaced `parseCSV` in `src/csv.js` with a character-level parser. It tracks whether it's inside quotes, turns `""` into `"` inside quoted fields, treats `\n`, `\r`, and `\r\n` as record ends outside quotes, and only emits a trailing record if the input doesn't end in a newline.

**Behaviour changes beyond the tests:**
- The old code called `.trim()` on the whole input and the new code doesn't, so leading or trailing whitespace is now kept as part of the data.
- Empty input now returns `[]` rather than `[['']]`.

Nothing was installed, and I did not commit.
