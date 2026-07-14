import { requireSession, json } from "./lib/auth.mts";
import { getAccessToken, GoogleNotConnectedError } from "./lib/google.mts";
import { getServiceClient } from "./lib/supabase.mts";

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("positions").select("data").limit(1);
    if (error) throw new Error(error.message);
    const wheels = ((data && data[0] && data[0].data) || {}).wheels || [];

    const legs: { ticker: string; type: string; strike: number; expiry: string }[] = [];
    wheels.forEach((w: any) =>
      (w.legs || []).forEach((l: any) => {
        if (l.status === "open" && (l.type === "CSP" || l.type === "CC") && l.expiry) {
          legs.push({ ticker: w.ticker, type: l.type, strike: l.strike, expiry: l.expiry });
        }
      })
    );

    if (!legs.length) {
      return json({ created: 0, skipped: 0, failed: 0 });
    }

    const token = await getAccessToken();
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const leg of legs) {
      const dayStart = new Date(leg.expiry + "T00:00:00Z");
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const title = `${leg.ticker} ${leg.type} $${leg.strike} expiry`;
      try {
        const params = new URLSearchParams({
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          singleEvents: "true",
        });
        const listRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = await listRes.json();
        const already = (list.items || []).some((e: any) => e.summary === title);
        if (already) {
          skipped++;
          continue;
        }
        const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: title,
            description: "Auto-synced from the Gandalf wheel trading dashboard.",
            start: { date: leg.expiry },
            end: { date: dayEnd.toISOString().slice(0, 10) },
          }),
        });
        if (!createRes.ok) throw new Error("create failed");
        created++;
      } catch {
        failed++;
      }
    }

    return json({ created, skipped, failed });
  } catch (e: any) {
    if (e instanceof GoogleNotConnectedError) {
      return json({ error: "GOOGLE_NOT_CONNECTED" }, { status: 409 });
    }
    return json({ error: e.message }, { status: 500 });
  }
};
