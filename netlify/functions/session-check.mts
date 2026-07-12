import type { Config } from "@netlify/functions";
import { requireSession, json } from "./lib/auth.mts";

export default async (req: Request) => {
  return json({ authenticated: requireSession(req) });
};

export const config: Config = { path: "/api/session-check" };
