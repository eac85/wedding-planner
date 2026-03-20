"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabaseBrowserClient } from "@/lib/supabase/browserClient";
import { parseOAuthProvidersFromEnv } from "@/lib/auth/oauthProviders";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function AuthCard() {
  const router = useRouter();

  const oauthProviders = useMemo(() => parseOAuthProvidersFromEnv(), []);

  /** Where OAuth providers redirect after login — must match Supabase Dashboard → Redirect URLs. */
  const oauthRedirectTo = useMemo(() => {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (typeof window === "undefined") {
      return fromEnv ? `${fromEnv}/` : undefined;
    }
    const base = (fromEnv || window.location.origin).replace(/\/$/, "");
    return `${base}/`;
  }, []);

  const supabaseClient = useMemo(() => {
    try {
      return supabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;

    const { data } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        router.push("/");
        router.refresh();
      }
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [router, supabaseClient]);

  if (!supabaseClient) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="section-title" style={{ marginBottom: 8 }}>
          Configure Supabase
        </div>
        <div className="empty-state" style={{ padding: "0 0 12px 0" }}>
          Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your environment.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="section-title" style={{ marginBottom: 8 }}>
        Sign in to your wedding
      </div>
      <Auth
        supabaseClient={supabaseClient}
        appearance={{ theme: ThemeSupa }}
        view="sign_in"
        providers={oauthProviders}
        redirectTo={oauthProviders.length ? oauthRedirectTo : undefined}
      />
    </div>
  );
}

