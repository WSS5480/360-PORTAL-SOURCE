function linesFromField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export type ProviderObservationIntelligenceTheme = {
  id: string;
  title: string;
  summary: string;
};

export type ProviderObservationIntelligenceSnapshot = {
  observationCount: number;
  themes: ProviderObservationIntelligenceTheme[];
  sourceCaseIds: string[];
};

const THEME_RULES: Array<{
  id: string;
  title: string;
  keys: string[];
  summarize: (lines: string[]) => string | null;
}> = [
  {
    id: "competitor_pattern",
    title: "Competitor usage pattern",
    keys: ["provider_competitive_products", "live_observation_competitors"],
    summarize: (lines) =>
      lines.length > 0 ? lines[0] : null,
  },
  {
    id: "workflow_friction",
    title: "Recurring workflow friction",
    keys: ["provider_workflow_pain_points", "live_observation_workflow"],
    summarize: (lines) =>
      lines.length > 0 ? lines[0] : null,
  },
  {
    id: "provider_preference",
    title: "Provider preference pattern",
    keys: ["provider_clinical_frustrations", "provider_procedure_focus", "live_observation_surgeon_reactions"],
    summarize: (lines) =>
      lines.length > 0 ? lines[0] : null,
  },
  {
    id: "staff_theme",
    title: "Staff / team theme",
    keys: ["provider_staff_frustrations", "live_observation_staff_process"],
    summarize: (lines) =>
      lines.length > 0 ? lines[0] : null,
  },
  {
    id: "product_opportunity",
    title: "Product opportunity hypothesis",
    keys: ["provider_future_opportunity_signals", "provider_product_interests", "live_observation_product_fit"],
    summarize: (lines) =>
      lines.length > 0 ? lines[0] : null,
  },
  {
    id: "evaluation_readiness",
    title: "Evaluation readiness",
    keys: ["provider_future_opportunity_signals", "provider_product_interests"],
    summarize: (lines) => {
      const joined = lines.join(" ").toLowerCase();
      if (/\b(evaluat|trial|demo|interest|open)\b/.test(joined)) {
        return "Provider has shown evaluation interest across observations";
      }
      return null;
    },
  },
];

type PriorCaseRow = {
  id: string;
  live_observation_competitors?: unknown;
  live_observation_product_fit?: unknown;
  live_observation_workflow?: unknown;
  live_observation_clinical_pain_points?: unknown;
  live_observation_staff_process?: unknown;
  live_observation_surgeon_reactions?: unknown;
};

function collectLines(
  providerContact: Record<string, unknown> | null | undefined,
  priorCases: PriorCaseRow[],
  keys: string[],
): string[] {
  const lines: string[] = [];
  for (const key of keys) {
    if (key.startsWith("provider_") && providerContact) {
      lines.push(...linesFromField(providerContact[key]));
    }
    for (const prior of priorCases) {
      if (key in prior) {
        lines.push(...linesFromField((prior as Record<string, unknown>)[key]));
      }
    }
  }
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function buildProviderObservationIntelligenceSnapshot(input: {
  providerContact?: Record<string, unknown> | null;
  priorCases?: PriorCaseRow[];
  minObservations?: number;
}): ProviderObservationIntelligenceSnapshot | null {
  const priorCases = input.priorCases ?? [];
  const observationCount = priorCases.length;
  const minObservations = input.minObservations ?? 2;

  if (observationCount < minObservations) return null;

  const themes: ProviderObservationIntelligenceTheme[] = [];
  for (const rule of THEME_RULES) {
    const lines = collectLines(input.providerContact, priorCases, rule.keys);
    const summary = rule.summarize(lines);
    if (summary) {
      themes.push({ id: rule.id, title: rule.title, summary });
    }
  }

  if (themes.length === 0) return null;

  return {
    observationCount,
    themes: themes.slice(0, 6),
    sourceCaseIds: priorCases.map((row) => row.id),
  };
}
