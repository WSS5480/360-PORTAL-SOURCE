/**
 * Provider overview — latest field intelligence (3–5 conversational bullets).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  formatIntelligenceCaptureSummaryChip,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export const PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_MIN = 3;
export const PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_MAX = 5;

export type ProviderOverviewFieldIntelligenceKind =
  | "discovery"
  | "engagement"
  | "workflow"
  | "relationship";

export type ProviderOverviewFieldIntelligenceItem = {
  id: string;
  kind: ProviderOverviewFieldIntelligenceKind;
  line: string;
};

type Candidate = ProviderOverviewFieldIntelligenceItem & {
  at: number;
  rank: number;
};

const CRM_NOISE_RE =
  /\b(log touch|outcome_review|crm status|recommended next step|field directive|validated on file|open point)\b/i;
const LABEL_PREFIX_RE =
  /^(procedure focus|technique|workflow|observation|credentialing|responsiveness|communication)\s*:\s*/i;

const NOTE_FIELD_KEYS = new Set([
  "provider_workflow_pain_points",
  "provider_technique_detail",
  "provider_first_observation_questions",
  "provider_or_team_dynamics",
  "provider_observation_access_path",
  "provider_follow_up_approach",
  "provider_dissatisfaction_areas",
]);

const STRUCTURED_FIELD_KEYS: string[] = [
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_evaluation_openness",
  "provider_responsiveness",
  "provider_communication_style",
  "provider_champion_potential",
  "provider_procedure_focus",
  "provider_technique_preferences",
  "provider_observation_best_days_case_types",
  "provider_ideal_observation_cases",
  "provider_observation_cadence_preference",
  "provider_observation_feasibility",
  "provider_observation_coordinator_contact",
  "influence_level",
];

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function polishLine(line: string, maxLen = 120): string {
  let cleaned = line.replace(/\s+/g, " ").replace(LABEL_PREFIX_RE, "").trim();
  if (!cleaned) return "";
  cleaned = scanLine(cleaned, maxLen);
  if (!/[.!?]$/.test(cleaned)) cleaned += ".";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function firstMeaningfulSentence(raw: string, minLen = 18): string | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < minLen || CRM_NOISE_RE.test(text)) return null;
  const line =
    text
      .split(/\n+/)
      .map((l) => l.replace(/^[\s•\-–—*]+/, "").trim())
      .find((l) => l.length >= minLen) ?? text;
  const sentence = (line.split(/(?<=[.!?])\s+/)[0] || line).trim();
  if (sentence.length < minLen || CRM_NOISE_RE.test(sentence)) return null;
  return polishLine(sentence);
}

function timestampForField(
  contact: Record<string, unknown>,
  dbKey: string,
): number {
  const meta = parseProviderIntelligenceFieldMetadata(contact)[dbKey];
  const iso =
    meta?.validated_at?.trim() || meta?.confirmed_at?.trim() || meta?.updated_at?.trim() || "";
  const at = Date.parse(iso);
  return Number.isNaN(at) ? 0 : at;
}

function pushCandidate(out: Candidate[], candidate: Candidate): void {
  const line = candidate.line.trim();
  if (line.length < 12 || CRM_NOISE_RE.test(line)) return;
  if (out.some((c) => c.line.toLowerCase() === line.toLowerCase())) return;
  out.push(candidate);
}

function dayNameFromTokens(tokens: string[]): string | null {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const hit = days.find((d) => tokens.includes(d));
  if (!hit) return null;
  return hit.charAt(0).toUpperCase() + hit.slice(1);
}

function workflowMixLine(contact: Record<string, unknown>): string | null {
  const proc = `${fieldText(contact, "provider_procedure_focus")} ${fieldText(contact, "provider_technique_preferences")}`.toLowerCase();
  const daysRaw = fieldText(contact, "provider_observation_best_days_case_types");
  const daysParsed = daysRaw
    ? parseIntelligenceCaptureValue("provider_observation_best_days_case_types", daysRaw)
    : { token: null as string | null, tokens: [] as string[] };
  const dayTokens = [...daysParsed.tokens, daysParsed.token].filter(Boolean) as string[];
  const day = dayNameFromTokens(dayTokens);
  const hasLap = /\blap|laparoscopic/i.test(proc);

  if (hasLap && day === "Thursday") {
    return "Laparoscopic procedures likely concentrated on Thursdays.";
  }
  if (hasLap && day) {
    return `Laparoscopic cases look concentrated on ${day}s.`;
  }
  if (hasLap) {
    return "Laparoscopic cases look like the main observation target.";
  }
  if (/\brobotic\b|\bdavinci\b/i.test(proc) && day) {
    return `Robotic cases may cluster on ${day}s.`;
  }
  if (day) {
    return `${day} looks like the busiest OR posting day.`;
  }
  return null;
}

function structuredFieldInsight(
  contact: Record<string, unknown>,
  dbKey: string,
): { kind: ProviderOverviewFieldIntelligenceKind; line: string } | null {
  const raw = fieldText(contact, dbKey);
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return null;
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  const token = String(parsed.token ?? "").toLowerCase();
  const notes = `${parsed.notes ?? ""} ${raw}`.toLowerCase();

  switch (dbKey) {
    case "provider_observation_credentialing_needed":
    case "provider_credentialing_status": {
      if (token === "required" || token === "in_progress" || /\b48\b|hour|day before|advance/i.test(notes)) {
        return {
          kind: "discovery",
          line: "Scheduler requested vendor clearance 48 hours before arrival.",
        };
      }
      if (token === "blocked") {
        return { kind: "discovery", line: "Vendor clearance is still blocking OR entry." };
      }
      break;
    }
    case "provider_evaluation_openness": {
      if (token === "open" || token === "trial_ready") {
        return { kind: "relationship", line: "Surgeon appears open to observation discussion." };
      }
      if (token === "cautious") {
        return { kind: "relationship", line: "Surgeon sounds cautious but willing to keep talking." };
      }
      break;
    }
    case "provider_responsiveness": {
      if (token === "slow" || token === "inconsistent") {
        return { kind: "relationship", line: "Office responds slowly between case days." };
      }
      if (token === "same_day" || token === "fast") {
        return { kind: "relationship", line: "Office usually gets back the same day between case days." };
      }
      break;
    }
    case "provider_communication_style": {
      if (token === "warm" || token === "advocate") {
        return { kind: "relationship", line: "Surgeon engagement style reads warm in the office." };
      }
      if (token === "cold") {
        return { kind: "relationship", line: "Surgeon keeps rep touch short and formal." };
      }
      break;
    }
    case "provider_champion_potential": {
      if (/\bchampion\b|\badvocate\b/i.test(raw) || token.includes("high")) {
        return { kind: "relationship", line: "Someone inside the office may champion access." };
      }
      break;
    }
    case "provider_observation_feasibility": {
      if (token === "allowed" || /\ballowed|feasible\b/i.test(raw)) {
        return { kind: "discovery", line: "Observation looks allowed — still confirm posting with the scheduler." };
      }
      if (token === "credentialing_required") {
        return { kind: "discovery", line: "Credentialing still gates observation on case day." };
      }
      break;
    }
    case "provider_observation_coordinator_contact": {
      const sentence = firstMeaningfulSentence(raw, 10);
      if (sentence && sentence.length >= 16 && !CRM_NOISE_RE.test(sentence)) {
        const who = sentence.replace(/\.$/, "");
        return { kind: "discovery", line: `Scheduling runs through ${who}.` };
      }
      if (raw.length >= 8) {
        return { kind: "discovery", line: "Scheduling owner is named on file." };
      }
      break;
    }
    case "provider_observation_cadence_preference": {
      if (token === "weekly") {
        return { kind: "workflow", line: "OR posting rhythm looks weekly — plan observation around that window." };
      }
      break;
    }
    case "influence_level": {
      const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
      if (chip && chip.length > 8) {
        return { kind: "relationship", line: `Buying influence: ${chip.charAt(0).toLowerCase()}${chip.slice(1)}.` };
      }
      break;
    }
    default:
      break;
  }

  const workflowLine = dbKey === "provider_procedure_focus" || dbKey === "provider_technique_preferences"
    ? workflowMixLine(contact)
    : null;
  if (workflowLine) {
    return { kind: "workflow", line: workflowLine };
  }

  if (NOTE_FIELD_KEYS.has(dbKey)) {
    const sentence = firstMeaningfulSentence(raw);
    if (sentence) {
      const kind: ProviderOverviewFieldIntelligenceKind =
        dbKey === "provider_workflow_pain_points" || dbKey === "provider_technique_detail"
          ? "workflow"
          : dbKey === "provider_follow_up_approach" || dbKey === "provider_or_team_dynamics"
            ? "relationship"
            : "discovery";
      return { kind, line: sentence };
    }
  }

  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  if (!chip || chip.length < 12 || CRM_NOISE_RE.test(chip)) return null;

  const kind: ProviderOverviewFieldIntelligenceKind =
    dbKey.includes("procedure") || dbKey.includes("technique") || dbKey.includes("workflow")
      ? "workflow"
      : dbKey.includes("responsiveness") || dbKey.includes("communication") || dbKey.includes("champion")
        ? "relationship"
        : "discovery";

  return { kind, line: polishLine(chip) };
}

function collectFieldCandidates(contact: Record<string, unknown>): Candidate[] {
  const out: Candidate[] = [];
  const workflowEmitted = new Set<string>();

  for (const dbKey of STRUCTURED_FIELD_KEYS) {
    const insight = structuredFieldInsight(contact, dbKey);
    if (!insight) continue;
    if (insight.kind === "workflow") {
      if (workflowEmitted.has(insight.line.toLowerCase())) continue;
      workflowEmitted.add(insight.line.toLowerCase());
    }
    pushCandidate(out, {
      id: `field:${dbKey}`,
      kind: insight.kind,
      line: insight.line,
      at: timestampForField(contact, dbKey),
      rank: insight.kind === "discovery" ? 10 : insight.kind === "workflow" ? 20 : 30,
    });
  }

  const mix = workflowMixLine(contact);
  if (mix && !workflowEmitted.has(mix.toLowerCase())) {
    pushCandidate(out, {
      id: "field:workflow_mix",
      kind: "workflow",
      line: mix,
      at: Math.max(
        timestampForField(contact, "provider_procedure_focus"),
        timestampForField(contact, "provider_observation_best_days_case_types"),
      ),
      rank: 18,
    });
  }

  for (const dbKey of NOTE_FIELD_KEYS) {
    if (STRUCTURED_FIELD_KEYS.includes(dbKey)) continue;
    const insight = structuredFieldInsight(contact, dbKey);
    if (!insight) continue;
    pushCandidate(out, {
      id: `note:${dbKey}`,
      kind: insight.kind,
      line: insight.line,
      at: timestampForField(contact, dbKey),
      rank: 22,
    });
  }

  return out;
}

function collectEngagementCandidates(engagements: ProviderEngagementSummary[]): Candidate[] {
  const out: Candidate[] = [];
  const ranked = [...engagements].sort((a, b) =>
    String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
  );

  for (const e of ranked) {
    const at = Date.parse(String(e.updated_at ?? "")) || 0;
    const memory = e.memory_context_line?.trim();
    if (memory && memory.length >= 12 && !CRM_NOISE_RE.test(memory)) {
      pushCandidate(out, {
        id: `eng:${e.id}:memory`,
        kind: "engagement",
        line: polishLine(memory),
        at,
        rank: 12,
      });
      continue;
    }

    const notes = e.notes ? firstMeaningfulSentence(String(e.notes)) : null;
    if (notes) {
      pushCandidate(out, {
        id: `eng:${e.id}:notes`,
        kind: "engagement",
        line: notes,
        at,
        rank: 16,
      });
    }
  }

  return out.slice(0, 2);
}

function selectDiverseItems(candidates: Candidate[]): ProviderOverviewFieldIntelligenceItem[] {
  const sorted = [...candidates].sort((a, b) => {
    if (b.at !== a.at) return b.at - a.at;
    return a.rank - b.rank;
  });

  const picked: Candidate[] = [];
  const kinds: ProviderOverviewFieldIntelligenceKind[] = [
    "discovery",
    "engagement",
    "workflow",
    "relationship",
  ];

  for (const kind of kinds) {
    const next = sorted.find((c) => c.kind === kind && !picked.some((p) => p.id === c.id));
    if (next) picked.push(next);
  }

  for (const c of sorted) {
    if (picked.length >= PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_MAX) break;
    if (picked.some((p) => p.id === c.id)) continue;
    picked.push(c);
  }

  return picked.slice(0, PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_MAX).map(({ id, kind, line }) => ({
    id,
    kind,
    line,
  }));
}

export function buildProviderOverviewLatestFieldIntelligence(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewFieldIntelligenceItem[] {
  const fieldCandidates = collectFieldCandidates(input.contact);
  const engagementCandidates = collectEngagementCandidates(input.engagements ?? []);
  const merged = selectDiverseItems([...fieldCandidates, ...engagementCandidates]);

  if (merged.length >= PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_MIN) {
    return merged;
  }

  const fallbackSorted = [...fieldCandidates, ...engagementCandidates].sort((a, b) => b.at - a.at);
  const extra: ProviderOverviewFieldIntelligenceItem[] = [];
  for (const c of fallbackSorted) {
    if (extra.length >= PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_MIN) break;
    if (merged.some((m) => m.id === c.id)) continue;
    extra.push({ id: c.id, kind: c.kind, line: c.line });
  }

  return [...merged, ...extra].slice(0, PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_MAX);
}
