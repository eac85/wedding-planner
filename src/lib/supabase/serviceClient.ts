import { createClient } from "@supabase/supabase-js";

// Service-role client for privileged operations (invites, wedding creation).
// Lazily created to avoid crashing `next build` when env vars are not present yet.
export function supabaseService() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase service role env vars");
  }

  return createClient(supabaseUrl, serviceKey);
}

