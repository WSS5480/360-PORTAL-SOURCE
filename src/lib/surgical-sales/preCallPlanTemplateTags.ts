import type { SalesStage } from "@/lib/sales/stages";
import { LEGACY_OPPORTUNITY_STAGE_MAP, SALES_STAGES } from "@/lib/sales/stages";
import { isPreCallPlanProductLine, type PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export const TEMPLATE_TAG_SPECIALTY_PREFIX = "specialty:";
export const TEMPLATE_TAG_STAGE_PREFIX = "stage:";
export const TEMPLATE_TAG_PROCEDURE_PREFIX = "procedure:";
export const TEMPLATE_TAG_GENERIC = "generic";

export function specialtyTag(slug: string): string {
  return `${TEMPLATE_TAG_SPECIALTY_PREFIX}${slugifyTag(slug)}`;
}

export function stageTag(stage: string): string {
  return `${TEMPLATE_TAG_STAGE_PREFIX}${slugifyTag(stage)}`;
}

export function procedureTag(slug: string): string {
  return `${TEMPLATE_TAG_PROCEDURE_PREFIX}${slugifyTag(slug)}`;
}

export function slugifyTag(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeSalesStage(raw: string | null | undefined): SalesStage | null {
  const key = slugifyTag(String(raw ?? ""));
  if (!key) return null;
  if ((SALES_STAGES as readonly string[]).includes(key)) return key as SalesStage;
  return LEGACY_OPPORTUNITY_STAGE_MAP[key] ?? null;
}

export function parseProductLineFromText(raw: string | null | undefined): PreCallPlanProductLine | "" {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const parts = text.split(/[,;|]/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (isPreCallPlanProductLine(part)) return part;
  }
  return "";
}

export function templateSpecialtySlugs(tags: string[]): string[] {
  return tags
    .filter((t) => t.startsWith(TEMPLATE_TAG_SPECIALTY_PREFIX))
    .map((t) => t.slice(TEMPLATE_TAG_SPECIALTY_PREFIX.length));
}

export function templateStageSlugs(tags: string[]): string[] {
  return tags
    .filter((t) => t.startsWith(TEMPLATE_TAG_STAGE_PREFIX))
    .map((t) => t.slice(TEMPLATE_TAG_STAGE_PREFIX.length));
}

export function templateProcedureSlug(tags: string[]): string {
  const hit = tags.find((t) => t.startsWith(TEMPLATE_TAG_PROCEDURE_PREFIX));
  return hit ? hit.slice(TEMPLATE_TAG_PROCEDURE_PREFIX.length) : "";
}

export function isGenericTemplate(tags: string[]): boolean {
  return tags.includes(TEMPLATE_TAG_GENERIC);
}

/** Match provider free-text specialty to template specialty slugs. */
export function specialtyMatchesProvider(templateSlugs: string[], providerSpecialty: string | null | undefined): boolean {
  const provider = slugifyTag(providerSpecialty ?? "");
  if (!provider || templateSlugs.length === 0) return false;
  return templateSlugs.some(
    (slug) => provider.includes(slug) || slug.includes(provider) || tokenOverlap(provider, slug),
  );
}

function tokenOverlap(a: string, b: string): boolean {
  const ta = new Set(a.split("_").filter((t) => t.length > 2));
  const tb = new Set(b.split("_").filter((t) => t.length > 2));
  for (const t of ta) {
    if (tb.has(t)) return true;
  }
  return false;
}

export function providerSpecialtyToSlugHints(raw: string | null | undefined): string[] {
  const s = String(raw ?? "").toLowerCase();
  const hints: string[] = [];
  if (/bariatric|obesity|weight/.test(s)) hints.push("bariatric");
  if (/ortho|spine|trauma|extremit/.test(s)) hints.push("orthopedic");
  if (/plastic|reconstruct/.test(s)) hints.push("plastic_surgery");
  if (/general|surg/.test(s)) hints.push("general_surgery");
  if (/wound|vascular|podiat/.test(s)) hints.push("wound_care");
  if (/minimally|lap|endoscop/.test(s)) hints.push("minimally_invasive");
  return [...new Set(hints.map(slugifyTag).filter(Boolean))];
}
