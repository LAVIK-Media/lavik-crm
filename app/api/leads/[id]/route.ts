import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  leadUpdateSchema,
  normalizePhoneNumber,
} from "@/lib/lead-validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
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
        ...(input.contactPerson !== undefined
          ? { contactPerson: input.contactPerson?.trim() || null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? "" } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return NextResponse.json({ lead });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Duplicate lead (phone number or company name already exists)" },
        { status: 409 },
      );
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

