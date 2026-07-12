const { requireSession } = require("./lib/auth");
const { getAccessToken } = require("./lib/google");

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { eventId } = JSON.parse(event.body || "{}");
    if (!eventId) return { statusCode: 400, body: JSON.stringify({ error: "eventId is required" }) };
    const token = await getAccessToken();
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 410) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ? json.error.message : "Failed to delete event");
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    if (e.code === "GOOGLE_NOT_CONNECTED") {
      return { statusCode: 409, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "GOOGLE_NOT_CONNECTED" }) };
    }
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
