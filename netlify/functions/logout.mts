// build: force-rebuild-2
import type { Config } from "@netlify/functions";
import { clearCookieHeader, json } from "./lib/auth.mts";

export default async () => {
  return json({ ok: true }, { headers: { "Set-Cookie": clearCookieHeader() } });
};

export const config: Config = { path: "/api/logout" };
