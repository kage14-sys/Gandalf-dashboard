import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-side only: uses the service role key, which bypasses RLS.
// Never send this client's key to the browser.
export function getServiceClient(): SupabaseClient {
  if (!client) {
    const url = Netlify.env.get("SUPABASE_URL") || "";
    const key = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
