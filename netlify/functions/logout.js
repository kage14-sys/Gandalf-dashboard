const { clearCookieHeader } = require("./lib/auth");

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Set-Cookie": clearCookieHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
