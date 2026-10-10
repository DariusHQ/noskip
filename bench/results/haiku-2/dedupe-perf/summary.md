`npm test` now passes: 3 of 3, and the 20,000-contact test takes about 8 ms against its 150 ms budget.

**The problem:** `dedupeContacts` in `src/contacts.js` checked each contact against every contact already kept, re-normalizing each stored email on every comparison. That is quadratic work, about 3.5 s for 20,000 contacts.

**The change:** I replaced the scan with a `Set` of normalized emails. A contact is skipped if its normalized email is already in the set; otherwise it is added to the set and pushed to the result. Behaviour is the same: the first contact per address wins, original order is kept, and the input array is not modified.

I didn't commit anything, and I didn't install anything.
