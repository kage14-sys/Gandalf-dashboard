const { requireSession } = require("./lib/auth");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

exports.handler = async (event) => {
  // Only Kurt (already past the password gate) can kick off the Google consent flow.
  if (!requireSession(event)) {
    return { statusCode: 401, body: "Unauthorized. Log in to the dashboard first." };
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.SITE_URL) {
    return { statusCode: 500, body: "GOOGLE_CLIENT_ID or SITE_URL is not configured on the server." };
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.SITE_URL}/.netlify/functions/oauth-callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES.join(" "),
  });
  return {
    statusCode: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` },
  };
};
