import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildTagsFromSeedMeta,
  seedMetaForName,
} from "@/lib/surgical-sales/preCallPlanTemplateSeedMetadata";
import {
  PRE_CALL_PLAN_TEMPLATE_SEEDS,
  PRE_CALL_PLAN_TEMPLATE_SEED_KEYS,
  preCallPlanTemplateSeedKey,
} from "@/lib/surgical-sales/preCallPlanTemplateSeeds";
import {
  dedupePreCallPlanTemplates,
  normalizePreCallPlanTemplateNameKey,
  systemTemplateDuplicateIdsToDelete,
} from "@/lib/surgical-sales/preCallPlanTemplateDedupe";
import {
  PRE_CALL_PLAN_TEMPLATE_DB_SELECT,
  templateContentToDb,
  templateFromDb,
  type PreCallPlanTemplate,
  type PreCallPlanTemplateDbRow,
} from "@/lib/surgical-sales/preCallPlanTemplateModel";

function seedToDbRow(s: (typeof PRE_CALL_PLAN_TEMPLATE_SEEDS)[number]) {
  const meta = seedMetaForName(s.name);
  return {
    name: s.name,
    product_line: s.product_line,
    template_engagement_type: s.template_engagement_type,
    ...templateContentToDb({
      procedureFocus: s.description,
      description: s.description,
      smartObjective: s.observation_goal,
      openingStatement: s.pre_observation_impact_opening_statement,
      probes: s.pre_observation_probes,
      toolsResources: s.pre_observation_tools_resources,
      valueHypothesis: s.pre_observation_value_hypothesis,
      plannedClose: s.pre_observation_planned_close,
      suggestedNextStep: s.suggested_next_step,
      tags: buildTagsFromSeedMeta(meta),
    }),
    is_system: true,
    owner_user_id: null,
    created_by_user_id: null,
    updated_at: new Date().toISOString(),
  };
}

const NORMALIZED_SEED_NAME_KEYS = new Set(
  PRE_CALL_PLAN_TEMPLATE_SEEDS.map((s) => normalizePreCallPlanTemplateNameKey(s.name)),
);

/** Idempotent sync: upsert curated system playbooks by stable name; remove obsolete system rows. */
export async function ensurePreCallPlanSystemTemplates(): Promise<void> {
  const { data: existing, error: listErr } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .select("id, name, updated_at")
    .eq("is_system", true);
  if (listErr) throw new Error(listErr.message);

  const rows = (existing ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    updated_at: String(r.updated_at ?? ""),
  }));

  const obsoleteIds = rows
    .filter((r) => !NORMALIZED_SEED_NAME_KEYS.has(normalizePreCallPlanTemplateNameKey(r.name)))
    .map((r) => r.id);
  const duplicateIds = systemTemplateDuplicateIdsToDelete(rows);
  const deleteIds = [...new Set([...obsoleteIds, ...duplicateIds])];

  if (deleteIds.length > 0) {
    const { error: delErr } = await supabaseAdmin
      .from("sales_pre_call_plan_templates")
      .delete()
      .in("id", deleteIds);
    if (delErr) throw new Error(delErr.message);
  }

  const surviving = rows.filter((r) => !deleteIds.includes(r.id));
  const existingByName = new Map<string, string>();
  const existingByNormalized = new Map<string, string>();
  for (const r of surviving) {
    const trimmed = r.name.trim();
    existingByName.set(trimmed, r.id);
    existingByNormalized.set(normalizePreCallPlanTemplateNameKey(trimmed), r.id);
  }

  for (const seed of PRE_CALL_PLAN_TEMPLATE_SEEDS) {
    const key = preCallPlanTemplateSeedKey(seed);
    const row = seedToDbRow(seed);
    const existingId =
      existingByName.get(key) ?? existingByNormalized.get(normalizePreCallPlanTemplateNameKey(key));

    if (existingId) {
      const { error } = await supabaseAdmin
        .from("sales_pre_call_plan_templates")
        .update(row)
        .eq("id", existingId)
        .eq("is_system", true);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("sales_pre_call_plan_templates").insert(row);
      if (error) throw new Error(error.message);
    }
  }
}

export async function loadFavoriteTemplateIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_template_favorites")
    .select("template_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => String(r.template_id)));
}

export function attachFavorites(
  rows: PreCallPlanTemplateDbRow[],
  favoriteIds: Set<string>,
): PreCallPlanTemplate[] {
  return rows.map((r) => templateFromDb(r, { isFavorite: favoriteIds.has(String(r.id)) }));
}

export async function fetchTemplatesForUser(
  userId: string,
  filters?: {
    product_line?: string;
    productLine?: string;
    template_engagement_type?: string;
    engagementType?: string;
    favorites_only?: boolean;
  },
): Promise<PreCallPlanTemplate[]> {
  await ensurePreCallPlanSystemTemplates();

  const productLine = filters?.productLine ?? filters?.product_line;
  const engagementType = filters?.engagementType ?? filters?.template_engagement_type;

  let q = supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .select(PRE_CALL_PLAN_TEMPLATE_DB_SELECT)
    .or(`is_system.eq.true,owner_user_id.eq.${userId}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (productLine) q = q.eq("product_line", productLine);
  if (engagementType) q = q.eq("template_engagement_type", engagementType);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const favoriteIds = await loadFavoriteTemplateIds(userId);
  let rows = attachFavorites((data ?? []) as PreCallPlanTemplateDbRow[], favoriteIds);

  if (filters?.favorites_only) {
    rows = rows.filter((r) => r.isFavorite);
  }

  rows = rows.filter((r) => r.status === "active");

  return dedupePreCallPlanTemplates(rows);
}

export async function fetchTemplateById(
  templateId: string,
  userId: string,
): Promise<PreCallPlanTemplate | null> {
  await ensurePreCallPlanSystemTemplates();

  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .select(PRE_CALL_PLAN_TEMPLATE_DB_SELECT)
    .eq("id", templateId)
    .or(`is_system.eq.true,owner_user_id.eq.${userId}`)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const favoriteIds = await loadFavoriteTemplateIds(userId);
  return attachFavorites([data as PreCallPlanTemplateDbRow], favoriteIds)[0] ?? null;
}
