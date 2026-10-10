All three tests now pass, including the 20,000-contact timing test that was failing (it took about 3.5 s against a 150 ms limit).

The cause was in `dedupeContacts` in `src/contacts.js`. For each contact it scanned every contact kept so far and re-normalized each of their emails. That made the work grow with the square of the list size. I replaced the scan with a `Set` of normalized emails, so each contact needs one lookup. Behavior is the same: the first contact for each email is kept, in the original order.

I didn't commit anything.
