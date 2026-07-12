const { requireSession } = require("./lib/auth");
const { getAccessToken } = require("./lib/google");

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { threadId } = JSON.parse(event.body || "{}");
    if (!threadId) return { statusCode: 400, body: JSON.stringify({ error: "threadId is required" }) };
    const token = await getAccessToken();
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ? err.error.message : "Failed to trash thread");
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    if (e.code === "GOOGLE_NOT_CONNECTED") {
      return { statusCode: 409, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "GOOGLE_NOT_CONNECTED" }) };
    }
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
