import pg from "pg";

const { Client } = pg;

function buildDbName(raw) {
  const base = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const prefixed = base.startsWith("n8n_") ? base : `n8n_${base}`;
  return prefixed.slice(0, 60) || "n8n_default";
}

export function getTenantDbName(orgSlug) {
  return buildDbName(orgSlug);
}

export async function ensureDatabaseExists({
  dbName,
  host,
  port,
  user,
  password,
  adminDb
}) {
  if (!dbName) throw new Error("Missing dbName for tenant");
  const adminDatabase = adminDb || process.env.N8N_DB_NAME || "postgres";
  const client = new Client({
    host,
    port,
    user,
    password,
    database: adminDatabase
  });
  await client.connect();
  try {
    const exists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}
