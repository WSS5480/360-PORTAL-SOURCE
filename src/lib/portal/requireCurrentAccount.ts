import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  getPortalContext,
  type GetPortalContextOptions,
  type PortalContext,
} from "@/lib/portal/getPortalContext";

export async function requireCurrentAccount(opts?: GetPortalContextOptions) {
  return getPortalContext(opts);
}

export type PortalContextWithUser = PortalContext & { user: User };

/** Use after `requireCurrentAccount({ allowMissingSession: true })` in Route Handlers (avoid redirect → HTML 200). */
export function assertPortalAuth(ctx: PortalContext): NextResponse | null {
  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
