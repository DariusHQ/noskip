All five tests pass, but only when a PostgreSQL server is running on localhost:5432.

**The bug:** `isValidName` in `src/validate.js` only allowed `A-Za-z` and spaces. That rejected `Ștefan cel Mare`, `O'Brien`, `Jean-Luc`, `Zoë` and `'  Ana  '`. It now trims the input first, then accepts 2–50 characters from any alphabet (`\p{L}`), spaces, hyphens and apostrophes, as the README describes. Non-strings are rejected.

**The other failures:** `users.spec.js` was failing for two reasons.
- **Missing dependency:** `pg` wasn't installed. I ran `npm install` in the project, which also created `package-lock.json`. I left it uncommitted.
- **No database:** There was no Postgres server, and Docker isn't available here. To check the DB tests, I temporarily ran a throwaway embedded Postgres with a UTF8 database. I installed it with `--no-save`, then stopped it and removed it afterwards. It isn't in `package.json`.

On a normal setup, run `docker compose up -d` before `npm test`.

I didn't commit anything.
