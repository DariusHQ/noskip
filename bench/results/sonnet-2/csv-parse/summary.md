All 5 tests now pass. I didn't commit anything.

The old `parseCSV` in `src/csv.js` split on `\n` and then on `,`, then stripped quote characters. That is why quoted commas, doubled quotes, CRLF line endings and line breaks inside quotes all failed.

I replaced it with a small character-by-character parser. It tracks whether it is inside quotes, so commas and newlines inside quotes stay in the field. It turns `""` into a literal `"`, and it treats `\r\n`, `\n` and `\r` as row endings. A final row without a trailing newline is still returned.

I didn't add handling for malformed input, such as an unterminated quote.
