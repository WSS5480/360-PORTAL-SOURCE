import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import {
  computeSurgicalBillingChecklist,
  surgicalCaseRequiresBillingWorkflow,
  type BillingReadinessLevel,
} from "@/lib/surgical-sales/billingReadiness";
import { providerSpecialtyLabel } from "@/lib/surgical-sales/caseExecutionHeaderHelpers";
import { contactDisplayName, formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";

export type SurgicalCaseListRow = {
  id: string;
  case_number: string;
  account_id: string;
  surgeon_contact_id?: string | null;
  sales_rep_id?: string;
  case_date: string | null;
  /** Local time-of-day for the case (e.g. HH:MM:SS). */
  case_time?: string | null;
  procedure_type?: string | null;
  case_type?: string | null;
  product_id?: string | null;
  status: string;
  expected_revenue?: number | null;
  actual_revenue?: number | null;
  notes?: string | null;
  note_count?: number | null;
  latest_note_body?: string | null;
  observation_goal?: string | null;
  observation_key_questions?: string | null;
  observation_signals_to_validate?: string | null;
  observation_validation_targets?: unknown;
  observation_access_scheduling_owner?: string | null;
  observation_access_pathway?: string | null;
  observation_access_credentialing?: string | null;
  follow_up_needed?: boolean | null;
  case_support_outcome?: string | null;
  case_product_needs?: string | null;
  live_observation_product_fit?: string | null;
  live_observation_competitors?: string | null;
  live_observation_staff_process?: string | null;
  observation_quick_finding_product_interest?: string | null;
  debrief_key_findings?: string | null;
  case_implants_on_site?: string | null;
  case_trays_sterilization_status?: string | null;
  case_support_coverage?: string | null;
  case_operational_risks?: string | null;
  related_opportunity_id?: string | null;
  created_at?: string;
  updated_at?: string;
  billing_reviewed_at?: string | null;
  billing_reviewed_by_user_id?: string | null;
  billing_admin_notes?: string | null;
  archived_at?: string | null;
};

export type EnrichedSurgicalCaseListItem = SurgicalCaseListRow & {
  account_name: string | null;
  product_name: string | null;
  surgeon_display: string | null;
  surgeon_specialty: string | null;
  sales_rep_display?: string | null;
  has_purchase_order: boolean;
  has_invoice: boolean;
  missing_po: boolean;
  missing_invoice: boolean;
  billing_readiness: BillingReadinessLevel;
  checklist_po: boolean;
  checklist_invoice: boolean;
  checklist_quantities: boolean;
  billing_checklist_score: number;
  requires_billing_workflow: boolean;
  /** Surgeon on file but no linked support contacts (relationships as primary). */
  surgeon_missing_support: boolean;
};

const CHUNK = 120;

export async function enrichSurgicalCasesForList(rows: SurgicalCaseListRow[]): Promise<EnrichedSurgicalCaseListItem[]> {
  if (rows.length === 0) return [];

  const accountIds = [...new Set(rows.map((r) => String(r.account_id)).filter(Boolean))];
  const productIds = [...new Set(rows.map((r) => (r.product_id ? String(r.product_id) : "")).filter(Boolean))];
  const surgeonIds = [...new Set(rows.map((r) => (r.surgeon_contact_id ? String(r.surgeon_contact_id) : "")).filter(Boolean))];
  const caseIds = rows.map((r) => r.id);
  const repIds = [...new Set(rows.map((r) => (r.sales_rep_id ? String(r.sales_rep_id) : "")).filter(Boolean))];

  const accountNameBy = new Map<string, string>();
  for (let i = 0; i < accountIds.length; i += CHUNK) {
    const slice = accountIds.slice(i, i + CHUNK);
    const { data } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", slice);
    for (const a of data || []) {
      accountNameBy.set(String((a as { id: string }).id), String((a as { name?: string | null }).name ?? ""));
    }
  }

  const productNameBy = new Map<string, string>();
  for (let i = 0; i < productIds.length; i += CHUNK) {
    const slice = productIds.slice(i, i + CHUNK);
    const { data } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", slice);
    for (const p of data || []) {
      productNameBy.set(String((p as { id: string }).id), String((p as { name?: string | null }).name ?? ""));
    }
  }

  const surgeonBy = new Map<string, string>();
  const surgeonSpecialtyBy = new Map<string, string | null>();
  for (let i = 0; i < surgeonIds.length; i += CHUNK) {
    const slice = surgeonIds.slice(i, i + CHUNK);
    const { data } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, first_name, last_name, email, provider_procedure_focus, title")
      .in("id", slice);
    for (const c of data || []) {
      const row = c as {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        provider_procedure_focus?: string | null;
        title?: string | null;
      };
      surgeonBy.set(
        String(row.id),
        contactDisplayName(row),
      );
      surgeonSpecialtyBy.set(String(row.id), providerSpecialtyLabel(row, null));
    }
  }

  const repDisplayBy = new Map<string, string>();
  if (repIds.length > 0) {
    for (let i = 0; i < repIds.length; i += CHUNK) {
      const slice = repIds.slice(i, i + CHUNK);
      const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", slice);
      for (const r of data || []) {
        const id = String((r as { user_id: string }).user_id);
        const fn = String((r as { full_name?: string | null }).full_name ?? "").trim();
        const em = String((r as { email?: string | null }).email ?? "").trim();
        repDisplayBy.set(id, fn || em || id);
      }
    }
  }

  const docTypesByCase = new Map<string, Set<string>>();
  for (let i = 0; i < caseIds.length; i += CHUNK) {
    const slice = caseIds.slice(i, i + CHUNK);
    const { data } = await supabaseAdmin.from("surgical_sales_case_documents").select("case_id, document_type").in("case_id", slice);
    for (const d of data || []) {
      const cid = String((d as { case_id: string }).case_id);
      const t = String((d as { document_type: string }).document_type).toLowerCase();
      if (!docTypesByCase.has(cid)) docTypesByCase.set(cid, new Set());
      docTypesByCase.get(cid)!.add(t);
    }
  }

  const lineRowsByCase = new Map<string, { actual_quantity: unknown }[]>();
  for (let i = 0; i < caseIds.length; i += CHUNK) {
    const slice = caseIds.slice(i, i + CHUNK);
    const { data } = await supabaseAdmin
      .from("surgical_sales_case_products")
      .select("case_id, actual_quantity")
      .in("case_id", slice);
    for (const row of data || []) {
      const cid = String((row as { case_id: string }).case_id);
      if (!lineRowsByCase.has(cid)) lineRowsByCase.set(cid, []);
      lineRowsByCase.get(cid)!.push({ actual_quantity: (row as { actual_quantity?: unknown }).actual_quantity });
    }
  }

  const surgeonsWithSupportRel = new Set<string>();
  if (surgeonIds.length > 0) {
    for (let i = 0; i < surgeonIds.length; i += CHUNK) {
      const slice = surgeonIds.slice(i, i + CHUNK);
      const { data: relRows } = await supabaseAdmin
        .from("surgical_sales_contact_relationships")
        .select("primary_contact_id")
        .in("primary_contact_id", slice);
      for (const row of relRows || []) {
        surgeonsWithSupportRel.add(String((row as { primary_contact_id: string }).primary_contact_id));
      }
    }
  }

  const noteCountByCase = new Map<string, number>();
  const latestNoteByCase = new Map<string, { body: string; createdAt: string }>();
  for (let i = 0; i < caseIds.length; i += CHUNK) {
    const slice = caseIds.slice(i, i + CHUNK);
    const { data } = await supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("case_id, activity_type, body, created_at")
      .in("case_id", slice);
    for (const row of data || []) {
      const activityType = String((row as { activity_type?: string | null }).activity_type ?? "").trim().toLowerCase();
      const body = String((row as { body?: string | null }).body ?? "").trim();
      if (activityType !== "note" || !body) continue;
      const cid = String((row as { case_id: string }).case_id);
      noteCountByCase.set(cid, (noteCountByCase.get(cid) ?? 0) + 1);
      const createdAt = String((row as { created_at?: string | null }).created_at ?? "");
      const existing = latestNoteByCase.get(cid);
      if (!existing || createdAt.localeCompare(existing.createdAt) > 0) {
        latestNoteByCase.set(cid, { body, createdAt });
      }
    }
  }

  return rows.map((r) => {
    const types = docTypesByCase.get(r.id) ?? new Set();
    const hasPo = types.has("purchase_order");
    const hasInv = types.has("invoice");
    const sid = r.surgeon_contact_id ? String(r.surgeon_contact_id) : null;
    const repId = r.sales_rep_id ? String(r.sales_rep_id) : null;
    const lineRows = lineRowsByCase.get(r.id) ?? [];
    const requiresBilling = surgicalCaseRequiresBillingWorkflow({
      caseType: r.case_type,
      productId: r.product_id,
      productLineCount: lineRows.length,
    });
    const chk = computeSurgicalBillingChecklist(String(r.status ?? ""), hasPo, hasInv, lineRows, requiresBilling);
    const surgeonMissingSupport = Boolean(sid && !surgeonsWithSupportRel.has(sid));
    return {
      ...r,
      case_number: formatSurgicalCaseNumber(r.case_number),
      note_count: noteCountByCase.get(r.id) ?? 0,
      latest_note_body: latestNoteByCase.get(r.id)?.body ?? r.latest_note_body ?? null,
      account_name: accountNameBy.get(String(r.account_id)) ?? null,
      product_name: r.product_id ? productNameBy.get(String(r.product_id)) ?? null : null,
      surgeon_display: sid ? surgeonBy.get(sid) ?? null : null,
      surgeon_specialty: sid ? surgeonSpecialtyBy.get(sid) ?? null : null,
      sales_rep_display: repId ? repDisplayBy.get(repId) ?? null : null,
      has_purchase_order: hasPo,
      has_invoice: hasInv,
      missing_po: requiresBilling && !hasPo,
      missing_invoice: requiresBilling && !hasInv,
      billing_readiness: chk.readiness,
      checklist_po: chk.po_uploaded,
      checklist_invoice: chk.invoice_uploaded,
      checklist_quantities: chk.quantities_confirmed,
      billing_checklist_score: chk.score,
      requires_billing_workflow: requiresBilling,
      surgeon_missing_support: surgeonMissingSupport,
    };
  });
}
