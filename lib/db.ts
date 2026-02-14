import { Pool } from "pg";

let _pool: Pool | null = null;

export function db(): Pool {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  _pool = new Pool({
    connectionString: url,
    // Neon requires SSL; most DATABASE_URLs already include sslmode=require,
    // but we set this defensively.
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  return _pool;
}
