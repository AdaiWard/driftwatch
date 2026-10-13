import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;
export type Project = typeof schema.projects.$inferSelect;
export type Build = typeof schema.builds.$inferSelect;
export type Snapshot = typeof schema.snapshots.$inferSelect;