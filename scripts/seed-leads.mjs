import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import fs from "node:fs";
import path from "node:path";

const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = url.startsWith("file:")
  ? new PrismaLibSql({ url })
  : new PrismaLibSql({ url, authToken: authToken ?? "" });

const prisma = new PrismaClient({ adapter });

function isUrlLike(s) {
  return /^https?:\/\//i.test(s);
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw.trim());
    return u.toString();
  } catch {
    return null;
  }
}

function companyFromUrl(urlString) {
  const u = new URL(urlString);
  const host = u.hostname.replace(/^www\./, "");
  const base = host.split(".").slice(0, -1).join(".") || host;
  const parts = base
    .replace(/[^a-z0-9.-]/gi, " ")
    .split(/[-.\s]+/)
    .filter(Boolean);

  const titled = parts
    .slice(0, 4)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  return titled || host;
}

async function main() {
  const filePath = path.join(process.cwd(), "scripts", "seed-urls.txt");
  const raw = fs.readFileSync(filePath, "utf8");
  const urls = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(isUrlLike)
    .map(normalizeUrl)
    .filter(Boolean);

  let created = 0;

  for (let i = 0; i < urls.length; i++) {
    const website = urls[i];
    const baseCompany = companyFromUrl(website);
    const phoneNumber = `+430000${String(i + 1).padStart(6, "0")}`;

    // ensure companyName uniqueness by suffixing
    let companyName = baseCompany;
    for (let n = 0; n < 20; n++) {
      try {
        await prisma.lead.create({
          data: {
            companyName,
            phoneNumber,
            website,
            contactPerson: null,
            notes: "Seed import (placeholder phone).",
            status: "NEW",
          },
        });
        created++;
        break;
      } catch (e) {
        // P2002 unique constraint (companyName collision)
        companyName = `${baseCompany} ${n + 2}`;
      }
    }
  }

  console.log(`Seed done. Created ${created} leads.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

