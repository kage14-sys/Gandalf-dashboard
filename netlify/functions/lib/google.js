const { getServiceClient } = require("./supabase");

const TOKEN_ROW_ID = "google";

async function getStoredTokens() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("gandalf_tokens")
    .select("tokens")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle();
  if (error) throw new Error("Supabase error reading tokens: " + error.message);
  return data ? data.tokens : null;
}

async function storeTokens(tokens) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("gandalf_tokens")
    .upsert({ id: TOKEN_ROW_ID, tokens, updated_at: new Date().toISOString() });
  if (error) throw new Error("Supabase error storing tokens: " + error.message);
}

// Exchanges a refresh token for a fresh access token. Google issues a
// refresh_token only on first consent (with access_type=offline & prompt=consent),
// so we keep reusing the same one indefinitely unless it's revoked.
async function getAccessToken() {
  const stored = await getStoredTokens();
  if (!stored || !stored.refresh_token) {
    const err = new Error("GOOGLE_NOT_CONNECTED");
    err.code = "GOOGLE_NOT_CONNECTED";
    throw err;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
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

module.exports = { getAccessToken, getStoredTokens, storeTokens };
