import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";

export const dynamic = "force-dynamic";

// IMPORTANT:
// Locking is internal-only (staff). Portal users must never be able to lock orders.
// Keep this endpoint non-functional to prevent accidental exposure.

export async function POST(req: Request) {
  // We still require an authenticated portal context so anonymous probing doesn't leak anything.
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;

  // Hide the existence of this route for portal users.
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}
