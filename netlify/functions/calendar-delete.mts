import { requireSession, json } from "./lib/auth.mts";
import { getAccessToken, GoogleNotConnectedError } from "./lib/google.mts";

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  try {
    const { eventId } = await req.json();
    if (!eventId) return json({ error: "eventId is required" }, { status: 400 });
    const token = await getAccessToken();
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 410) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ? data.error.message : "Failed to delete event");
    }
    return json({ ok: true });
  } catch (e: any) {
    if (e instanceof GoogleNotConnectedError) {
      return json({ error: "GOOGLE_NOT_CONNECTED" }, { status: 409 });
    }
    return json({ error: e.message }, { status: 500 });
  }
};
