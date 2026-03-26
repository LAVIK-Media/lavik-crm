import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  leadUpdateSchema,
  normalizePhoneNumber,
} from "@/lib/lead-validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (err) {
    console.error("GET /api/leads/[id] failed", err);
    return NextResponse.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(input.companyName !== undefined
          ? { companyName: input.companyName.trim() }
          : {}),
        ...(input.phoneNumber !== undefined
          ? { phoneNumber: normalizePhoneNumber(input.phoneNumber) }
          : {}),
        ...(input.website !== undefined
          ? { website: input.website?.trim() || null }
          : {}),
        ...(input.googleMapsUrl !== undefined
          ? { googleMapsUrl: input.googleMapsUrl?.trim() || null }
          : {}),
        ...(input.contactPerson !== undefined
          ? { contactPerson: input.contactPerson?.trim() || null }
          : {}),
        ...(input.tags !== undefined ? { tags: input.tags?.trim() || null } : {}),
        ...(input.location !== undefined
          ? { location: input.location?.trim() || null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? "" } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return NextResponse.json({ lead });
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? err.code : null;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate lead (phone number or company name already exists)" },
        { status: 409 },
      );
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;

  try {
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? err.code : null;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("DELETE /api/leads/[id] failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

