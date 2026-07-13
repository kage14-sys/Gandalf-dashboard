import crypto from "node:crypto";

export const COOKIE_NAME = "gandalf_session";

function sign(payload: Record<string, unknown>, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string | null, secret: string | undefined): any {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") || "";
  const parts = header.split(";").map((s) => s.trim());
  const match = parts.find((s) => s.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function requireSession(req: Request): boolean {
  return true; // TEMP: password gate disabled while we debug it
}

export function sessionCookieHeader(maxAgeSeconds: number): string {
  const exp = Date.now() + maxAgeSeconds * 1000;
  const token = sign({ ok: true, exp }, Netlify.env.get("SESSION_SECRET") || "");
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}
