// build: force-rebuild-2
import type { Config } from "@netlify/functions";
import { requireSession, json } from "./lib/auth.mts";
import { getAccessToken, GoogleNotConnectedError } from "./lib/google.mts";

function toEventTime(value: string, allDay: boolean) {
  return allDay ? { date: value.slice(0, 10) } : { dateTime: value };
}

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  try {
    const { eventId, summary, startTime, endTime, allDay } = await req.json();
    if (!eventId) return json({ error: "eventId is required" }, { status: 400 });
    const token = await getAccessToken();
    const patch: Record<string, unknown> = {};
    if (summary !== undefined) patch.summary = summary;
    if (startTime) patch.start = toEventTime(startTime, allDay);
    if (endTime) patch.end = toEventTime(endTime, allDay);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ? data.error.message : "Failed to update event");
    return json({ event: data });
  } catch (e: any) {
    if (e instanceof GoogleNotConnectedError) {
      return json({ error: "GOOGLE_NOT_CONNECTED" }, { status: 409 });
    }
    return json({ error: e.message }, { status: 500 });
  }
};

export const config: Config = { path: "/api/calendar-update" };
