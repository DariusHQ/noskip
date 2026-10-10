All three tests pass now. The 20,000-contact test dropped from about 3.5 s to about 8 ms.

**Cause:** `dedupeContacts` in `src/contacts.js` checked each contact against every contact already kept, and re-normalized each stored email on every comparison. That is quadratic work.

**Change:** I replaced the scan with a `Set` of normalized emails. A contact is skipped if its normalized email is already in the set; otherwise it is added to the set and the result. This keeps the same behavior: the first contact for each address wins, original order is kept, and the input array is not modified. `normalizeEmail` is unchanged.

Nothing was committed, and nothing was installed.
