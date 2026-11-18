import type { NextRequest } from "next/server";

/**
 * Read Supabase SSR auth cookie(s) and decode access_token JWT `exp` without verifying
 * the signature. Used only to decide whether middleware should call `getUser()` (refresh).
 * RSC/API routes still use the real Supabase client and server-side validation.
 */

const AUTH_TOKEN_SUFFIX = "-auth-token";

function base64UrlToUtf8(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return atob(b64 + pad);
}

function jwtExpUnixSeconds(accessToken: string): number | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(base64UrlToUtf8(parts[1])) as { exp?: unknown };
    return typeof payload.exp === "number" && Number.isFinite(payload.exp) ? payload.exp : null;
  } catch {
    return null;
  }
}

function decodeSessionJson(raw: string): { access_token?: string } | null {
  let s = raw;
  try {
    if (s.startsWith("base64-")) {
      s = base64UrlToUtf8(s.slice("base64-".length));
    }
    try {
      return JSON.parse(s) as { access_token?: string };
    } catch {
      return JSON.parse(decodeURIComponent(s)) as { access_token?: string };
    }
  } catch {
    return null;
  }
}

/** Storage key is e.g. `sb-<ref>-auth-token` (strip `.0` chunk suffix). */
function authStorageKeysFromRequest(req: NextRequest): string[] {
  const keys = new Set<string>();
  for (const { name } of req.cookies.getAll()) {
    if (!name.startsWith("sb-") || !name.includes(AUTH_TOKEN_SUFFIX)) continue;
    keys.add(name.replace(/\.\d+$/, ""));
  }
  return [...keys];
}

export function readAccessTokenExpFromRequestCookies(req: NextRequest): number | null {
  const all = req.cookies.getAll();
  for (const baseKey of authStorageKeysFromRequest(req)) {
    const direct = all.find((c) => c.name === baseKey)?.value;
    if (direct) {
      const session = decodeSessionJson(direct);
      const at = session?.access_token;
      if (typeof at === "string" && at.length > 20) {
        const exp = jwtExpUnixSeconds(at);
        if (exp != null) return exp;
      }
    }
    const parts: string[] = [];
    for (let i = 0; i < 32; i++) {
      const v = all.find((c) => c.name === `${baseKey}.${i}`)?.value;
      if (!v) break;
      parts.push(v);
    }
    if (parts.length) {
      const session = decodeSessionJson(parts.join(""));
      const at = session?.access_token;
      if (typeof at === "string" && at.length > 20) {
        const exp = jwtExpUnixSeconds(at);
        if (exp != null) return exp;
      }
    }
  }
  return null;
}

/**
 * If true, middleware can skip `getUser()` — access token still valid for at least `marginSec`.
 * Skipping reduces refresh-token races (single-use) when many RSC/prefetch requests hit Edge.
 */
export function shouldSkipSupabaseMiddlewareRefresh(req: NextRequest, marginSec: number): boolean {
  const exp = readAccessTokenExpFromRequestCookies(req);
  if (exp == null) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp > now + Math.max(30, marginSec);
}
