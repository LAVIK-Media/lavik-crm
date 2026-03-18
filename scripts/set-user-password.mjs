import dotenv from "dotenv";
import path from "node:path";
import { createClient } from "@libsql/client";
import { hash } from "bcryptjs";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("Missing TURSO_DATABASE_URL");
if (!authToken) throw new Error("Missing TURSO_AUTH_TOKEN");

const email = (process.argv[2] ?? "").toLowerCase();
const newPassword = process.argv[3] ?? "";

if (!email.includes("@")) {
  throw new Error('Usage: node scripts/set-user-password.mjs "<email>" "<newPassword>"');
}
if (newPassword.length < 8) {
  throw new Error("Password must be at least 8 characters.");
}

const client = createClient({ url, authToken });

async function main() {
  const passwordHash = await hash(newPassword, 10);

  const res = await client.execute({
    sql: 'UPDATE "User" SET "passwordHash" = ?1, "setupCodeHash" = NULL WHERE "email" = ?2;',
    args: [passwordHash, email],
  });

  // @libsql/client returns rowsAffected in different shapes; print what we can.
  console.log("Updated user password for:", email);
  console.log("Result:", res);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.close());

