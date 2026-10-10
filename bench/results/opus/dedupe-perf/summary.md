All 3 tests pass now. The 20,000-contact case takes about 8 ms, against a 150 ms limit.

**The problem:** `dedupeContacts` in `src/contacts.js` checked each contact against every contact it had already kept, using `unique.some(...)`, and normalized each kept email again on every comparison. That's quadratic work, and 20,000 contacts took about 3.4 seconds.

**The fix:** I now store each normalized email in a `Set` once and check new contacts against it, so each lookup is a single step. The behavior described in the README hasn't changed: emails still match after trimming and lower-casing, the first contact wins, the original order is kept, and the input array isn't modified. I didn't touch the tests or the time budget. I haven't committed anything.
