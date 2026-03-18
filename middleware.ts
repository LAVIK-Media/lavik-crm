import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "lavik_crm_session";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/bot") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

async function getSessionPayload(req: NextRequest) {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (typeof payload.email !== "string") return null;
    return {
      email: payload.email,
      mustSetPassword: payload.mustSetPassword === true,
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/leads") ||
    pathname === "/set-password";
  if (!needsAuth) return NextResponse.next();

  const session = await getSessionPayload(req);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (
    session.mustSetPassword &&
    pathname !== "/set-password" &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/api/leads"))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/set-password";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};

