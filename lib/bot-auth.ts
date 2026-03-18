import crypto from "node:crypto";

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function getBotApiKeyFromRequest(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const bearerPrefix = "bearer ";
  if (auth.toLowerCase().startsWith(bearerPrefix)) {
    const token = auth.slice(bearerPrefix.length).trim();
    return token.length ? token : null;
  }

  const headerKey = req.headers.get("x-bot-api-key");
  return headerKey?.trim() ? headerKey.trim() : null;
}

export function assertBotAuthorized(req: Request) {
  const expected = process.env.BOT_API_KEY;
  if (!expected) {
    return { ok: false as const, status: 500 as const, error: "Server misconfigured" };
  }

  const got = getBotApiKeyFromRequest(req);
  if (!got) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  if (!timingSafeEqual(got, expected)) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  return { ok: true as const };
}

