// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Session-scoped Supabase client (uses the caller's cookies).
 * NOTE: In Next.js 16.1.x (Turbopack), cookies() may be Promise-like in runtime/types,
 * so we treat it as async and await it.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustGetEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Some contexts have read-only cookies (Server Components render).
            // Middleware should handle refresh/sync on real requests.
          }
        },
      },
    }
  );
}

/**
 * Backwards-compatible alias for existing code:
 * Many files import { supabaseServer } from "@/lib/supabase/server"
 */
export const supabaseServer = createSupabaseServerClient;

/**
 * Service-role Supabase client (server-only).
 * Use ONLY after verifying the caller is authorized.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const storageOverride = process.env.SUPABASE_STORAGE_URL;

  const customFetch = storageOverride
    ? (() => {
        const base = new URL(supabaseUrl);
        const storageBase = `${base.origin}${base.pathname.replace(/\/$/, "")}/storage/v1`;
        return (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
          if (url.startsWith(storageBase)) {
            const rewritten = url.replace(storageBase, storageOverride.replace(/\/$/, ""));
            return fetch(rewritten, init);
          }
          return fetch(input, init);
        };
      })()
    : undefined;

  return createClient(supabaseUrl, mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(customFetch && { global: { fetch: customFetch } }),
  });
}
