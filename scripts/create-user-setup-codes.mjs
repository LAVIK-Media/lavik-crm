import dotenv from "dotenv";
import path from "node:path";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";

// Load env from .env and .env.local (prefer .env.local)
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) throw new Error("Missing TURSO_DATABASE_URL");
if (!authToken) throw new Error("Missing TURSO_AUTH_TOKEN");

const client = createClient({ url, authToken });

const emails = [
  "linus@lavik-media.com",
  "jakob@lavik-media.com",
  "richard@lavik-media.com",
];

function randomCode() {
  // 12 chars base36, easy to type
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

async function main() {
  const result = [];

  for (const emailRaw of emails) {
    const email = emailRaw.toLowerCase();
    const code = randomCode();
    const setupCodeHash = await hash(code, 10);

    // Ensure user exists and store per-user setup code hash.
    await client.execute({
      sql: `
        INSERT INTO "User" ("id", "email", "passwordHash", "setupCodeHash", "createdAt")
        VALUES (?1, ?2, NULL, ?3, CURRENT_TIMESTAMP)
        ON CONFLICT("email") DO UPDATE SET "setupCodeHash" = excluded."setupCodeHash";
      `,
      args: [randomUUID(), email, setupCodeHash],
    });

    result.push({ email, code });
  }

  console.log("\nSetup passwords (only shown once):");
  for (const row of result) {
    console.log(`- ${row.email}: ${row.code}`);
  }
  console.log("\nAfter first login, users must set a personal password at /set-password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    client.close();
  });

