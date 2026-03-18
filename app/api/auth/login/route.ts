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
  const debugReason = req.headers.get("x-debug-reason") === "1";
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

  const domainCheckPass = Boolean(allowedDomain && email.endsWith(`@${allowedDomain}`));
  if (!domainCheckPass) {
    console.warn("[auth] 401: domain check failed", { allowedDomain, emailEnd: email.slice(-20) });
    return NextResponse.json(
      { error: "Unauthorized", ...(debugReason && { reason: "domain_check" }) },
      { status: 401 }
    );
  }

  let user = await prisma.user.findUnique({ where: { email } });

  // If a per-user setup code exists, accept it even if a personal password exists.
  if (user?.setupCodeHash) {
    const match = await compare(password, user.setupCodeHash);
    if (match) {
      const token = await signSession({ email, mustSetPassword: true });
      const res = NextResponse.json({ ok: true, mustSetPassword: true });
      res.cookies.set(sessionCookieName(), token, sessionCookieOptions());
      return res;
    }
    return NextResponse.json(
      { error: "Unauthorized", ...(debugReason && { reason: "setup_code_mismatch" }) },
      { status: 401 }
    );
  }

  // Normal login with personal password (when set).
  if (user?.passwordHash) {
    const match = await compare(password, user.passwordHash);
    if (!match) {
      console.warn("[auth] 401: password hash mismatch", { email });
      return NextResponse.json(
        { error: "Unauthorized", ...(debugReason && { reason: "password_mismatch" }) },
        { status: 401 }
      );
    }
    const token = await signSession({ email });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), token, sessionCookieOptions());
    return res;
  }

  // First login / no personal password yet: fallback to global initial password (env).
  const initialMatch = Boolean(initialPassword && password === initialPassword);
  if (!initialMatch) {
    console.warn("[auth] 401: no user/setupCode or initial password wrong", {
      hasUser: !!user,
      hasInitialEnv: !!initialPassword,
    });
    return NextResponse.json(
      {
        error: "Unauthorized",
        ...(debugReason && {
          reason: user ? "initial_password_mismatch" : "no_user_or_setup_mismatch",
        }),
      },
      { status: 401 }
    );
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
