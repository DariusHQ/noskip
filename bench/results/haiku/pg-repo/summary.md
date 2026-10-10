The validator tests pass now, but `npm test` still fails. The three `users.spec.js` tests can't connect to PostgreSQL, and that can't be fixed from inside this environment.

**What I changed**
- **`src/validate.js`**: `isValidName` rejected valid names and accepted nothing it shouldn't. The old regex allowed only ASCII letters and spaces, and it didn't trim input. It now trims first, checks the length is 2 to 50 characters, and accepts Unicode letters, combining marks, spaces, hyphens and apostrophes. This matches the rules in the README. It also returns `false` for non-string input.
- **`npm install`**: `pg` wasn't installed, so `src/db.js` failed to load. I installed the project's dependencies locally into `node_modules/` as the README describes. That created `package-lock.json`, which is new and untracked. I did not install anything system-wide and did not commit.

**Current results**
- `tests/validate.spec.js`: 2/2 pass.
- `tests/users.spec.js`: 3 fail with `ECONNREFUSED 127.0.0.1:5432`. The tests need a PostgreSQL 16 server with user, password and database `app`. The README's setup is `docker compose up -d`. Docker and PostgreSQL aren't available on this machine, and installing them would be a system-wide install, which you ruled out.

To finish, start the database (`docker compose up -d` if Docker is available, or point `DATABASE_URL` at an existing server) and run `npm test` again. I haven't verified the database tests, so they may still reveal problems in `src/users.js` or `src/db.js`.
