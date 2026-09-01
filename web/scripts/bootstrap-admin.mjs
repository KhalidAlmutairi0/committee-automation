import bcrypt from "bcryptjs";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "قائد اللجنة";

if (!connectionString) throw new Error("DATABASE_URL is required for bootstrap.");
if (!email || !password) {
  console.log("Admin bootstrap skipped: BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_PASSWORD is not configured.");
  process.exit(0);
}
if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.");

const client = new pg.Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined
});
await client.connect();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await client.query(
    `INSERT INTO users(email, name, password_hash, role)
     VALUES ($1, $2, $3, 'committee_lead')
     ON CONFLICT (email) DO UPDATE SET role = 'committee_lead', name = EXCLUDED.name,
       updated_at = now()`,
    [email, name, passwordHash]
  );
  console.log("Committee lead account is ready.");
} finally {
  await client.end();
}
