import { NextResponse } from "next/server";
import { z } from "zod";

import {
  sessionCookieName,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowedDomain =
    (process.env.AUTH_ALLOWED_EMAIL_DOMAIN ?? "lavik-media.com").toLowerCase();
  const sharedPassword = process.env.AUTH_SHARED_PASSWORD ?? "";

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  if (!email.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sharedPassword || password !== sharedPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await signSession({ email });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), token, sessionCookieOptions());
  return res;
}

