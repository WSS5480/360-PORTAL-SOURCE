import { supabaseAdmin } from "@/lib/supabase/admin";
import { templateHasPlanFields } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import {
  normalizePreCallPlanTemplateStatus,
  type PreCallPlanTemplateStatus,
} from "@/lib/surgical-sales/preCallPlanTemplateStatus";
import {
  PRE_CALL_PLAN_TEMPLATE_DB_SELECT,
  serializePreCallPlanTemplate,
  templateContentToDb,
  templateFromDb,
  type PreCallPlanTemplate,
  type PreCallPlanTemplateDbRow,
} from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { ensurePreCallPlanSystemTemplates } from "@/lib/surgical-sales/preCallPlanTemplateDb";
import {
  emptyPlaybookPathwayOutcomeStats,
  fetchPlaybookPathwayOutcomeStats,
} from "@/lib/surgical-sales/playbookPathwayOutcome";

export type AdminPlaybookListFilters = {
  scope?: "all" | "company" | "user";
  status?: PreCallPlanTemplateStatus | "";
  productLine?: string;
  engagementType?: string;
  search?: string;
};

export type AdminPlaybookRow = PreCallPlanTemplate & {
  ownerLabel: string | null;
  /** Completed engagements using this playbook that advanced the provider to the next pathway stage. */
  nextStageSuccessCount: number;
  /** Completed engagements using this playbook that did not advance to the next pathway stage. */
  nextStageNoAdvanceCount: number;
  /** successCount / (successCount + noAdvanceCount), or null when no completed outcomes yet. */
  nextStageConversionRatio: number | null;
};

async function loadOwnerLabels(ownerIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(ownerIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, full_name, email")
    .in("user_id", ids);
  if (error) throw new Error(error.message);

  const out = new Map<string, string>();
  for (const row of data ?? []) {
    const id = String(row.user_id ?? "");
    if (!id) continue;
    const name = String(row.full_name ?? "").trim();
    const email = String(row.email ?? "").trim();
    out.set(id, name || email || `User ${id.slice(0, 8)}`);
  }
  return out;
}

function rowMatchesSearch(row: PreCallPlanTemplateDbRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    row.name,
    row.description,
    row.procedure_focus,
    row.product_line,
    row.template_engagement_type,
    ...(row.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export async function fetchAdminPlaybooks(filters: AdminPlaybookListFilters = {}): Promise<AdminPlaybookRow[]> {
  await ensurePreCallPlanSystemTemplates();

  let q = supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .select(PRE_CALL_PLAN_TEMPLATE_DB_SELECT)
    .order("is_system", { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters.scope === "company") q = q.eq("is_system", true);
  if (filters.scope === "user") q = q.eq("is_system", false);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.productLine) q = q.eq("product_line", filters.productLine);
  if (filters.engagementType) q = q.eq("template_engagement_type", filters.engagementType);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as PreCallPlanTemplateDbRow[];
  if (filters.search?.trim()) {
    rows = rows.filter((r) => rowMatchesSearch(r, filters.search!));
  }

  const ownerLabels = await loadOwnerLabels(rows.map((r) => String(r.owner_user_id ?? "")));
  const pathwayOutcomeStats = await fetchPlaybookPathwayOutcomeStats(rows.map((r) => String(r.id)));

  return rows.map((row) => {
    const template = templateFromDb(row);
    const ownerId = row.owner_user_id ? String(row.owner_user_id) : null;
    const outcome = pathwayOutcomeStats.get(String(row.id)) ?? emptyPlaybookPathwayOutcomeStats();
    return {
      ...serializePreCallPlanTemplate(template),
      ownerLabel: ownerId ? ownerLabels.get(ownerId) ?? null : null,
      nextStageSuccessCount: outcome.successCount,
      nextStageNoAdvanceCount: outcome.noAdvanceCount,
      nextStageConversionRatio: outcome.conversionRatio,
    };
  });
}

export async function fetchAdminPlaybookById(templateId: string): Promise<AdminPlaybookRow | null> {
  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .select(PRE_CALL_PLAN_TEMPLATE_DB_SELECT)
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as PreCallPlanTemplateDbRow;
  const ownerLabels = await loadOwnerLabels([String(row.owner_user_id ?? "")]);
  const template = templateFromDb(row);
  const ownerId = row.owner_user_id ? String(row.owner_user_id) : null;
  const outcome =
    (await fetchPlaybookPathwayOutcomeStats([templateId])).get(templateId) ??
    emptyPlaybookPathwayOutcomeStats();
  return {
    ...serializePreCallPlanTemplate(template),
    ownerLabel: ownerId ? ownerLabels.get(ownerId) ?? null : null,
    nextStageSuccessCount: outcome.successCount,
    nextStageNoAdvanceCount: outcome.noAdvanceCount,
    nextStageConversionRatio: outcome.conversionRatio,
  };
}

export async function createCompanyPlaybook(input: {
  adminUserId: string;
  name: string;
  productLine: string;
  engagementType: string;
  status?: PreCallPlanTemplateStatus;
  procedureFocus?: string | null;
  description?: string | null;
  smartObjective?: string | null;
  openingStatement?: string | null;
  probes?: string | null;
  toolsResources?: string | null;
  valueHypothesis?: string | null;
  plannedClose?: string | null;
  suggestedNextStep?: string | null;
  tags?: string[] | null;
  duplicatedFromId?: string | null;
}): Promise<PreCallPlanTemplate> {
  const content = {
    procedureFocus: input.procedureFocus,
    description: input.description,
    smartObjective: input.smartObjective,
    openingStatement: input.openingStatement,
    probes: input.probes,
    toolsResources: input.toolsResources,
    valueHypothesis: input.valueHypothesis,
    plannedClose: input.plannedClose,
    suggestedNextStep: input.suggestedNextStep,
    tags: input.tags,
  };
  if (!templateHasPlanFields(content)) {
    throw new Error("Playbook must include at least one plan field.");
  }

  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .insert({
      name: input.name.trim(),
      product_line: input.productLine,
      template_engagement_type: input.engagementType,
      status: normalizePreCallPlanTemplateStatus(input.status),
      ...templateContentToDb(content),
      is_system: true,
      owner_user_id: null,
      created_by_user_id: input.adminUserId,
      duplicated_from_id: input.duplicatedFromId ?? null,
    })
    .select(PRE_CALL_PLAN_TEMPLATE_DB_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return templateFromDb(data as PreCallPlanTemplateDbRow);
}

export async function updateAdminPlaybook(
  templateId: string,
  patch: Record<string, unknown>,
): Promise<PreCallPlanTemplate> {
  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .select(PRE_CALL_PLAN_TEMPLATE_DB_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return templateFromDb(data as PreCallPlanTemplateDbRow);
}

export async function setAdminPlaybookStatus(
  templateId: string,
  status: PreCallPlanTemplateStatus,
): Promise<PreCallPlanTemplate> {
  return updateAdminPlaybook(templateId, { status });
}

export async function deleteUserPlaybook(templateId: string): Promise<void> {
  const { data, error: loadErr } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .select("id, is_system")
    .eq("id", templateId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!data) throw new Error("Not found");
  if (data.is_system) throw new Error("Company playbooks cannot be deleted. Archive instead.");

  const { error } = await supabaseAdmin.from("sales_pre_call_plan_templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);
}

export async function promoteUserPlaybookToCompany(
  templateId: string,
  adminUserId: string,
): Promise<{ company: PreCallPlanTemplate; archivedSource: PreCallPlanTemplate }> {
  const source = await fetchAdminPlaybookById(templateId);
  if (!source) throw new Error("Not found");
  if (source.isSystemTemplate) throw new Error("Only user playbooks can be promoted.");

  const company = await createCompanyPlaybook({
    adminUserId,
    name: source.name,
    productLine: source.productLine,
    engagementType: source.engagementType,
    status: "active",
    procedureFocus: source.procedureFocus,
    description: source.description,
    smartObjective: source.smartObjective,
    openingStatement: source.openingStatement,
    probes: source.probes,
    toolsResources: source.toolsResources,
    valueHypothesis: source.valueHypothesis,
    plannedClose: source.plannedClose,
    suggestedNextStep: source.suggestedNextStep,
    tags: source.tags,
    duplicatedFromId: templateId,
  });

  const archivedSource = await setAdminPlaybookStatus(templateId, "archived");
  return { company, archivedSource };
}
