import { getServiceClient } from "./supabase.mts";

const TOKEN_ROW_ID = "google";

export class GoogleNotConnectedError extends Error {
  code = "GOOGLE_NOT_CONNECTED";
  constructor() {
    super("GOOGLE_NOT_CONNECTED");
  }
}

export async function getStoredTokens(): Promise<any> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("gandalf_tokens")
    .select("tokens")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle();
  if (error) throw new Error("Supabase error reading tokens: " + error.message);
  return data ? data.tokens : null;
}

export async function storeTokens(tokens: unknown): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("gandalf_tokens")
    .upsert({ id: TOKEN_ROW_ID, tokens, updated_at: new Date().toISOString() });
  if (error) throw new Error("Supabase error storing tokens: " + error.message);
}

// Exchanges the stored refresh token for a fresh access token. Google issues a
// refresh_token only on first consent (with access_type=offline & prompt=consent),
// so the same one is reused indefinitely unless revoked.
export async function getAccessToken(): Promise<string> {
  const stored = await getStoredTokens();
  if (!stored || !stored.refresh_token) {
    throw new GoogleNotConnectedError();
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Netlify.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Netlify.env.get("GOOGLE_CLIENT_SECRET") || "",
      refresh_token: stored.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error("Failed to refresh Google access token: " + JSON.stringify(json));
  }
  return json.access_token;
}
