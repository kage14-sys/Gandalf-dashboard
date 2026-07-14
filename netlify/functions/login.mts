import { sessionCookieHeader, json } from "./lib/auth.mts";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  let password: string | undefined;
  try {
    password = (await req.json()).password;
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  const expected = Netlify.env.get("DASHBOARD_PASSWORD");
  if (!expected) {
    return json({ error: "DASHBOARD_PASSWORD is not configured on the server." }, { status: 500 });
  }
  if (!password || password !== expected) {
    return json({ error: "Incorrect password." }, { status: 401 });
  }

  return json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader(THIRTY_DAYS) } });
};
