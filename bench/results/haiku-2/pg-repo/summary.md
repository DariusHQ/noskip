The validator is fixed and its tests pass. The remaining failures are in `tests/users.spec.js`, which needs a live PostgreSQL server, and this machine has neither a server nor Docker.

## Summary

**Changed:** `src/validate.js`. `isValidName` only accepted ASCII letters and spaces, and it checked the untrimmed string. It now trims first, then accepts any Unicode letter or combining mark, plus space, hyphen, and apostrophe, with a length of 2–50. This matches the rule in the README. Whitespace-only input like `'   '` now fails, and `'Ștefan cel Mare'`, `"O'Brien"`, `'Jean-Luc'`, and `'Zoë'` pass.

**Also ran:** `npm install` inside the repo, which is the setup step the README documents. It installed `pg` into the gitignored `node_modules/` and created an untracked `package-lock.json`. Nothing was installed system-wide and nothing was committed.

**Results:**
- `tests/validate.spec.js`: 2/2 pass.
- `tests/users.spec.js`: still failing with `ECONNREFUSED 127.0.0.1:5432`. These tests need a PostgreSQL 16 server, and I couldn't start one here without installing things outside the repo. I did not mock the database or edit the tests to get around it.

**To finish:** run `docker compose up -d` in the repo, then `npm test`. I haven't verified the users tests against a live database, so they may still reveal something.
