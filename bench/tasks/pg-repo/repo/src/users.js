import { isValidName } from './validate.js';

export async function createUser(db, { name, email }) {
  if (!isValidName(name)) throw new Error(`invalid name: ${name}`);
  const { rows } = await db.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email', [name.trim(), email]);
  return rows[0];
}

export async function findUserByEmail(db, email) {
  const { rows } = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
  return rows[0] ?? null;
}
