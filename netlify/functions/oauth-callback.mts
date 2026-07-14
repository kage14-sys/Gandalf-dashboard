// build: force-rebuild-2
import type { Config } from "@netlify/functions";
import { requireSession } from "./lib/auth.mts";
import { storeTokens } from "./lib/google.mts";

export default async (req: Request) => {
  if (!requireSession(req)) {
    return new Response(
      "Unauthorized. Log in to the dashboard first, then use the Connect Google Account button.",
      { status: 401 }
    );
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return new Response(`Google returned an error: ${oauthError}`, { status: 400 });
  }
  if (!code) {
    return new Response("Missing authorization code from Google.", { status: 400 });
  }

  const siteUrl = Netlify.env.get("SITE_URL") || "";
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Netlify.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Netlify.env.get("GOOGLE_CLIENT_SECRET") || "",
      redirect_uri: `${siteUrl}/.netlify/functions/oauth-callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    return new Response(
      "Google didn't return a refresh token (it only sends one on first consent). " +
        "Go to https://myaccount.google.com/permissions, remove access for this app, then try Connect Google Account again.\n\n" +
        JSON.stringify(tokens),
      { status: 400 }
    );
  }
  await storeTokens(tokens);
  return new Response(null, { status: 302, headers: { Location: "/?connected=1" } });
};

export const config: Config = { path: "/auth/google/callback" };
