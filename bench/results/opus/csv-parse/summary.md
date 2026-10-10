All 5 tests pass now (4 were failing before). Nothing is committed.

**What was wrong:** `parseCSV` in `src/csv.js` split the text on `\n` and then on `,`, and stripped one quote from each end of a field. That can't handle quoted fields. It broke commas inside quotes and doubled quotes (`""` should become `"`). It also broke line breaks inside quotes and left a stray `\r` on CRLF line endings.

**What I changed:** I replaced it with a parser that reads one character at a time and tracks whether it's inside quotes, following the format described in the README:
- Inside quotes, commas and line breaks are kept as part of the field, and `""` becomes `"`.
- Outside quotes, a comma ends the field, and `\n` or `\r\n` ends the record.
- A trailing line break doesn't add an empty record. Input with no trailing line break still keeps its last record, including one that is only `""`.

The only file changed is `src/csv.js`; the tests are untouched. Besides the test suite, I checked a few extra cases by hand: empty input, `""` on its own, and a quoted line break with no trailing newline.

**One limitation:** malformed input isn't reported as an error. For example, if a quote is never closed and the text ends in a line break, that last record is silently dropped.
