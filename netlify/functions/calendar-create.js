const { requireSession } = require("./lib/auth");
const { getAccessToken } = require("./lib/google");

function toEventTime(value, allDay) {
  return allDay ? { date: value.slice(0, 10) } : { dateTime: value };
}

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { summary, startTime, endTime, allDay, description } = JSON.parse(event.body || "{}");
    if (!summary || !startTime || !endTime) {
      return { statusCode: 400, body: JSON.stringify({ error: "summary, startTime, and endTime are required" }) };
    }
    const token = await getAccessToken();
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        description,
        start: toEventTime(startTime, allDay),
        end: toEventTime(endTime, allDay),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ? json.error.message : "Failed to create event");
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: json }) };
  } catch (e) {
    if (e.code === "GOOGLE_NOT_CONNECTED") {
      return { statusCode: 409, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "GOOGLE_NOT_CONNECTED" }) };
    }
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
