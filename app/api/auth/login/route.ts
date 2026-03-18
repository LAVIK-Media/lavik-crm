import { NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";

import {
  sessionCookieName,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let body: unknown = null;

  if (contentType.includes("application/json")) {
    body = await req.json().catch(async () => {
      const raw = await req.text().catch(() => "");
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    });
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const fd = await req.formData().catch(() => null);
    if (fd) {
      body = {
        email: fd.get("email"),
        password: fd.get("password"),
      };
    }
  } else {
    body = await req.json().catch(async () => {
      const raw = await req.text().catch(() => "");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          //
        }
      }
      const fd = await req.formData().catch(() => null);
      if (!fd) return null;
      return { email: fd.get("email"), password: fd.get("password") };
    });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowedDomain = process.env.AUTH_ALLOWED_EMAIL_DOMAIN;
  const initialPassword = process.env.AUTH_INITIAL_PASSWORD;

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  if (!allowedDomain || !email.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (user?.passwordHash) {
    const match = await compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = await signSession({ email });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), token, sessionCookieOptions());
    return res;
  }

  // First login / no personal password set yet.
  // Prefer per-user setup code (stored hashed in DB). Fallback to global initial password (env).
  if (user?.setupCodeHash) {
    const match = await compare(password, user.setupCodeHash);
    if (!match) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    if (!initialPassword || password !== initialPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: { email, passwordHash: null, setupCodeHash: null },
    });
  }

  const token = await signSession({ email, mustSetPassword: true });
  const res = NextResponse.json({ ok: true, mustSetPassword: true });
  res.cookies.set(sessionCookieName(), token, sessionCookieOptions());
  return res;
}
