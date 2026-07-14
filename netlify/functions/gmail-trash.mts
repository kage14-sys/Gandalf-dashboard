import { requireSession, json } from "./lib/auth.mts";
import { getAccessToken, GoogleNotConnectedError } from "./lib/google.mts";

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  try {
    const { threadId } = await req.json();
    if (!threadId) return json({ error: "threadId is required" }, { status: 400 });
    const token = await getAccessToken();
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ? err.error.message : "Failed to trash thread");
    }
    return json({ ok: true });
  } catch (e: any) {
    if (e instanceof GoogleNotConnectedError) {
      return json({ error: "GOOGLE_NOT_CONNECTED" }, { status: 409 });
    }
    return json({ error: e.message }, { status: 500 });
  }
};
