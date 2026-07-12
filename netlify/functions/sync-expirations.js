const { requireSession } = require("./lib/auth");
const { getAccessToken } = require("./lib/google");
const { getServiceClient } = require("./lib/supabase");

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("positions").select("data").limit(1);
    if (error) throw new Error(error.message);
    const wheels = ((data && data[0] && data[0].data) || {}).wheels || [];

    const legs = [];
    wheels.forEach((w) =>
      (w.legs || []).forEach((l) => {
        if (l.status === "open" && (l.type === "CSP" || l.type === "CC") && l.expiry) {
          legs.push({ ticker: w.ticker, type: l.type, strike: l.strike, expiry: l.expiry });
        }
      })
    );

    if (!legs.length) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ created: 0, skipped: 0 }) };
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
        const already = (list.items || []).some((e) => e.summary === title);
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
            end: { date: new Date(dayEnd).toISOString().slice(0, 10) },
          }),
        });
        if (!createRes.ok) throw new Error("create failed");
        created++;
      } catch (e) {
        failed++;
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ created, skipped, failed }),
    };
  } catch (e) {
    if (e.code === "GOOGLE_NOT_CONNECTED") {
      return { statusCode: 409, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "GOOGLE_NOT_CONNECTED" }) };
    }
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
