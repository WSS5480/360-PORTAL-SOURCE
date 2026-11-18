/**
 * Provider Intelligence tab — executive investigation view (minimal surface area).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildProviderIntelligenceOperationalStory } from "@/lib/surgical-sales/buildProviderIntelligenceOperationalStory";
import {
  buildProviderOperationalWarningCards,
  type OperationalWarningCard,
} from "@/lib/surgical-sales/buildProviderOperationalWarningCards";
import {
  buildProviderFieldDiscoveryCards,
  type FieldDiscoveryCard,
} from "@/lib/surgical-sales/buildProviderFieldDiscoveryCards";
import { buildProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { formatIntelligenceCaptureDisplay } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  buildIntelligenceFreshnessReconfirmationQueue,
} from "@/lib/surgical-sales/providerIntelligenceFreshness";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProtectFieldTimePosture } from "@/lib/surgical-sales/protectFieldTimeVocabulary";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

const CALM_DEPLOY_LINE: Record<ProtectFieldTimePosture, string> = {
  clear_to_deploy: "Field time looks reasonable once your next step is set.",
  validate_before_travel: "Quick checks before you book travel.",
  hold_field_time: "Pause travel until access and scheduling are clearer.",
  protect_field_time: "Pause travel until access and scheduling are clearer.",
};
const MAX_WORKFLOW_VISIBLE = 3;
const MAX_STALE_LINES = 2;
const SUMMARY_MAX = 140;
const LINE_MAX = 72;

export type InvestigationPrimaryAction = {
  headline: string;
  ctaLabel: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey?: string;
};

export type InvestigationWorkflowSnapshot = {
  label: string;
  value: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
};

export type ProviderIntelligenceInvestigationView = {
  /** One narrative — current belief about the account */
  summary: string;
  /** Single deploy posture line (replaces duplicate readiness blocks) */
  deployLine: string;
  deployTone: "clear" | "caution" | "hold";
  primaryAction: InvestigationPrimaryAction;
  operationalWarnings: OperationalWarningCard[];
  fieldDiscoveries: FieldDiscoveryCard[];
  /** Only captured workflow facts */
  workflowOnFile: InvestigationWorkflowSnapshot[];
  workflowMissingCount: number;
  workflowMissingKeys: Array<{ label: string; sectionId: ProviderIntelligenceSectionId; dbKey: string }>;
  /** Short stale note for hero; details behind expand */
  staleSummary: string | null;
  staleDetails: string[];
};

const WORKFLOW_TILE_DEFS: Array<{
  id: string;
  label: string;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
}> = [
  { id: "procedure_mix", label: "Procedures", dbKey: "provider_procedure_focus", sectionId: "clinical_workflow" },
  { id: "modality", label: "Modality", dbKey: "provider_technique_preferences", sectionId: "clinical_workflow" },
  {
    id: "workflow_patterns",
    label: "Workflow",
    dbKey: "provider_workflow_pain_points",
    sectionId: "clinical_workflow",
  },
  {
    id: "scheduling_rhythm",
    label: "Scheduling",
    dbKey: "provider_observation_cadence_preference",
    sectionId: "observation_readiness",
  },
  { id: "adoption_influence", label: "Influence", dbKey: "influence_level", sectionId: "relationship_intelligence" },
  {
    id: "office_responsiveness",
    label: "Responsiveness",
    dbKey: "provider_responsiveness",
    sectionId: "relationship_intelligence",
  },
];

function deployTone(posture: ProtectFieldTimePosture): ProviderIntelligenceInvestigationView["deployTone"] {
  if (posture === "clear_to_deploy") return "clear";
  if (posture === "validate_before_travel") return "caution";
  return "hold";
}

function formatFieldValue(contact: Record<string, unknown>, dbKey: string): string | null {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw || !fieldHasIntelligenceSignal(dbKey, raw)) return null;
  return formatIntelligenceCaptureDisplay(dbKey, raw) ?? scanLine(raw, LINE_MAX);
}

function buildSummary(input: {
  contact: Record<string, unknown>;
  storyHeadline: string;
  fieldTimeWhy: string;
}): string {
  const notes = String(input.contact.provider_strategy_notes ?? "").trim();
  if (notes.length > 30 && notes.length < 200) {
    return scanLine(notes, SUMMARY_MAX);
  }
  if (input.fieldTimeWhy.length > 20) {
    return scanLine(input.fieldTimeWhy, SUMMARY_MAX);
  }
  return scanLine(input.storyHeadline, SUMMARY_MAX);
}

function buildDeployLine(posture: ProtectFieldTimePosture): string {
  return CALM_DEPLOY_LINE[posture];
}

export function buildProviderIntelligenceInvestigationView(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
}): ProviderIntelligenceInvestigationView | null {
  if (!input.planning) return null;

  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();

  const commercialStage: ProviderCommercialWorkflowStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const story = buildProviderIntelligenceOperationalStory({
    contact: input.contact,
    planning: input.planning,
    specialty: input.specialty,
    relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  if (!story) return null;

  const protectFieldTime = buildProtectFieldTimeAssessment({
    contact: input.contact,
    relationshipStage,
    commercialStage,
    engagements: input.engagements,
  });

  const operationalWarnings = buildProviderOperationalWarningCards({
    contact: input.contact,
    planning: input.planning,
    relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const fieldDiscoveries = buildProviderFieldDiscoveryCards({
    contact: input.contact,
    planning: input.planning,
    specialty: input.specialty,
    relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const freshnessItems = buildIntelligenceFreshnessReconfirmationQueue(
    input.contact,
    input.fieldMetadata ?? {},
    MAX_STALE_LINES,
  );

  const staleDetails = freshnessItems
    .map((item) => item.staleWarning)
    .filter((line): line is string => Boolean(line?.trim()));

  const staleSummary =
    staleDetails.length > 0
      ? staleDetails.length === 1
        ? scanLine(staleDetails[0]!, 90)
        : `${staleDetails.length} notes on file may be outdated`
      : null;

  const workflowOnFile: InvestigationWorkflowSnapshot[] = [];
  const workflowMissingKeys: ProviderIntelligenceInvestigationView["workflowMissingKeys"] = [];

  for (const tile of WORKFLOW_TILE_DEFS) {
    const value = formatFieldValue(input.contact, tile.dbKey);
    if (value) {
      if (workflowOnFile.length < MAX_WORKFLOW_VISIBLE) {
        workflowOnFile.push({
          label: tile.label,
          value,
          sectionId: tile.sectionId,
          dbKey: tile.dbKey,
        });
      }
    } else {
      workflowMissingKeys.push({
        label: tile.label,
        sectionId: tile.sectionId,
        dbKey: tile.dbKey,
      });
    }
  }

  const leverage = story.leverageAction;
  const headline = scanLine(leverage.headline, LINE_MAX);
  const scan = scanLine(leverage.scan, 80);
  const primaryHeadline =
    scan.length > 12 && !headline.toLowerCase().includes(scan.slice(0, 10).toLowerCase())
      ? headline
      : headline;

  return {
    summary: buildSummary({
      contact: input.contact,
      storyHeadline: story.operationalState.headline,
      fieldTimeWhy: story.fieldTimeRisk.narrative.whyFieldTimeFails,
    }),
    deployLine: buildDeployLine(protectFieldTime.posture),
    deployTone: deployTone(protectFieldTime.posture),
    primaryAction: {
      headline: primaryHeadline,
      ctaLabel: leverage.cta.label,
      sectionId: leverage.cta.sectionId,
      dbKey: leverage.cta.dbKey,
    },
    operationalWarnings,
    fieldDiscoveries,
    workflowOnFile,
    workflowMissingCount: workflowMissingKeys.length,
    workflowMissingKeys,
    staleSummary,
    staleDetails,
  };
}
