import { requireSession, json } from "./lib/auth.mts";
import { getAccessToken, GoogleNotConnectedError } from "./lib/google.mts";

function toEventTime(value: string, allDay: boolean) {
  return allDay ? { date: value.slice(0, 10) } : { dateTime: value };
}

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  try {
    const { summary, startTime, endTime, allDay, description } = await req.json();
    if (!summary || !startTime || !endTime) {
      return json({ error: "summary, startTime, and endTime are required" }, { status: 400 });
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ? data.error.message : "Failed to create event");
    return json({ event: data });
  } catch (e: any) {
    if (e instanceof GoogleNotConnectedError) {
      return json({ error: "GOOGLE_NOT_CONNECTED" }, { status: 409 });
    }
    return json({ error: e.message }, { status: 500 });
  }
};
