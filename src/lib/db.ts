import { Pool, type PoolClient } from 'pg';
let pool: Pool | undefined;
export function db(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5,
      connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
  }
  return pool;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
