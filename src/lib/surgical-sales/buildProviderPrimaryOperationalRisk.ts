/**
 * Single primary operational risk — what is most likely to waste field time right now.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderFieldTimeRisk,
  type ProviderFieldTimeRisk,
  type ProviderFieldTimeRiskInput,
  type ProviderFieldTimeRiskInputId,
  type ProviderFieldTimeRiskInputStatus,
  type ProviderFieldTimeRiskTone,
} from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import {
  buildProviderOverviewQualitativeReadiness,
  type ProviderOverviewReadinessIndicator,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  operationalFieldActionLabel,
  operationalValidateBeforeDeployLabel,
} from "@/lib/surgical-sales/providerOperationalActionLabels";
import { PROVIDER_OPS_TERM } from "@/lib/surgical-sales/providerOverviewVocabulary";
import type { ProtectFieldTimeRiskLevel } from "@/lib/surgical-sales/protectFieldTimeVocabulary";
import {
  PROTECT_FIELD_TIME_KICKER,
  PROTECT_FIELD_TIME_TITLE,
} from "@/lib/surgical-sales/protectFieldTimeVocabulary";
import { parseIntelligenceCaptureValue } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

export const PRIMARY_OPERATIONAL_RISK_BANNER_LABEL = "Primary operational risk";
export const PRIMARY_OPERATIONAL_RISK_BANNER_QUESTION =
  "What is most likely to waste field time right now?";

export type ProviderPrimaryOperationalRiskTone = "success" | "neutral" | "caution" | "warn" | "danger";

export type ProviderPrimaryOperationalRisk = {
  label: string;
  question: string;
  headline: string;
  scan: string;
  tone: ProviderPrimaryOperationalRiskTone;
  cta: {
    label: string;
    sectionId: ProviderIntelligenceSectionId;
    dbKey?: string;
  } | null;
  driverId: ProviderFieldTimeRiskInputId | "commercial_influence";
};

const INPUT_PRIORITY: ProviderFieldTimeRiskInputId[] = [
  "or_access_known",
  "observation_feasibility",
  "coordinator_mapped",
  "scheduling_clarity",
  "workflow_intelligence",
  "relationship_maturity",
];

const SEVERITY_RANK: Record<ProviderFieldTimeRiskInputStatus, number> = {
  blocking: 4,
  open: 3,
  partial: 2,
  strong: 1,
};

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function hasCredentialingGate(contact: Record<string, unknown>): boolean {
  const token = parseIntelligenceCaptureValue(
    "provider_observation_feasibility",
    fieldText(contact, "provider_observation_feasibility"),
  ).token;
  if (token === "credentialing_required") return true;
  return /\bcredential/i.test(fieldText(contact, "provider_observation_access_path"));
}

function hasCommitteeGate(contact: Record<string, unknown>): boolean {
  const combined = `${fieldText(contact, "provider_observation_access_path")} ${fieldText(contact, "provider_observation_feasibility")}`;
  return /\bcommittee\b/i.test(combined);
}

function conciseHeadline(
  id: ProviderFieldTimeRiskInputId,
  status: ProviderFieldTimeRiskInputStatus,
  contact: Record<string, unknown>,
): string {
  switch (id) {
    case "coordinator_mapped":
      if (status === "blocking" || status === "open") {
        return `${PROVIDER_OPS_TERM.schedulingAuthority} not mapped`;
      }
      if (status === "partial") {
        return `${PROVIDER_OPS_TERM.schedulingAuthority} only partially confirmed`;
      }
      break;
    case "scheduling_clarity":
      if (status === "blocking" || status === "open") {
        return `${PROVIDER_OPS_TERM.schedulingAuthority} not mapped`;
      }
      if (status === "partial") {
        return "OR posting window not fully mapped";
      }
      break;
    case "or_access_known":
      if (status === "blocking") {
        if (hasCommitteeGate(contact)) return "Vendor committee gate blocks OR entry";
        if (hasCredentialingGate(contact)) return `${PROVIDER_OPS_TERM.credentialingPathway} still developing`;
        return `${PROVIDER_OPS_TERM.orAccess} blocked`;
      }
      if (status === "open") return "Vendor clearance path still developing";
      if (status === "partial") return `${PROVIDER_OPS_TERM.orAccess} captured with restrictions`;
      break;
    case "observation_feasibility":
      if (status === "blocking") return "Observation allowance blocked";
      if (status === "open") return "Observation allowance not confirmed";
      if (status === "partial") return "Observation feasibility needs confirmation";
      break;
    case "workflow_intelligence":
      if (status === "open") return "Procedure mix not validated";
      if (status === "partial") return `${PROVIDER_OPS_TERM.workflowIntelligence} still developing`;
      if (status === "blocking") return "Clinical workflow blocks field targeting";
      break;
    case "relationship_maturity":
      if (status === "open") return `${PROVIDER_OPS_TERM.surgeonRelationship} too thin for OR time`;
      if (status === "partial") return "Engagement rhythm not proven under OR pressure";
      break;
    default:
      break;
  }
  return "Field execution signals need validation before OR time";
}

function toneForStatus(status: ProviderFieldTimeRiskInputStatus): ProviderPrimaryOperationalRiskTone {
  if (status === "blocking") return "danger";
  if (status === "open") return "warn";
  if (status === "partial") return "caution";
  return "neutral";
}

function toneFromProtectLevel(level: ProtectFieldTimeRiskLevel): ProviderPrimaryOperationalRiskTone {
  if (level === "critical") return "danger";
  if (level === "high") return "warn";
  if (level === "elevated") return "caution";
  return "neutral";
}

function toneFromFieldRisk(tone: ProviderFieldTimeRiskTone): ProviderPrimaryOperationalRiskTone {
  if (tone === "danger") return "danger";
  if (tone === "warn") return "warn";
  if (tone === "caution") return "caution";
  if (tone === "success") return "success";
  return "neutral";
}

function commercialInfluenceCandidate(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  indicators: ProviderOverviewReadinessIndicator[];
  planning?: ProviderPlanningCompletion | null;
}): {
  severity: number;
  priority: number;
  headline: string;
  scan: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
  tone: ProviderPrimaryOperationalRiskTone;
} | null {
  if (input.commercialStage !== "evaluation" && input.commercialStage !== "adoption") {
    return null;
  }

  const commercial = input.indicators.find((i) => i.id === "commercial_influence");
  const commercialConfidence = input.planning?.sections.find((s) => s.id === "commercial_signals")
    ?.confidence;
  const evalOpen = fieldHasIntelligenceSignal(
    "provider_evaluation_openness",
    input.contact.provider_evaluation_openness as string | null | undefined,
  );

  const priority = input.commercialStage === "evaluation" ? 3 : 5;

  if (
    (commercial?.state === "emerging" || commercialConfidence === "unknown") &&
    !evalOpen
  ) {
    return {
      severity: 3,
      priority,
      headline: `${PROVIDER_OPS_TERM.commercialInfluence} unclear`,
      scan: "Evaluation path not confirmed before additional field coverage.",
      sectionId: "commercial_signals",
      dbKey: "provider_evaluation_openness",
      tone: "warn",
    };
  }

  if (commercial?.state === "partially_validated" && input.commercialStage === "evaluation") {
    return {
      severity: 2,
      priority,
      headline: `${PROVIDER_OPS_TERM.commercialInfluence} only partially mapped`,
      scan: "Confirm trial willingness and who approves evaluations before heavy field time.",
      sectionId: "commercial_signals",
      dbKey: "provider_evaluation_openness",
      tone: "caution",
    };
  }

  return null;
}

type OperationalRiskCandidate = {
  severity: number;
  priority: number;
  headline: string;
  scan: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey?: string;
  tone: ProviderPrimaryOperationalRiskTone;
  driverId: ProviderFieldTimeRiskInputId | "commercial_influence";
};

function candidateFromInput(
  row: ProviderFieldTimeRiskInput,
  contact: Record<string, unknown>,
): OperationalRiskCandidate {
  const priority = INPUT_PRIORITY.indexOf(row.id);
  return {
    severity: SEVERITY_RANK[row.status],
    priority: priority >= 0 ? priority : 99,
    headline: conciseHeadline(row.id, row.status, contact),
    scan: scanLine(row.scan, 88),
    sectionId: row.sectionId,
    dbKey: row.dbKey,
    tone: toneForStatus(row.status),
    driverId: row.id,
  };
}

function selectPrimaryCandidate(
  fieldTimeRisk: ProviderFieldTimeRisk,
  contact: Record<string, unknown>,
  commercialStage: ProviderCommercialWorkflowStage,
  indicators: ProviderOverviewReadinessIndicator[],
  planning?: ProviderPlanningCompletion | null,
): OperationalRiskCandidate | null {
  const candidates = fieldTimeRisk.inputs
    .filter((row) => row.status !== "strong")
    .map((row) => candidateFromInput(row, contact));

  const commercial = commercialInfluenceCandidate({
    contact,
    commercialStage,
    indicators,
    planning,
  });
  if (commercial) {
    candidates.push({ ...commercial, driverId: "commercial_influence" });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.priority - b.priority;
  });

  return candidates[0] ?? null;
}

export function buildProviderPrimaryOperationalRisk(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderPrimaryOperationalRisk | null {
  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();

  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const indicators = buildProviderOverviewQualitativeReadiness({
    contact: input.contact,
    relationshipStage,
    commercialStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
  });

  const fieldTimeRisk = buildProviderFieldTimeRisk({
    contact: input.contact,
    relationshipStage,
    commercialStage,
    engagements: input.engagements,
    readinessIndicators: indicators,
  });

  const protectFieldTime = fieldTimeRisk.protectFieldTime;

  const selected = selectPrimaryCandidate(
    fieldTimeRisk,
    input.contact,
    commercialStage,
    indicators,
    input.planning,
  );

  const protectThreatDominates =
    protectFieldTime.topThreat &&
    (protectFieldTime.posture === "protect_field_time" ||
      protectFieldTime.posture === "hold_field_time" ||
      protectFieldTime.overallLevel === "critical" ||
      protectFieldTime.overallLevel === "high");

  if (protectThreatDominates && protectFieldTime.topThreat) {
    const threat = protectFieldTime.topThreat;
    return {
      label: PRIMARY_OPERATIONAL_RISK_BANNER_LABEL,
      question: PRIMARY_OPERATIONAL_RISK_BANNER_QUESTION,
      headline: `${threat.label} — ${protectFieldTime.postureLabel}`,
      scan: scanLine(threat.scan, 88),
      tone: toneFromProtectLevel(threat.level),
      cta: {
        label: operationalValidateBeforeDeployLabel(threat.dbKey),
        sectionId: threat.sectionId,
        dbKey: threat.dbKey,
      },
      driverId:
        threat.id === "wasted_or_travel"
          ? "coordinator_mapped"
          : threat.id === "observation_failure"
            ? "observation_feasibility"
            : threat.id === "wrong_procedure_target"
              ? "workflow_intelligence"
              : threat.id === "scheduling_collapse"
                ? "scheduling_clarity"
                : "or_access_known",
    };
  }

  if (!selected) {
    if (fieldTimeRisk.state === "efficient_field_target") {
      return {
        label: PRIMARY_OPERATIONAL_RISK_BANNER_LABEL,
        question: PRIMARY_OPERATIONAL_RISK_BANNER_QUESTION,
        headline: "No primary field-time risk flagged",
        scan: scanLine(fieldTimeRisk.narrative.whyFieldTimeFails, 88),
        tone: "success",
        cta: null,
        driverId: "observation_feasibility",
      };
    }
    return null;
  }

  if (fieldTimeRisk.state === "efficient_field_target" && selected.severity < 3) {
    return {
      label: PRIMARY_OPERATIONAL_RISK_BANNER_LABEL,
      question: PRIMARY_OPERATIONAL_RISK_BANNER_QUESTION,
      headline: selected.headline,
      scan: selected.scan,
      tone: "caution",
      cta: selected.dbKey
        ? {
            label: operationalFieldActionLabel(selected.dbKey),
            sectionId: selected.sectionId,
            dbKey: selected.dbKey,
          }
        : { label: "Review account area", sectionId: selected.sectionId },
      driverId: selected.driverId,
    };
  }

  const tone =
    selected.severity >= 3 ? selected.tone : toneFromFieldRisk(fieldTimeRisk.tone);

  return {
    label: PRIMARY_OPERATIONAL_RISK_BANNER_LABEL,
    question: PRIMARY_OPERATIONAL_RISK_BANNER_QUESTION,
    headline: selected.headline,
    scan: selected.scan,
    tone,
    cta: selected.dbKey
      ? {
          label: operationalFieldActionLabel(selected.dbKey),
          sectionId: selected.sectionId,
          dbKey: selected.dbKey,
        }
      : { label: "Review account area", sectionId: selected.sectionId },
    driverId: selected.driverId,
  };
}
