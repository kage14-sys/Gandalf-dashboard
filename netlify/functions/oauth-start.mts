// build: force-rebuild-2
import type { Config } from "@netlify/functions";
import { requireSession } from "./lib/auth.mts";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export default async (req: Request) => {
  // Only Kurt (already past the password gate) can kick off the Google consent flow.
  if (!requireSession(req)) {
    return new Response("Unauthorized. Log in to the dashboard first.", { status: 401 });
  }
  const clientId = Netlify.env.get("GOOGLE_CLIENT_ID");
  const siteUrl = Netlify.env.get("SITE_URL");
  if (!clientId || !siteUrl) {
    return new Response("GOOGLE_CLIENT_ID or SITE_URL is not configured on the server.", { status: 500 });
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/.netlify/functions/oauth-callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES.join(" "),
  });
  return new Response(null, {
    status: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` },
  });
};

export const config: Config = { path: "/auth/google/start" };
