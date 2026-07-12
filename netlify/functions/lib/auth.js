const crypto = require("crypto");

const COOKIE_NAME = "gandalf_session";

function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token, secret) {
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
  } catch (e) {
    return null;
  }
}

function getCookie(event, name) {
  const header = (event.headers && (event.headers.cookie || event.headers.Cookie)) || "";
  const parts = header.split(";").map((s) => s.trim());
  const match = parts.find((s) => s.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function requireSession(event) {
  const token = getCookie(event, COOKIE_NAME);
  const payload = verify(token, process.env.SESSION_SECRET);
  return !!(payload && payload.ok);
}

function sessionCookieHeader(maxAgeSeconds) {
  const exp = Date.now() + maxAgeSeconds * 1000;
  const token = sign({ ok: true, exp }, process.env.SESSION_SECRET);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

module.exports = { requireSession, sessionCookieHeader, clearCookieHeader, COOKIE_NAME };
