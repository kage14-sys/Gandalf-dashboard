const { sessionCookieHeader } = require("./lib/auth");

const THIRTY_DAYS = 60 * 60 * 24 * 30;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  let password;
  try {
    password = JSON.parse(event.body || "{}").password;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }
  if (!process.env.DASHBOARD_PASSWORD) {
    return { statusCode: 500, body: JSON.stringify({ error: "DASHBOARD_PASSWORD is not configured on the server." }) };
  }
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: "Incorrect password." }) };
  }
  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": sessionCookieHeader(THIRTY_DAYS),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ok: true }),
  };
};
