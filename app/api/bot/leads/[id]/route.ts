import { NextResponse } from "next/server";

import { assertBotAuthorized } from "@/lib/bot-auth";
import {
  leadUpdateSchema,
  normalizePhoneNumber,
} from "@/lib/lead-validation";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, ctx: RouteContext) {
  const auth = assertBotAuthorized(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

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
        ...(input.contactPerson !== undefined
          ? { contactPerson: input.contactPerson?.trim() || null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? "" } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return NextResponse.json({ lead });
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate lead (phone number or company name already exists)" },
        { status: 409 },
      );
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PATCH /api/bot/leads/[id] failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
