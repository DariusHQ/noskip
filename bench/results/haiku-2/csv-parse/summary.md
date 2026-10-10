All 5 tests pass now (previously 1 passed and 4 failed).

**What was wrong:** `src/csv.js` split the input on every `\n` and `,`, so it had no notion of quoted fields. That caused all four failures: commas inside quotes split the field, doubled quotes were not unescaped, `\r` was left on CRLF lines, and newlines inside quotes split the record.

**What I changed:** I replaced `parseCSV` in `src/csv.js` with a character-by-character parser. It:
- treats commas and newlines as delimiters only outside quotes;
- turns `""` inside a quoted field into `"`;
- allows newlines inside quoted fields;
- skips the `\r` in `\r\n` line endings.

**Behaviour changes to be aware of:**
- The old version called `.trim()` on the whole input. I removed that, so leading and trailing whitespace inside fields is now preserved.
- Blank lines are now skipped rather than producing a `['']` row.
- Empty input returns `[]` rather than `[['']]`.

I did not commit anything, and I did not install anything.
