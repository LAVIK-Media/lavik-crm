import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.js";

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

    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash: null, setupCodeHash },
      update: { setupCodeHash },
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
    await prisma.$disconnect();
  });

