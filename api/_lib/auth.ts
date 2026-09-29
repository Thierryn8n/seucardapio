import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;

export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Verifies the caller's Supabase access token from the Authorization header. Throws on failure. */
export async function requireUser(req: { headers: Record<string, string | string[] | undefined> }) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const accessToken = token?.replace(/^Bearer\s+/i, "");
  if (!accessToken) throw new Error("UNAUTHORIZED");
  const { data, error } = await adminClient.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}
