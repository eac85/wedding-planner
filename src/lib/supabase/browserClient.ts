import { createBrowserClient } from "@supabase/ssr";

// Browser client: uses Supabase RLS for per-user/per-wedding access control.
// Never expose the service role key to the browser.
//
// Lazily created so `next build` doesn't crash when env vars are not present yet.
export function supabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase browser env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  return createBrowserClient(supabaseUrl, anonKey);
}

