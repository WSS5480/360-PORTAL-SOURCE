// src/app/api/admin/email-test/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { resolveEmailMode, sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export async function POST() {
  try {
    // Ensure you’re signed in as admin
    const admin = await requireAdmin();

    // Where to send the test email
    const to =
      env("EMAIL_TEST_TO") ||
      (admin as any)?.email ||
      (admin as any)?.user?.email ||
      env("SMTP_USER") || // last resort if you’re using SMTP
      "";

    if (!to || !to.includes("@")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No valid recipient found. Set EMAIL_TEST_TO in .env.local (example: EMAIL_TEST_TO=you@360medical.net).",
        },
        { status: 400 }
      );
    }

    const subject = `360 Portal email test — ${new Date().toISOString()}`;

    const result = await sendEmail({
      to: [to],
      subject,
      text:
        "This is a test email from the 360 Portal dev server.\n\n" +
        "If you received this, outbound email is working.\n",
    });

    return NextResponse.json({
      ok: true,
      to,
      result,
      // helpful debug (safe)
      mode: resolveEmailMode(),
      from: `${process.env.EMAIL_FROM_NAME || "360 Medical"} <${process.env.EMAIL_FROM_ADDRESS || ""}>`,
    });
  } catch (err: unknown) {
    // IMPORTANT: log the real error so it shows in the dev terminal
    console.error("[/api/admin/email-test] ERROR:", err);

    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

    // In dev, include stack to unblock you fast
    const stack = err instanceof Error ? err.stack : undefined;

    return NextResponse.json(
      { ok: false, error: message, stack },
      { status: 500 }
    );
  }
}
