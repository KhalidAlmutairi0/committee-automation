import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database migrations.");

const client = new pg.Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined
});

await client.connect();
await client.query("SELECT pg_advisory_lock(hashtext('masar_schema_migrations'))");
try {
  const migrationsDirectory = path.join(process.cwd(), "src/server/db/migrations");
  const migrations = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  for (const migration of migrations) {
    const exists = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [migration]);
    if (exists.rowCount) continue;
    const sql = await readFile(path.join(migrationsDirectory, migration), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [migration]);
      await client.query("COMMIT");
      console.log(`Applied migration ${migration}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('masar_schema_migrations'))");
  await client.end();
}
