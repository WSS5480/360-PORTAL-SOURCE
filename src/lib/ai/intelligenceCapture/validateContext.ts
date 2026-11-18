import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { IntelligenceCaptureContext } from "./types";

export type ContextValidationResult =
  | { ok: true }
  | { ok: false; message: string; status: 403 | 404 };

/**
 * Ensures the caller may use the supplied entity context. Does not write data.
 */
export async function validateIntelligenceCaptureContext(
  actorUserId: string,
  context: IntelligenceCaptureContext | undefined,
): Promise<ContextValidationResult> {
  if (!context) return { ok: true };

  if (context.caseId) {
    const row = await loadSurgicalCaseForPortalActor(context.caseId, actorUserId, { includeArchived: true });
    if (!row) return { ok: false, message: "Case not found or not accessible.", status: 404 };
  }

  if (context.providerId) {
    const { data, error } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id")
      .eq("id", context.providerId)
      .maybeSingle();
    if (error || !data) return { ok: false, message: "Provider not found.", status: 404 };
  }

  if (context.opportunityId) {
    const opp = await loadOpportunityForViewer(context.opportunityId, actorUserId);
    if (!opp) return { ok: false, message: "Opportunity not found or not accessible.", status: 404 };
  }

  if (context.organizationId) {
    const gate = await repCanViewSurgicalAccount(actorUserId, context.organizationId);
    if (!gate) return { ok: false, message: "Organization not found or not accessible.", status: 404 };
  }

  if (context.productIds?.length) {
    const { data, error } = await supabaseAdmin
      .from("surgical_sales_products")
      .select("id")
      .in("id", context.productIds);
    if (error) return { ok: false, message: error.message, status: 403 };
    const found = new Set((data ?? []).map((r) => String((r as { id: string }).id)));
    const missing = context.productIds.filter((id) => !found.has(id));
    if (missing.length) {
      return { ok: false, message: "One or more product IDs were not found.", status: 404 };
    }
  }

  return { ok: true };
}
