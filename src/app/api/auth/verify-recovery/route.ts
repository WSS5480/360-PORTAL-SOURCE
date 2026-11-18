/**
 * Proxy for Supabase recovery verification.
 * User clicks link → hits us → we POST to Supabase verify → redirect with session.
 * Workaround for 504 when user's browser hits Supabase verify directly.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

function getBaseUrl(req: Request): string {
  const override = process.env.APP_URL_FOR_INVITES?.trim();
  if (override) return override.replace(/\/$/, "");

  const url = new URL(req.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return url.origin.replace(/\/$/, "");
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    url.origin.replace(/\/$/, "")
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || searchParams.get("token_hash");
  const type = searchParams.get("type") || "recovery";
  const next = searchParams.get("next") || "/portal";

  if (!token || !SUPABASE_URL) {
    console.warn("[verify-recovery] Missing token or SUPABASE_URL");
    return NextResponse.redirect(
      new URL(`/reset-password?error=invalid_link&next=${encodeURIComponent(next)}`, getBaseUrl(req))
    );
  }

  const base = getBaseUrl(req);
  const resetPageUrl = `${base}/reset-password?next=${encodeURIComponent(next)}`;

  try {
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
      },
      body: JSON.stringify({
        token_hash: token,
        type,
      }),
    });

    const data = (await verifyRes.json().catch(() => {})) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      msg?: string;
    };

    if (!verifyRes.ok || data?.error) {
      console.warn("[verify-recovery] Verify failed:", verifyRes.status, data?.error ?? data?.msg);
      return NextResponse.redirect(
        new URL(`/reset-password?error=expired_or_invalid&next=${encodeURIComponent(next)}`, getBaseUrl(req))
      );
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;

    if (!accessToken || !refreshToken) {
      console.warn("[verify-recovery] No tokens in response");
      return NextResponse.redirect(
        new URL(`/reset-password?error=invalid_link&next=${encodeURIComponent(next)}`, getBaseUrl(req))
      );
    }

    const hash = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken,
      type: "recovery",
    }).toString();

    return NextResponse.redirect(`${resetPageUrl}#${hash}`);
  } catch (e) {
    console.error("[verify-recovery] Error:", e instanceof Error ? e.message : e);
    return NextResponse.redirect(
      new URL(`/reset-password?error=try_again&next=${encodeURIComponent(next)}`, getBaseUrl(req))
    );
  }
}
