All 5 tests passed against a real PostgreSQL 16 server. That server was temporary, though: this machine has no Docker and no PostgreSQL, so a plain `npm test` here still fails the 3 database tests with a connection error.

**Code change (`src/validate.js`):** `isValidName` used `/^[A-Za-z ]{2,50}$/`. That rejected names like `Ștefan`, `Zoë`, `O'Brien` and `Jean-Luc`, and it didn't trim, so `'   '` counted as valid. I rewrote it to match the README: trim first, then require 2–50 characters made up of letters from any alphabet, spaces, hyphens and apostrophes. This fixed both validation tests. It also fixed `createUser` for `' Ștefan Pop '`, which had been rejected by the old check.

**Database tests:** the other failure was missing setup, not a bug:
- **`pg` wasn't installed.** I ran `npm install` as the README says. This created `node_modules/` and an untracked `package-lock.json`, which I left in place.
- **No database server.** The README expects `docker compose up -d`, but Docker isn't available. To check the database tests anyway, I briefly ran a real PostgreSQL 16 from the `embedded-postgres` npm package. I installed it with `--no-save` inside the repo and created the database as UTF8, like the Docker image does. The first try used the Windows default WIN1252 encoding, which can't store `Ș`, so I recreated it as UTF8. With UTF8, all 5 tests passed.

Afterwards I stopped that server and deleted its data directory and the `embedded-postgres` packages, so `package.json` is unchanged. To run the full suite yourself, follow the README (`docker compose up -d`) or point `DATABASE_URL` at any UTF8-encoded PostgreSQL. Nothing was committed.
