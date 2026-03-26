import dotenv from "dotenv";
import path from "node:path";
import { createClient } from "@libsql/client";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("Missing TURSO_DATABASE_URL");
if (!authToken) throw new Error("Missing TURSO_AUTH_TOKEN");

const client = createClient({ url, authToken });

async function ensureColumn(name) {
  const info = await client.execute('PRAGMA table_info("Lead");');
  const cols = new Set(info.rows.map((r) => String(r.name)));
  if (cols.has(name)) return;
  await client.execute(`ALTER TABLE "Lead" ADD COLUMN "${name}" TEXT;`);
}

async function main() {
  await ensureColumn("googleMapsUrl");
  await ensureColumn("tags");
  await ensureColumn("location");
  console.log("Lead search metadata columns ensured.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.close());

