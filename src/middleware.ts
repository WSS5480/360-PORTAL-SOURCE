// src/middleware.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { shouldSkipSupabaseMiddlewareRefresh } from "@/lib/auth/middlewareSessionHint";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * How many seconds of access-token lifetime must remain before middleware skips `getUser()`.
 * Skipping reduces parallel refresh calls (single-use refresh token = random logouts).
 * Set `AUTH_MIDDLEWARE_REFRESH_SKIP=0` to always call `getUser()` here (more refresh traffic).
 * Override margin with `AUTH_MIDDLEWARE_REFRESH_MARGIN_SEC` (30–3600).
 */
function refreshMarginSec(): number {
  const n = Number(process.env.AUTH_MIDDLEWARE_REFRESH_MARGIN_SEC);
  if (Number.isFinite(n) && n >= 30 && n <= 3600) return Math.floor(n);
  return 180;
}

/** Redirect while keeping Supabase session cookies set on `res` (middleware refresh). */
function redirectPreservingSetCookies(req: NextRequest, res: NextResponse, pathname: string) {
  const redirect = NextResponse.redirect(urlFromRequest(req, pathname));
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    for (const c of setCookies) {
      redirect.headers.append("Set-Cookie", c);
    }
    return redirect;
  }
  for (const c of res.cookies.getAll()) {
    redirect.cookies.set(c.name, c.value);
  }
  return redirect;
}

export async function middleware(req: NextRequest) {
  // Pass refreshed auth cookies to Server Components in the same request (Supabase SSR pattern).
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const pathname = req.nextUrl.pathname;
  const hasSbCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  // Default ON: skip `getUser()` when the access JWT still has plenty of lifetime (fewer
  // refresh-token races). `AUTH_MIDDLEWARE_REFRESH_SKIP=0` forces refresh on every match.
  const refreshSkipEnabled = process.env.AUTH_MIDDLEWARE_REFRESH_SKIP !== "0";
  if (
    refreshSkipEnabled &&
    pathname !== "/" &&
    hasSbCookie &&
    shouldSkipSupabaseMiddlewareRefresh(req, refreshMarginSec())
  ) {
    return res;
  }

  const supabase = createServerClient(
    mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustGetEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            if (!value) {
              req.cookies.delete(name);
            } else {
              req.cookies.set(name, value);
            }
          }
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Cap wait time so a bad/unreachable NEXT_PUBLIC_SUPABASE_URL does not block every request for ~25s+.
  const authTimeoutMs = Math.min(
    15000,
    Math.max(1000, Number(process.env.AUTH_MIDDLEWARE_TIMEOUT_MS) || 4000)
  );

  const authResult = await Promise.race([
    supabase.auth.getUser().then((r) => ({ ok: true as const, r })),
    new Promise<{ ok: false; reason: "timeout" }>((resolve) =>
      setTimeout(() => resolve({ ok: false, reason: "timeout" }), authTimeoutMs)
    ),
  ]);

  if (!authResult.ok) {
    return res;
  }

  const { error, data } = authResult.r;

  // Do not clear Supabase cookies from middleware on auth errors — transient failures and
  // refresh-token races were logging users out (especially with many parallel RSC requests).

  if (pathname === "/") {
    if (!error && data?.user) {
      // Sales-rep-only users are redirected from /portal → /portal/sales in the portal home page.
      return redirectPreservingSetCookies(req, res, "/portal");
    }
    return redirectPreservingSetCookies(req, res, "/login");
  }

  return res;
}

export const config = {
  matcher: [
    // Skip `/api/*`: every client fetch was running middleware + `getUser()` in parallel with
    // navigations and other fetches, which races on Supabase's single-use refresh token and
    // logs users out. Route handlers still call `createServerClient` + `getUser()` and set
    // cookies on their own responses.
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
