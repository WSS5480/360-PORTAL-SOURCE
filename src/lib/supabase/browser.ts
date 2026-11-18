// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";

function mustGetPublicEnv() {
  // IMPORTANT: Next only inlines NEXT_PUBLIC_* env vars in client bundles
  // when they are accessed as literals (not process.env[name]).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!anon) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return { url, anon };
}

function isUnreachableFetchError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("could not be resolved") ||
    m.includes("getaddrinfo") ||
    m.includes("network request failed") ||
    m.includes("internet connection") ||
    m.includes("offline")
  );
}

/** Throw here so DevTools highlights this frame instead of the inner `fetch` call. */
function rethrowUnreachableSupabaseFetch(supabaseUrl: string, e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (!isUnreachableFetchError(msg)) throw e;

  const isDns = msg.includes("could not be resolved") || msg.includes("getaddrinfo");
  const detail =
    process.env.NODE_ENV === "development"
      ? isDns
        ? `Hostname did not resolve — copy Project URL from Supabase Dashboard → Settings → API. (${String(supabaseUrl).slice(0, 52)}…)`
        : `Cannot reach Supabase — check NEXT_PUBLIC_SUPABASE_URL, VPN/firewall, and that the project is active. (${String(supabaseUrl).slice(0, 52)}…)`
      : "Cannot reach the sign-in service. Check your network connection.";

  throw new TypeError(`[Supabase] ${detail}`);
}

/** Surfaces DNS / offline / wrong URL instead of a bare "Failed to fetch". */
function fetchWithDevHint(supabaseUrl: string): typeof fetch {
  return async (input, init) => {
    try {
      return await fetch(input, init);
    } catch (e) {
      rethrowUnreachableSupabaseFetch(supabaseUrl, e);
    }
  };
}

export function supabaseBrowser() {
  const { url, anon } = mustGetPublicEnv();
  // With cookie-based SSR, background `autoRefreshToken` in the browser races middleware and
  // server `getUser()` refresh (single-use refresh token) and causes random logouts.
  // Set NEXT_PUBLIC_AUTH_BROWSER_AUTO_REFRESH=true only if you intentionally need client-only refresh.
  const browserAutoRefresh =
    String(process.env.NEXT_PUBLIC_AUTH_BROWSER_AUTO_REFRESH || "")
      .trim()
      .toLowerCase() === "true";

  return createBrowserClient(url, anon, {
    auth: {
      autoRefreshToken: browserAutoRefresh,
    },
    global: {
      fetch: fetchWithDevHint(url),
    },
  });
}
