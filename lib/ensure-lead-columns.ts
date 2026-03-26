import { createClient } from "@libsql/client";

const REQUIRED_COLUMNS = ["googleMapsUrl", "tags", "location"] as const;

let ensurePromise: Promise<void> | null = null;
let ensured = false;

export async function ensureLeadSearchColumns() {
  if (ensured) return;
  if (!ensurePromise) ensurePromise = ensureLeadSearchColumnsInternal();
  await ensurePromise;
  ensured = true;
}

async function ensureLeadSearchColumnsInternal() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return;

  const client = createClient({ url, authToken });
  try {
    const info = await client.execute('PRAGMA table_info("Lead");');
    const existing = new Set(info.rows.map((r) => String(r.name)));
    for (const col of REQUIRED_COLUMNS) {
      if (existing.has(col)) continue;
      await client.execute(`ALTER TABLE "Lead" ADD COLUMN "${col}" TEXT;`);
    }
  } finally {
    client.close();
  }
}

