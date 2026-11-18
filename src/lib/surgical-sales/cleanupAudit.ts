import { supabaseAdmin } from "@/lib/supabase/admin";

export function cleanupClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || null;
}

export async function logSurgicalCleanupAudit(
  actorUserId: string,
  action: string,
  meta: Record<string, unknown>,
  req: Request
): Promise<void> {
  try {
    await supabaseAdmin.from("surgical_sales_admin_audit_log").insert({
      actor_user_id: actorUserId,
      action,
      meta,
      ip: cleanupClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    /* best-effort; never block cleanup result */
  }
}
