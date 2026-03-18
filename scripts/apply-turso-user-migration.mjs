import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("Missing TURSO_DATABASE_URL");
if (!authToken) throw new Error("Missing TURSO_AUTH_TOKEN");

const client = createClient({ url, authToken });

function splitSqlStatements(sql) {
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
    "20260318162151_add_user",
    "migration.sql",
  );
  const sql = fs.readFileSync(migrationPath, "utf8");
  const statements = splitSqlStatements(sql);

  for (const stmt of statements) {
    const safe = stmt
      .replace(/^CREATE TABLE\s+"User"/i, 'CREATE TABLE IF NOT EXISTS "User"')
      .replace(
        /^CREATE UNIQUE INDEX\s+"User_email_key"/i,
        'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"',
      );

    await client.execute(safe);
    process.stdout.write(".");
  }

  process.stdout.write("\n");
  console.log("User migration applied.");
}

main().finally(() => client.close());
