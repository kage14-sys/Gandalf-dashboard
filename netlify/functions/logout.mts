import { clearCookieHeader, json } from "./lib/auth.mts";

export default async () => {
  return json({ ok: true }, { headers: { "Set-Cookie": clearCookieHeader() } });
};
