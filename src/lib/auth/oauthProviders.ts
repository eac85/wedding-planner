import type { Provider } from "@supabase/supabase-js";

/** Providers we allow via env (must match Supabase + Auth UI). */
const ALLOWED: readonly Provider[] = [
  "apple",
  "azure",
  "bitbucket",
  "discord",
  "facebook",
  "figma",
  "github",
  "gitlab",
  "google",
  "kakao",
  "keycloak",
  "linkedin",
  "linkedin_oidc",
  "notion",
  "slack",
  "slack_oidc",
  "spotify",
  "twitch",
];

/**
 * Parse `NEXT_PUBLIC_AUTH_OAUTH_PROVIDERS` (comma-separated, e.g. `google`).
 * Empty / unset → no OAuth buttons (email/password or magic link only).
 */
export function parseOAuthProvidersFromEnv(): Provider[] {
  const raw = process.env.NEXT_PUBLIC_AUTH_OAUTH_PROVIDERS?.trim();
  if (!raw) return [];

  const out: Provider[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const p = part.trim().toLowerCase() as Provider;
    if (!ALLOWED.includes(p) || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}
