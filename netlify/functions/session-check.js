const { requireSession } = require("./lib/auth");

exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authenticated: requireSession(event) }),
  };
};
