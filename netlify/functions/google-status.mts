import type { Config } from "@netlify/functions";
import { requireSession, json } from "./lib/auth.mts";
import { getStoredTokens } from "./lib/google.mts";

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const tokens = await getStoredTokens();
    return json({ connected: !!(tokens && tokens.refresh_token) });
  } catch {
    return json({ connected: false });
  }
};

export const config: Config = { path: "/api/google-status" };
