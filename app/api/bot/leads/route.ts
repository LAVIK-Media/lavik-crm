import { NextResponse } from "next/server";

import { assertBotAuthorized } from "@/lib/bot-auth";
import { leadCreateSchema, normalizePhoneNumber } from "@/lib/lead-validation";
import { prisma } from "@/lib/prisma";

const RAW_PAYLOAD_MAX_CHARS = 50_000;

export async function POST(req: Request) {
  const auth = assertBotAuthorized(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Allow optional bot metadata while keeping the existing leadCreateSchema as the source of truth.
  const { sourceRef, raw, ...leadCandidate } = body as Record<string, unknown>;

  const parsed = leadCreateSchema.safeParse(leadCandidate);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let rawPayload: string | null = null;
  if (raw !== undefined) {
    try {
      rawPayload = JSON.stringify(raw);
    } catch {
      return NextResponse.json({ error: "Invalid raw payload" }, { status: 400 });
    }
    if (rawPayload.length > RAW_PAYLOAD_MAX_CHARS) {
      return NextResponse.json({ error: "Raw payload too large" }, { status: 413 });
    }
  }

  const input = parsed.data;
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const companyName = input.companyName.trim();

  try {
    const lead = await prisma.lead.create({
      data: {
        companyName,
        phoneNumber,
        website: input.website?.trim() || null,
        contactPerson: input.contactPerson?.trim() || null,
        notes: input.notes ?? "",
        status: input.status ?? "NEW",
        source: "openclaw",
        sourceRef: typeof sourceRef === "string" && sourceRef.trim() ? sourceRef.trim() : null,
        createdBy: "bot",
        rawPayload,
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? (err as any).code : null;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate lead (phone number or company name already exists)" },
        { status: 409 },
      );
    }
    console.error("POST /api/bot/leads failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

