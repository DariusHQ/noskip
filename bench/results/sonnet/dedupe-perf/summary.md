All three tests now pass.

The slow test failed because `dedupeContacts` in `src/contacts.js` scanned the whole `unique` array for every contact and re-normalized each stored email on every comparison. That is quadratic, and the 20,000-contact test took about 3.4 s against its 150 ms limit.

I changed it to keep a `Set` of normalized emails, so each contact needs one lookup. Behavior is the same: the first contact for each email is kept, in the original order.

I didn't commit anything.
