# mini-csv

`parseCSV(text)` parses CSV (RFC 4180) into an array of records, each an array of strings.

- Fields are separated by commas; records by `\n` or `\r\n`.
- A field wrapped in double quotes may contain commas, line breaks and doubled quotes (`""` means `"`).
- A trailing line break does not create an extra record. Empty fields are empty strings.

Run the tests with `npm test`.
