import { requireSession, json } from "./lib/auth.mts";
import { getServiceClient } from "./lib/supabase.mts";

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("positions").select("data").limit(1);
    if (error) throw new Error(error.message);
    const row = (data && data[0]) || { data: {} };
    return json({ data: row.data });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};
