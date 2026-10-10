import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createPool, migrate } from '../src/db.js';
import { createUser, findUserByEmail } from '../src/users.js';

let db;

before(async () => {
  db = createPool();
  await migrate(db);
  await db.query('TRUNCATE users RESTART IDENTITY');
});

after(async () => {
  await db?.end();
});

test('creates and finds a user', async () => {
  const user = await createUser(db, { name: ' Ștefan Pop ', email: 'stefan@example.com' });
  assert.equal(user.name, 'Ștefan Pop');
  assert.deepEqual(await findUserByEmail(db, 'stefan@example.com'), user);
});

test('returns null for unknown emails', async () => {
  assert.equal(await findUserByEmail(db, 'nobody@example.com'), null);
});

test('rejects duplicate emails', async () => {
  await createUser(db, { name: 'Ana', email: 'ana@example.com' });
  await assert.rejects(createUser(db, { name: 'Ana Pop', email: 'ana@example.com' }), /duplicate key/);
});
