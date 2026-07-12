const { requireSession } = require("./lib/auth");
const { getAccessToken } = require("./lib/google");

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
  try {
    const qs = event.queryStringParameters || {};
    const token = await getAccessToken();
    const params = new URLSearchParams({
      timeMin: qs.startTime,
      timeMax: qs.endTime,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ? json.error.message : "Calendar list failed");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: json.items || [] }),
    };
  } catch (e) {
    if (e.code === "GOOGLE_NOT_CONNECTED") {
      return { statusCode: 409, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "GOOGLE_NOT_CONNECTED" }) };
    }
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
