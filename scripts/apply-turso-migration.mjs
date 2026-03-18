import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("Missing TURSO_DATABASE_URL");
if (!authToken) throw new Error("Missing TURSO_AUTH_TOKEN");

const client = createClient({ url, authToken });

function splitSqlStatements(sql) {
  // Simple splitter for our migration.sql (no stored procs)
  return sql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith(";") ? s : `${s};`));
}

async function main() {
  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260317140950_init",
    "migration.sql",
  );
  const sql = fs.readFileSync(migrationPath, "utf8");
  const statements = splitSqlStatements(sql);

  for (const stmt of statements) {
    // make it idempotent-ish for re-runs
    const safe = stmt
      .replace(/^CREATE TABLE\s+"Lead"/i, 'CREATE TABLE IF NOT EXISTS "Lead"')
      .replace(
        /^CREATE INDEX\s+"Lead_status_createdAt_idx"/i,
        'CREATE INDEX IF NOT EXISTS "Lead_status_createdAt_idx"',
      )
      .replace(
        /^CREATE UNIQUE INDEX\s+"Lead_phoneNumber_key"/i,
        'CREATE UNIQUE INDEX IF NOT EXISTS "Lead_phoneNumber_key"',
      )
      .replace(
        /^CREATE UNIQUE INDEX\s+"Lead_companyName_key"/i,
        'CREATE UNIQUE INDEX IF NOT EXISTS "Lead_companyName_key"',
      );

    await client.execute(safe);
    process.stdout.write(".");
  }

  process.stdout.write("\n");
  const res = await client.execute(
    "SELECT name, type FROM sqlite_master WHERE type IN ('table','index') ORDER BY type, name;",
  );
  console.log("Applied. Objects:");
  for (const row of res.rows) console.log(`- ${row.type}: ${row.name}`);
}

main().finally(() => client.close());

