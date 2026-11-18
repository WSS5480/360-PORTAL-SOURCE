import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { PRE_CALL_PLAN_TEMPLATE_SEED_KEYS } from "@/lib/surgical-sales/preCallPlanTemplateSeeds";

/** Normalize template names so seed upserts match legacy hyphen variants. */
export function normalizePreCallPlanTemplateNameKey(name: string): string {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u2013\u2014\u2212–—]/g, "-")
    .toLowerCase();
}

function pickPreferredSystemTemplate(a: PreCallPlanTemplate, b: PreCallPlanTemplate): PreCallPlanTemplate {
  const aExact = PRE_CALL_PLAN_TEMPLATE_SEED_KEYS.has(a.name.trim());
  const bExact = PRE_CALL_PLAN_TEMPLATE_SEED_KEYS.has(b.name.trim());
  if (aExact && !bExact) return a;
  if (bExact && !aExact) return b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

/** Collapse duplicate system rows (same name modulo dash/spacing) and duplicate ids. */
export function dedupePreCallPlanTemplates(templates: PreCallPlanTemplate[]): PreCallPlanTemplate[] {
  const byId = new Map<string, PreCallPlanTemplate>();
  for (const t of templates) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }

  const custom: PreCallPlanTemplate[] = [];
  const systemByKey = new Map<string, PreCallPlanTemplate>();

  for (const t of byId.values()) {
    if (!t.isSystemTemplate) {
      custom.push(t);
      continue;
    }
    const key = normalizePreCallPlanTemplateNameKey(t.name);
    const prev = systemByKey.get(key);
    systemByKey.set(key, prev ? pickPreferredSystemTemplate(prev, t) : t);
  }

  return [...systemByKey.values(), ...custom].sort((a, b) => {
    if (a.isSystemTemplate !== b.isSystemTemplate) return a.isSystemTemplate ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export type SystemTemplateRowRef = { id: string; name: string; updated_at?: string };

/** IDs to delete when multiple system rows share the same normalized name. */
export function systemTemplateDuplicateIdsToDelete(rows: SystemTemplateRowRef[]): string[] {
  const groups = new Map<string, SystemTemplateRowRef[]>();
  for (const row of rows) {
    const key = normalizePreCallPlanTemplateNameKey(row.name);
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }

  const deleteIds: string[] = [];
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const keeper =
      group.find((r) => PRE_CALL_PLAN_TEMPLATE_SEED_KEYS.has(String(r.name).trim())) ??
      group.sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))[0];
    for (const row of group) {
      if (row.id !== keeper.id) deleteIds.push(String(row.id));
    }
  }
  return deleteIds;
}
