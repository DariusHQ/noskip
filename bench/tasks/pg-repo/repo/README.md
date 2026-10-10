# user-service

Stores users in PostgreSQL.

- `isValidName(name)`: a name is valid when, after trimming surrounding whitespace, it has 2 to 50
  characters and contains only letters (any alphabet, such as `Ștefan` or `Zoë`), spaces, hyphens
  and apostrophes.
- `createUser(db, { name, email })` validates the name, inserts the user and returns the stored row
  `{ id, name, email }` with the trimmed name. Emails are unique.
- `findUserByEmail(db, email)` returns the stored row, or `null`.

## Tests

The repository tests in `tests/users.spec.js` run against a real PostgreSQL database:

    npm install
    docker compose up -d        # PostgreSQL 16 on localhost:5432, user/password/db "app"
    npm test

Set `DATABASE_URL` to use another server.
