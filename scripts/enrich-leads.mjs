import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = url.startsWith("file:")
  ? new PrismaLibSql({ url })
  : new PrismaLibSql({ url, authToken: authToken ?? "" });

const prisma = new PrismaClient({ adapter });

const PLACEHOLDER_PREFIX = "+430000";

function isProbablyScrapableWebsite(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("maps.app.goo.gl")) return false;
    if (host.includes("google.com") && u.pathname.includes("/maps")) return false;
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanupCompanyName(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/[\|\-•·–—].*$/g, "") // keep left side of "Title | Brand"
    .trim()
    .slice(0, 200);
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m?.[1]) return cleanupCompanyName(decodeHtml(m[1]));
  const og = html.match(
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  if (og?.[1]) return cleanupCompanyName(decodeHtml(og[1]));
  return null;
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizePhone(raw) {
  const cleaned = raw.replace(/[^\d+]/g, "");
  // very basic sanity: at least 7 digits
  const digits = cleaned.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  return cleaned;
}

function extractPhones(html) {
  const phones = new Set();

  // tel: links
  for (const m of html.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    const p = normalizePhone(m[1]);
    if (p) phones.add(p);
  }

  // common readable patterns (very loose)
  for (const m of html.matchAll(
    /(\+?\d[\d\s().\/-]{6,}\d)/g,
  )) {
    const p = normalizePhone(m[1]);
    if (p) phones.add(p);
  }

  // prefer +43 or +49 numbers if present
  const list = [...phones];
  const preferred = list.find((p) => p.startsWith("+43")) ??
    list.find((p) => p.startsWith("+49"));
  return preferred ?? list[0] ?? null;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "LAVIK-Media-CRM-Enricher/1.0 (local dev) - contact: lavik-media.com",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      status: "NEW",
      website: { not: null },
    },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  let skipped = 0;

  for (const lead of leads) {
    const website = lead.website;
    if (!website || !isProbablyScrapableWebsite(website)) {
      skipped++;
      continue;
    }

    const html = await fetchHtml(website);
    if (!html) {
      skipped++;
      continue;
    }

    const title = extractTitle(html);
    const phone = extractPhones(html);

    const patch = {};
    if (title && title.length >= 2 && title !== lead.companyName) {
      patch.companyName = title;
    }

    const hasPlaceholder = lead.phoneNumber?.startsWith(PLACEHOLDER_PREFIX);
    if (phone && hasPlaceholder) {
      patch.phoneNumber = phone;
    }

    const keys = Object.keys(patch);
    if (keys.length === 0) continue;

    try {
      await prisma.lead.update({
        where: { id: lead.id },
        data: patch,
      });
      updated++;
      process.stdout.write(".");
    } catch {
      // likely unique constraint collisions (phone/company). Skip quietly.
      skipped++;
      process.stdout.write("x");
    }
  }

  process.stdout.write("\n");
  console.log(`Enrichment done. Updated ${updated}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

