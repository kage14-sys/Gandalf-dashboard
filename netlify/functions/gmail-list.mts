import { requireSession, json } from "./lib/auth.mts";
import { getAccessToken, GoogleNotConnectedError } from "./lib/google.mts";

export default async (req: Request) => {
  if (!requireSession(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const token = await getAccessToken();
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/threads?" +
        new URLSearchParams({ q: "is:unread in:inbox", maxResults: "15" }),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const list = await listRes.json();
    if (!listRes.ok) throw new Error(list.error ? list.error.message : "Gmail list failed");

    const threads = await Promise.all(
      (list.threads || []).map(async (t: any) => {
        const tRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const full = await tRes.json();
        const msg = full.messages[full.messages.length - 1];
        const headers = (msg.payload && msg.payload.headers) || [];
        const get = (name: string) => (headers.find((h: any) => h.name === name) || {}).value || "";
        return {
          id: t.id,
          messageId: msg.id,
          sender: get("From"),
          subject: get("Subject"),
          snippet: msg.snippet || "",
          date: new Date(Number(msg.internalDate)).toISOString(),
        };
      })
    );
    return json({ threads, resultCountEstimate: list.resultSizeEstimate });
  } catch (e: any) {
    if (e instanceof GoogleNotConnectedError) {
      return json({ error: "GOOGLE_NOT_CONNECTED" }, { status: 409 });
    }
    return json({ error: e.message }, { status: 500 });
  }
};
