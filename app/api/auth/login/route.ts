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

// #region agent log
function dbg(id: string, message: string, data: Record<string, unknown>) {
  fetch("http://127.0.0.1:7495/ingest/2e4ffb3e-aeda-49a4-8728-092f227aa92b", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bd4f8" },
    body: JSON.stringify({
      sessionId: "5bd4f8",
      hypothesisId: id,
      location: "app/api/auth/login/route.ts",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

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
  // #region agent log
  dbg("H4", "body parsed", {
    parseOk: parsed.success,
    emailPrefix: parsed.success ? parsed.data.email.slice(0, 3) + "..." + parsed.data.email.slice(-20) : null,
    passwordLen: parsed.success ? parsed.data.password.length : 0,
  });
  // #endregion
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowedDomain = process.env.AUTH_ALLOWED_EMAIL_DOMAIN;
  const initialPassword = process.env.AUTH_INITIAL_PASSWORD;

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  const domainCheckPass = Boolean(allowedDomain && email.endsWith(`@${allowedDomain}`));
  // #region agent log
  dbg("H1", "domain check", {
    hasAllowedDomain: Boolean(allowedDomain),
    allowedDomainLen: allowedDomain?.length ?? 0,
    emailSuffix: email.slice(-25),
    domainCheckPass,
  });
  // #endregion
  if (!domainCheckPass) {
    console.warn("[auth] 401: domain check failed", { allowedDomain, emailEnd: email.slice(-20) });
    return NextResponse.json(
      { error: "Unauthorized", ...(debugReason && { reason: "domain_check" }) },
      { status: 401 }
    );
  }

  let user = await prisma.user.findUnique({ where: { email } });
  // #region agent log
  dbg("H2", "user lookup", {
    userFound: !!user,
    hasSetupCodeHash: !!user?.setupCodeHash,
    hasPasswordHash: !!user?.passwordHash,
  });
  // #endregion

  // If a per-user setup code exists, accept it even if a personal password exists.
  if (user?.setupCodeHash) {
    const match = await compare(password, user.setupCodeHash);
    // #region agent log
    dbg("H3", "setupCode compare", { match });
    // #endregion
    if (match) {
      // #region agent log
      dbg("OK", "login success", { path: "setupCode" });
      // #endregion
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
    // #region agent log
    dbg("H3", "passwordHash compare", { match });
    // #endregion
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
  // #region agent log
  dbg("H5", "initial password branch", {
    hasUser: !!user,
    hasInitialEnv: !!initialPassword,
    initialMatch,
  });
  // #endregion
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

  // #region agent log
  dbg("OK", "login success", { path: "initial" });
  // #endregion
  const token = await signSession({ email, mustSetPassword: true });
  const res = NextResponse.json({ ok: true, mustSetPassword: true });
  res.cookies.set(sessionCookieName(), token, sessionCookieOptions());
  return res;
}
