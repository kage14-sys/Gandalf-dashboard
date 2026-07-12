import type { Config } from "@netlify/functions";
import { requireSession, json } from "./lib/auth.mts";
import { getAccessToken, GoogleNotConnectedError } from "./lib/google.mts";

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const url = new URL(req.url);
    const token = await getAccessToken();
    const params = new URLSearchParams({
      timeMin: url.searchParams.get("startTime") || "",
      timeMax: url.searchParams.get("endTime") || "",
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ? data.error.message : "Calendar list failed");
    return json({ events: data.items || [] });
  } catch (e: any) {
    if (e instanceof GoogleNotConnectedError) {
      return json({ error: "GOOGLE_NOT_CONNECTED" }, { status: 409 });
    }
    return json({ error: e.message }, { status: 500 });
  }
};

export const config: Config = { path: "/api/calendar-list" };
