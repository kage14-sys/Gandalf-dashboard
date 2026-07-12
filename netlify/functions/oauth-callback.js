const { requireSession } = require("./lib/auth");
const { storeTokens } = require("./lib/google");

exports.handler = async (event) => {
  if (!requireSession(event)) {
    return { statusCode: 401, body: "Unauthorized. Log in to the dashboard first, then use the Connect Google Account button." };
  }
  const code = event.queryStringParameters && event.queryStringParameters.code;
  const oauthError = event.queryStringParameters && event.queryStringParameters.error;
  if (oauthError) {
    return { statusCode: 400, body: `Google returned an error: ${oauthError}` };
  }
  if (!code) {
    return { statusCode: 400, body: "Missing authorization code from Google." };
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.SITE_URL}/.netlify/functions/oauth-callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    return {
      statusCode: 400,
      body:
        "Google didn't return a refresh token (it only sends one on first consent). " +
        "Go to https://myaccount.google.com/permissions, remove access for this app, then try Connect Google Account again.\n\n" +
        JSON.stringify(tokens),
    };
  }
  await storeTokens(tokens);
  return {
    statusCode: 302,
    headers: { Location: "/?connected=1" },
  };
};
