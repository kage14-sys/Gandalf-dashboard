const { createClient } = require("@supabase/supabase-js");

let client = null;

// Server-side only: uses the service role key, which bypasses RLS.
// Never send this client's key to the browser.
function getServiceClient() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

module.exports = { getServiceClient };
