import { NextResponse } from "next/server";
import { z } from "zod";

import {
  sessionCookieName,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";

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
    // Try JSON first, then formData for maximum compatibility
    body = await req.json().catch(async () => {
      const raw = await req.text().catch(() => "");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          // fall through to formData
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

  const allowedDomain = "lavik-media.com";
  const sharedPassword = "lavik-2026";

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

