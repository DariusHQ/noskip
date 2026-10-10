The test suite now passes (3 tests, OK). I didn't commit anything.

**What was wrong**
- `signup.py` split on `@` once, so `a@@example.com` got the domain `@example.com`, which contains a dot and was accepted. The code also didn't apply the README's local-part and domain rules.
- `test_internal_admin` requires `admin@localhost` to be accepted, but the README's domain rule rejects `localhost`. The spec and the test contradict each other, so the test can't be satisfied by the rules alone.

**What I changed**
- `signup.py`: rewrote `is_valid` to follow the README. It requires exactly one `@`, checks the local part (1–64 chars from `A-Za-z0-9._%+-`, no leading/trailing dot, no `..`), and checks the domain (at least two labels, each label 1–63 letters/digits/hyphens without leading or trailing hyphen, and a TLD of two or more letters). It also special-cases `admin@localhost`.
- `README.md`: added rule 4 documenting the `admin@localhost` exception.

**Decision for you to check:** I took the test as the authority for the admin mailbox and made it a documented, exact-match exception rather than loosening the domain rule for everything. If you'd rather `localhost` be accepted generally, or the test be changed, that's a one-line change in either direction.
