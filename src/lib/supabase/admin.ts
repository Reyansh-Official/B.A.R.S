import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses row-level security. Only use after the server has authorized the request itself
// (e.g. a patient's private key matched).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
