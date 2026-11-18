import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";

export function auditClientIp(req: Request | null | undefined): string | null {
  if (!req) return null;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

/** Best-effort CRM audit row (portal + admin actions). */
export async function logSurgicalSalesCrmAudit(params: {
  actorUserId: string;
  action: string;
  meta?: Record<string, unknown>;
  req?: Request | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from("surgical_sales_admin_audit_log").insert({
      actor_user_id: params.actorUserId,
      action: params.action,
      meta: params.meta ?? {},
      ip: auditClientIp(params.req ?? null),
      user_agent: params.req?.headers.get("user-agent") ?? null,
    });
  } catch (e) {
    console.error("[logSurgicalSalesCrmAudit]", params.action, e);
  }
}

export async function canActorArchiveSurgicalOrganization(params: {
  actorUserId: string;
  account: { surgical_crm_created_by?: string | null };
}): Promise<boolean> {
  return isSalesCrmTeamMember(params.actorUserId);
}
