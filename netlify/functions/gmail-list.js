const { requireSession } = require("./lib/auth");
const { getAccessToken } = require("./lib/google");

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
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
      (list.threads || []).map(async (t) => {
        const tRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const full = await tRes.json();
        const msg = full.messages[full.messages.length - 1];
        const headers = (msg.payload && msg.payload.headers) || [];
        const get = (name) => (headers.find((h) => h.name === name) || {}).value || "";
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
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threads, resultCountEstimate: list.resultSizeEstimate }),
    };
  } catch (e) {
    if (e.code === "GOOGLE_NOT_CONNECTED") {
      return { statusCode: 409, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "GOOGLE_NOT_CONNECTED" }) };
    }
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
