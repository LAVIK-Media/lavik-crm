import { NextResponse } from "next/server";
import type { LeadStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  leadCreateSchema,
  leadStatusSchema,
  normalizePhoneNumber,
} from "@/lib/lead-validation";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") ?? "";
    const q = (searchParams.get("q") ?? "").trim();

    const statuses = statusParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const statusFilter = statuses.length
      ? leadStatusSchema.array().safeParse(statuses)
      : { success: true as const, data: [] as string[] };

    if (!statusFilter.success) {
      return NextResponse.json(
        { error: "Invalid status filter" },
        { status: 400 },
      );
    }

    const statusList = statusFilter.data as LeadStatus[];

    const leads = await prisma.lead.findMany({
      where: {
        ...(statusList.length ? { status: { in: statusList } } : {}),
        ...(q
          ? {
              OR: [
                { companyName: { contains: q } },
                { phoneNumber: { contains: q } },
                { contactPerson: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("GET /api/leads failed", err);
    return NextResponse.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
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
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? err.code : null;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate lead (phone number or company name already exists)" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

