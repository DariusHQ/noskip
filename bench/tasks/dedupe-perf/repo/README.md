# contact-import

`dedupeContacts(contacts)` removes duplicate contacts before an import. Two contacts are duplicates
when their email addresses match after trimming and lower-casing. The first contact for each address
wins, the original order is kept, and the input array is never modified.

Customers import address books with tens of thousands of entries, so the import has a time budget:
20,000 contacts must be deduplicated in under 150 ms.

Run the tests with `npm test`.
