All 5 tests pass, but only when run against a temporary real Postgres I started myself. Plain `npm test` here still fails the 3 repository tests with `ECONNREFUSED`, because this machine has no Docker or PostgreSQL.

**The fix:** `src/validate.js` only allowed `A-Za-z` and spaces. That rejected `Ștefan`, `Zoë`, `O'Brien` and `Jean-Luc`, and it didn't trim whitespace. The check now trims first, then accepts 2–50 Unicode letters, combining marks, spaces, hyphens and apostrophes. That is what the README describes.

**Why the other tests failed:**
- **Missing dependency:** `pg` wasn't installed, so `tests/users.spec.js` couldn't load. I ran `npm install` in the repo, which also created an untracked `package-lock.json`.
- **No database:** to check the repository tests, I temporarily installed `embedded-postgres` inside the repo's `node_modules` with `--no-save`. I ran it as UTF8 to match the `postgres:16` image. Nothing was added to `package.json`.

Nothing is committed. Everywhere else, `docker compose up -d` followed by `npm test` should pass.
