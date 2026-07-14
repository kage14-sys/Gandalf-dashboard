import { requireSession, json } from "./lib/auth.mts";

export default async (req: Request) => {
  return json({ authenticated: requireSession(req) });
};
