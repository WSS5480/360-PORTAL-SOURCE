// src/lib/supabase/admin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let supabaseAdminSingleton: SupabaseClient | null = null;

function createSupabaseAdminClient(): SupabaseClient {
  // For self-hosted Supabase, storage may be at a different URL. Set SUPABASE_STORAGE_URL
  // if storage requests return HTML instead of JSON (e.g. Kong routing or storage not running).
  const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const storageOverride = process.env.SUPABASE_STORAGE_URL;

  function createStorageRewritingFetch(): typeof fetch {
    const base = new URL(supabaseUrl);
    const storageBase = `${base.origin}${base.pathname.replace(/\/$/, "")}/storage/v1`;
    return (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (storageOverride && url.startsWith(storageBase)) {
        const rewritten = url.replace(storageBase, storageOverride.replace(/\/$/, ""));
        return fetch(rewritten, init);
      }
      return fetch(input, init);
    };
  }

  return createClient(supabaseUrl, mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(storageOverride && { global: { fetch: createStorageRewritingFetch() } }),
  });
}

function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminSingleton) {
    supabaseAdminSingleton = createSupabaseAdminClient();
  }
  return supabaseAdminSingleton;
}

/**
 * Server-only Supabase client (service role). NEVER import this in client components.
 * Lazily initialized so accidental client-bundle imports do not throw at module load.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdminClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
