import { NextResponse } from "next/server";

import { sessionCookieName, sessionCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.set(sessionCookieName(), "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return res;
}

