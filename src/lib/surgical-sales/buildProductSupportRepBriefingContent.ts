import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import {
  formatRepFacingDisplayText,
  formatRepIntelligenceFieldValue,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import {
  buildProviderPriorEvidencePool,
  priorEvidencePoolToFindings,
} from "@/lib/surgical-sales/providerPriorEvidencePool";
import { collectQuickAddProcedureSuggestions } from "@/lib/surgical-sales/quickAddProcedureSuggestions";
export type ProductSupportRepBriefingLine = {
  id: string;
  text: string;
};

const PROVIDER_KNOWN_FIELDS: Array<{ key: string; prefix?: string }> = [
  { key: "provider_current_vendors", prefix: "Uses" },
  { key: "provider_competitive_products", prefix: "Also uses" },
  { key: "provider_technique_preferences", prefix: "Approach" },
  { key: "provider_preference_card_signals" },
  { key: "provider_workflow_pain_points", prefix: "Workflow friction" },
  { key: "provider_clinical_frustrations", prefix: "Clinical concern" },
  { key: "provider_product_interests", prefix: "Product interest" },
  { key: "provider_support_expectations", prefix: "Support expectation" },
  { key: "provider_procedure_focus" },
];

const PRIOR_CASE_SIGNAL_KEYS: Array<{ key: string; prefix: string }> = [
  { key: "live_observation_product_fit", prefix: "Product fit signal" },
  { key: "live_observation_competitors", prefix: "Competitive footprint" },
  { key: "live_observation_clinical_pain_points", prefix: "Clinical pain point" },
  { key: "live_observation_workflow", prefix: "Workflow note" },
  { key: "live_observation_staff_process", prefix: "Staff process" },
  { key: "live_observation_surgeon_reactions", prefix: "Surgeon reaction" },
];

const GENERIC_NOISE_RE =
  /^(general(?:\s+surgery)?|unknown|n\/a|tbd|pending|none)$/i;
const MACHINE_TOKEN_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i;

function isRepBriefingNoise(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return true;
  if (GENERIC_NOISE_RE.test(trimmed)) return true;
  if (MACHINE_TOKEN_RE.test(trimmed)) return true;
  if (/still needed:\s*validate in field intelligence/i.test(trimmed)) return true;
  if (/^provider concern:\s*clinical frustration$/i.test(trimmed)) return true;
  if (/[·•]/.test(trimmed) && /increasing|volume|trend/i.test(trimmed)) return true;
  return false;
}

function pushUniqueLine(
  target: ProductSupportRepBriefingLine[],
  seen: Set<string>,
  id: string,
  text: string,
  max: number,
) {
  const trimmed = text.trim();
  if (!trimmed || target.length >= max || isRepBriefingNoise(trimmed)) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push({ id, text: trimmed });
}

function formatProviderField(dbKey: string, raw: unknown, prefix?: string): string | null {
  const rawText = String(raw ?? "").trim();
  if (!rawText) return null;

  const isFreeformVendorNote =
    (dbKey === "provider_current_vendors" || dbKey === "provider_competitive_products") &&
    /\s/.test(rawText) &&
    !MACHINE_TOKEN_RE.test(rawText);

  if (isFreeformVendorNote && !isRepBriefingNoise(rawText)) {
    return prefix && !rawText.toLowerCase().startsWith(prefix.toLowerCase())
      ? `${prefix}: ${rawText}`
      : rawText;
  }

  const candidates = [
    formatRepIntelligenceFieldValue(dbKey, rawText),
    formatRepFacingDisplayText(rawText, dbKey),
    isRepBriefingNoise(rawText) ? null : rawText,
  ];

  const formatted = candidates.find((candidate) => candidate && !isRepBriefingNoise(candidate)) ?? null;
  if (!formatted) return null;
  if (prefix && !formatted.toLowerCase().startsWith(prefix.toLowerCase())) {
    return `${prefix}: ${formatted}`;
  }
  return formatted;
}

function linesFromMultiline(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function priorCaseInsightLines(priorCases: Array<Record<string, unknown>> | undefined): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const priorCase of priorCases ?? []) {
    if (lines.length >= 3) break;
    for (const { key, prefix } of PRIOR_CASE_SIGNAL_KEYS) {
      if (lines.length >= 3) break;
      for (const segment of linesFromMultiline(priorCase[key])) {
        const formatted = formatRepFacingDisplayText(segment, key);
        if (!formatted || isRepBriefingNoise(formatted)) continue;
        const text = `${prefix}: ${formatted}`;
        const dedupe = text.toLowerCase();
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        lines.push(text);
      }
    }
  }

  return lines;
}

export function buildProductSupportKnownInsights(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  specialty?: string | null;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
}): ProductSupportRepBriefingLine[] {
  const items: ProductSupportRepBriefingLine[] = [];
  const seen = new Set<string>();

  const procedure = String(input.caseRow.procedure_type ?? "").trim();
  if (procedure && !isRepBriefingNoise(procedure)) {
    pushUniqueLine(items, seen, "case:procedure", `Today's procedure: ${procedure}`, 6);
  } else if (input.providerContact) {
    const suggestions = collectQuickAddProcedureSuggestions(
      input.providerContact,
      input.specialty ?? null,
    );
    if (suggestions[0]) {
      pushUniqueLine(items, seen, "provider:procedure", `Typical procedure: ${suggestions[0]}`, 6);
    }
  }

  if (input.providerContact) {
    for (const { key, prefix } of PROVIDER_KNOWN_FIELDS) {
      if (items.length >= 6) break;
      const raw = input.providerContact[key];
      if (!raw) continue;
      for (const [index, segment] of linesFromMultiline(raw).entries()) {
        if (items.length >= 6) break;
        const formatted = formatProviderField(key, segment, prefix);
        if (!formatted) continue;
        pushUniqueLine(items, seen, `${key}:${index}`, formatted, 6);
      }
    }
  }

  for (const line of priorCaseInsightLines(input.priorCases)) {
    pushUniqueLine(items, seen, `prior-case:${line.slice(0, 24)}`, line, 6);
  }

  const priorEvidencePool = buildProviderPriorEvidencePool({
    currentCaseId: String(input.caseRow.id ?? "current"),
    caseRow: input.caseRow,
    activities: input.activities,
    priorCases: input.priorCases,
    providerContact: input.providerContact,
  });
  for (const finding of priorEvidencePoolToFindings(priorEvidencePool).slice(0, 3)) {
    const label = finding.label?.trim();
    if (!label) continue;
    pushUniqueLine(items, seen, `prior:${finding.normalizedFindingId}:${finding.matchKey}`, label, 6);
  }

  return items.slice(0, 6);
}

export function buildProductSupportMissionBullets(input: {
  caseRow: Record<string, unknown>;
  products: ProductSupportOverviewProductLine[];
}): string[] {
  const bullets: string[] = [];
  const seen = new Set<string>();

  const push = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || bullets.length >= 5) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    bullets.push(trimmed);
  };

  const procedure = String(input.caseRow.procedure_type ?? "").trim();
  if (procedure && !isRepBriefingNoise(procedure)) {
    push(`Support ${procedure}`);
  } else {
    push("Support successful case");
  }

  if (input.products.length > 0) {
    push("Ensure planned products are available");
  } else {
    push("Ensure product availability");
  }

  push("Observe product usage in the OR");
  push("Capture surgeon and staff feedback");

  const coverage = String(input.caseRow.case_support_coverage ?? "").trim();
  if (coverage) push("Execute the documented coverage plan");

  const productNeeds = String(input.caseRow.case_product_needs ?? "").trim();
  if (productNeeds) push("Address documented product needs");

  return bullets.slice(0, 5);
}
