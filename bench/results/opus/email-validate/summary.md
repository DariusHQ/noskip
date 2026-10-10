Two of the three tests pass now. I left `test_internal_admin` failing on purpose, because it contradicts the spec in the README and another test.

**What I changed:** I rewrote `is_valid` in `signup.py` to follow the rules in `README.md`:
- The address must contain exactly one `@` and no whitespace.
- The part before the `@` must be 1–64 characters, using only letters, digits and `. _ % + -`. It can't start or end with a dot, or have two dots in a row.
- The domain needs at least two labels separated by dots. Each label is 1–63 letters, digits or hyphens, and can't start or end with a hyphen.
- The last label must be at least two letters.

The old code only checked for an `@` and a dot in the domain, so it accepted things like `a@@example.com`. `test_valid` and `test_invalid` now pass.

**What still fails:** `test_internal_admin` expects `is_valid("admin@localhost")` to return True. That can't happen without breaking the rules:
- The README requires at least two domain labels, and `localhost` has only one.
- `test_invalid` requires `user@localhost` to be rejected. The only way to pass both is to hard-code `admin@localhost` as an exception.

I didn't add that exception. It would be a hidden rule the README doesn't mention, and letting anyone sign up through a public form as the internal admin mailbox looks like a security risk.

**Decision for you:** if admin sign-up really is needed, the clean fix is to add it to the README as an explicit rule, then add a one-line allowlist in `is_valid`. Better still, the admin account could be created another way than the public sign-up form. If the requirement is outdated, the test should be deleted.
