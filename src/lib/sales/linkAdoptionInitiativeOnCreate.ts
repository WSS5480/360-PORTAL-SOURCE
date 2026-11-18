import { supabaseAdmin } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function linkAdoptionInitiativeOnCreate(params: {
  opportunityId: string;
  linkedEngagementId?: string | null;
  linkedCaseId?: string | null;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const oppId = String(params.opportunityId || "").trim();
  if (!UUID_RE.test(oppId)) return { ok: false, error: "Invalid opportunity id" };

  const engagementId = String(params.linkedEngagementId || "").trim();
  const caseId = String(params.linkedCaseId || "").trim();
  const now = new Date().toISOString();

  if (UUID_RE.test(engagementId)) {
    const { error } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .update({ opportunity_id: oppId, updated_at: now })
      .eq("id", engagementId)
      .is("opportunity_id", null);
    if (error) return { ok: false, error: error.message };
  }

  if (UUID_RE.test(caseId)) {
    const { error } = await supabaseAdmin
      .from("surgical_sales_cases")
      .update({ related_opportunity_id: oppId, updated_at: now })
      .eq("id", caseId);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
