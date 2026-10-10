import pg from 'pg';

export function createPool() {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app' });
}

export async function migrate(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  )`);
}
