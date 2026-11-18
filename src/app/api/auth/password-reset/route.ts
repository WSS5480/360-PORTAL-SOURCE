/**
 * Password reset email delivery via Microsoft Graph.
 * Uses Supabase admin generateLink to create a recovery link, then sends via our mailer.
 * Always returns 200 { ok: true } to avoid account enumeration.
 */

import { NextResponse } from "next/server";
import { sendPasswordRecoveryEmail } from "@/lib/auth/sendPasswordRecoveryEmail";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const next = typeof body?.next === "string" ? body.next.trim() : "/portal";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    const result = await sendPasswordRecoveryEmail({ email, next, request: req });
    if (!result.sent) {
      console.warn("[password-reset] not sent:", result.reason);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[password-reset] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true });
  }
}
