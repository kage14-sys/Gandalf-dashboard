const { requireSession } = require("./lib/auth");
const { getServiceClient } = require("./lib/supabase");

exports.handler = async (event) => {
  if (!requireSession(event)) return { statusCode: 401, body: "Unauthorized" };
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("positions").select("data").limit(1);
    if (error) throw new Error(error.message);
    const row = (data && data[0]) || { data: {} };
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: row.data }) };
  } catch (e) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
