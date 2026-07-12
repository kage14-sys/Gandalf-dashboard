const { requireSession } = require("./lib/auth");
const { getStoredTokens } = require("./lib/google");

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
  try {
    const tokens = await getStoredTokens();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connected: !!(tokens && tokens.refresh_token) }),
    };
  } catch (e) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connected: false }) };
  }
};
