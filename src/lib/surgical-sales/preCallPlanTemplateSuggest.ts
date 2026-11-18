import type { SalesStage } from "@/lib/sales/stages";
import { SALES_STAGE_LABEL } from "@/lib/sales/stages";
import {
  ENGAGEMENT_TYPE_LABELS,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  isGenericTemplate,
  normalizeSalesStage,
  parseProductLineFromText,
  providerSpecialtyToSlugHints,
  slugifyTag,
  specialtyMatchesProvider,
  templateProcedureSlug,
  templateSpecialtySlugs,
  templateStageSlugs,
} from "@/lib/surgical-sales/preCallPlanTemplateTags";
import {
  normalizeTemplateEngagementType,
  OPPORTUNITY_STAGE_TO_TEMPLATE_ENGAGEMENT,
  type PreCallPlanProductLine,
  type PreCallPlanTemplateEngagementType,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

function tokenOverlap(a: string, b: string): boolean {
  const ta = new Set(a.split("_").filter((t) => t.length > 2));
  const tb = new Set(b.split("_").filter((t) => t.length > 2));
  for (const t of ta) {
    if (tb.has(t)) return true;
  }
  return false;
}

function defaultSpecialtySlugFromProvider(
  providerSpecialty: string | null | undefined,
  availableSlugs: string[],
): string {
  if (!providerSpecialty?.trim() || availableSlugs.length === 0) return "";
  const provider = slugifyTag(providerSpecialty);
  const match = availableSlugs.find(
    (slug) => provider.includes(slug) || slug.includes(provider) || tokenOverlap(provider, slug),
  );
  return match ?? "";
}

export type TemplateSuggestContext = {
  /** Explicit product line from wizard or filter */
  productLine?: PreCallPlanProductLine | "";
  opportunityProductLine?: string | null;
  providerSpecialty?: string | null;
  opportunityStage?: string | null;
  crmEngagementType?: EngagementType | string | null;
  /** Primary organization label or type (e.g. hospital, ASC) for playbook matching */
  organizationType?: string | null;
  organizationName?: string | null;
};

export type ScoredTemplate = {
  template: PreCallPlanTemplate;
  score: number;
  reasons: string[];
};

export type TemplatePickerGrouping = {
  suggested: ScoredTemplate[];
  generic: PreCallPlanTemplate[];
  remainder: PreCallPlanTemplate[];
  /** Templates actually rendered in the picker (sections are disjoint). */
  displayCount: number;
  allFiltered: PreCallPlanTemplate[];
  contextSummary: string | null;
  defaultFilters: {
    productLine: PreCallPlanProductLine | "";
    engagementType: PreCallPlanTemplateEngagementType | "";
    stage: SalesStage | "";
    specialtySlug: string;
    procedureSlug: string;
  };
};

export function resolveContextProductLine(ctx: TemplateSuggestContext): PreCallPlanProductLine | "" {
  if (ctx.productLine) return ctx.productLine;
  return parseProductLineFromText(ctx.opportunityProductLine);
}

export function hasPrepProductFocus(
  ctx: TemplateSuggestContext | undefined,
  prepSpecializationTier?: PreparationSpecializationTier,
): boolean {
  if (prepSpecializationTier !== undefined) {
    return prepSpecializationTier === "high" || prepSpecializationTier === "medium";
  }
  return Boolean(resolveContextProductLine(ctx ?? {}));
}

/** Product-line template — not a neutral workflow starter. */
export function isProductSpecificPrepGuide(template: PreCallPlanTemplate): boolean {
  return Boolean(template.productLine) && !isGenericTemplate(template.tags ?? []);
}

export type PrepGuidePartition = {
  hasProductFocus: boolean;
  workflowGuides: ScoredTemplate[];
  productOverlays: ScoredTemplate[];
};

/** Split recommendations — workflow-first when no product focus; product guides are overlays only. */
export function partitionPrepGuideRecommendations(
  grouping: TemplatePickerGrouping,
  ctx: TemplateSuggestContext | undefined,
  prepSpecializationTier?: PreparationSpecializationTier,
): PrepGuidePartition {
  const hasProductFocus = hasPrepProductFocus(ctx, prepSpecializationTier);
  const genericScored: ScoredTemplate[] = grouping.generic.map((t) => ({
    template: t,
    score: 5,
    reasons: ["General workflow playbook"],
  }));

  if (hasProductFocus) {
    return {
      hasProductFocus: true,
      workflowGuides: [...grouping.suggested, ...genericScored],
      productOverlays: [],
    };
  }

  const ctxDefined = ctx ?? {};
  const suggestedIds = new Set(grouping.suggested.map((s) => s.template.id));
  const productFromSuggested = grouping.suggested.filter((s) => isProductSpecificPrepGuide(s.template));
  const productFromPool = grouping.allFiltered
    .filter((t) => isProductSpecificPrepGuide(t) && !suggestedIds.has(t.id))
    .map((t) => scoreTemplate(t, ctxDefined))
    .sort((a, b) => b.score - a.score);
  const productOverlays = [...productFromSuggested, ...productFromPool].slice(0, 6);

  const workflowFromSuggested = grouping.suggested.filter((s) => !isProductSpecificPrepGuide(s.template));
  const workflowGuides = [...workflowFromSuggested, ...genericScored].slice(0, 2);

  return {
    hasProductFocus: false,
    workflowGuides,
    productOverlays,
  };
}

export function inferTemplateEngagementType(ctx: TemplateSuggestContext): PreCallPlanTemplateEngagementType | "" {
  const fromCrm = normalizeTemplateEngagementType(ctx.crmEngagementType);
  if (fromCrm) return fromCrm;
  const stage = normalizeSalesStage(ctx.opportunityStage);
  if (stage && OPPORTUNITY_STAGE_TO_TEMPLATE_ENGAGEMENT[stage]) {
    return OPPORTUNITY_STAGE_TO_TEMPLATE_ENGAGEMENT[stage]!;
  }
  return "";
}

export function scoreTemplate(template: PreCallPlanTemplate, ctx: TemplateSuggestContext): ScoredTemplate {
  const reasons: string[] = [];
  let score = 0;
  const generic = isGenericTemplate(template.tags);
  const ctxProduct = resolveContextProductLine(ctx);
  const inferredEngagement = inferTemplateEngagementType(ctx);
  const ctxStage = normalizeSalesStage(ctx.opportunityStage);
  const templateStages = templateStageSlugs(template.tags);
  const templateSpecs = templateSpecialtySlugs(template.tags);

  if (generic) {
    score += 5;
    reasons.push("General playbook");
  }

  if (ctxProduct && template.productLine === ctxProduct) {
    score += 50;
    reasons.push(`Product line: ${ctxProduct}`);
  } else if (!ctxProduct && template.productLine && !generic) {
    score -= 12;
  }

  if (inferredEngagement && template.engagementType === inferredEngagement) {
    score += 28;
    reasons.push("Engagement type match");
  }

  if (ctxStage && templateStages.includes(ctxStage)) {
    score += 22;
    reasons.push(`Stage: ${SALES_STAGE_LABEL[ctxStage]}`);
  }

  if (ctx.providerSpecialty && specialtyMatchesProvider(templateSpecs, ctx.providerSpecialty)) {
    score += 18;
    reasons.push("Provider specialty");
  } else {
    const hints = providerSpecialtyToSlugHints(ctx.providerSpecialty);
    if (hints.some((h) => templateSpecs.includes(h))) {
      score += 12;
      reasons.push("Related specialty");
    }
  }

  if (template.isFavorite) {
    score += 6;
    reasons.push("Favorite");
  }

  const orgHint = slugifyTag(ctx.organizationType ?? ctx.organizationName ?? "");
  if (orgHint && orgHint.length > 2) {
    const hay = [
      template.name,
      template.procedureFocus ?? "",
      ...(template.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    if (hay.includes(orgHint) || tokenOverlap(orgHint, slugifyTag(template.procedureFocus ?? ""))) {
      score += 10;
      reasons.push("Organization fit");
    }
  }

  return { template, score, reasons };
}

const STRONG_MATCH_THRESHOLD = 35;

export function groupTemplatesForPicker(
  templates: PreCallPlanTemplate[],
  ctx: TemplateSuggestContext | undefined,
  filters: {
    productLine: PreCallPlanProductLine | "";
    engagementType: PreCallPlanTemplateEngagementType | "";
    stage: SalesStage | "";
    specialtySlug: string;
    procedureSlug: string;
    searchQ: string;
    favoritesOnly: boolean;
  },
  matchesSearch: (t: PreCallPlanTemplate, q: string) => boolean,
): TemplatePickerGrouping {
  const defaultProductLine = resolveContextProductLine(ctx ?? {});
  const defaultEngagement = inferTemplateEngagementType(ctx ?? {});
  const defaultStage = normalizeSalesStage(ctx?.opportunityStage) ?? "";
  const filterOptions = collectFilterOptions(templates);
  const defaultSpecialty = defaultSpecialtySlugFromProvider(ctx?.providerSpecialty, filterOptions.specialtySlugs);

  const allFiltered = templates.filter((t) => {
    if (filters.productLine && t.productLine !== filters.productLine) return false;
    if (filters.engagementType && t.engagementType !== filters.engagementType) return false;
    if (filters.favoritesOnly && !t.isFavorite) return false;
    if (filters.stage) {
      const stages = templateStageSlugs(t.tags);
      if (!stages.includes(filters.stage)) return false;
    }
    if (filters.specialtySlug) {
      const specs = templateSpecialtySlugs(t.tags);
      if (!specs.includes(filters.specialtySlug)) return false;
    }
    if (filters.procedureSlug) {
      const proc = templateProcedureSlug(t.tags) || slugifyTag(t.procedureFocus ?? "");
      if (proc !== filters.procedureSlug) return false;
    }
    return matchesSearch(t, filters.searchQ);
  });

  const genericPool = allFiltered.filter((t) => isGenericTemplate(t.tags));
  const nonGeneric = allFiltered.filter((t) => !isGenericTemplate(t.tags));

  let suggested: ScoredTemplate[] = [];
  if (ctx) {
    const scored = nonGeneric
      .map((t) => scoreTemplate(t, ctx))
      .filter((s) => s.score >= STRONG_MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score);
    suggested = scored.slice(0, 8);
  }

  let generic = genericPool;
  if (ctx && suggested.length === 0) {
    const product = defaultProductLine;
    generic = genericPool.filter((t) => !product || t.productLine === product);
    if (generic.length === 0) generic = genericPool;
  } else if (suggested.length > 0) {
    generic = [];
  }

  const contextSummary = buildContextSummary(ctx);

  const shownIds = new Set<string>();
  for (const s of suggested) shownIds.add(s.template.id);
  for (const t of generic) shownIds.add(t.id);

  const remainder = allFiltered.filter((t) => {
    if (shownIds.has(t.id)) return false;
    if (suggested.length > 0 && isGenericTemplate(t.tags)) return false;
    return true;
  });

  const displayCount = suggested.length + generic.length + remainder.length;

  return {
    suggested,
    generic,
    remainder,
    displayCount,
    allFiltered,
    contextSummary,
    defaultFilters: {
      productLine: defaultProductLine,
      engagementType: defaultEngagement,
      stage: defaultStage,
      specialtySlug: defaultSpecialty,
      procedureSlug: "",
    },
  };
}

function buildContextSummary(ctx: TemplateSuggestContext | undefined): string | null {
  if (!ctx) return null;
  const parts: string[] = [];
  const product = resolveContextProductLine(ctx);
  if (product) parts.push(product);
  const eng = inferTemplateEngagementType(ctx);
  if (eng) parts.push(ENGAGEMENT_TYPE_LABELS[eng] ?? eng.replace(/_/g, " "));
  const stage = normalizeSalesStage(ctx.opportunityStage);
  if (stage) parts.push(SALES_STAGE_LABEL[stage]);
  if (ctx.providerSpecialty?.trim()) parts.push(ctx.providerSpecialty.trim());
  const org = String(ctx.organizationName ?? ctx.organizationType ?? "").trim();
  if (org) parts.push(org);
  return parts.length ? parts.join(" · ") : null;
}

export function collectFilterOptions(templates: PreCallPlanTemplate[]) {
  const specialtySlugs = new Set<string>();
  const stageSlugs = new Set<string>();
  const procedureSlugs = new Set<string>();

  for (const t of templates) {
    for (const s of templateSpecialtySlugs(t.tags)) specialtySlugs.add(s);
    for (const s of templateStageSlugs(t.tags)) stageSlugs.add(s);
    const proc = templateProcedureSlug(t.tags) || slugifyTag(t.procedureFocus ?? "");
    if (proc && proc !== "general") procedureSlugs.add(proc);
  }

  return {
    specialtySlugs: [...specialtySlugs].sort(),
    stageSlugs: [...stageSlugs].sort(),
    procedureSlugs: [...procedureSlugs].sort(),
  };
}

export function formatFilterSlugLabel(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
