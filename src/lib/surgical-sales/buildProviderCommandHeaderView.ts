/**
 * Provider detail sticky header — field execution command context.
 * Presentation only; reuses existing intelligence and pathway read models.
 */

import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { buildProviderIntelligenceSummaryView } from "@/lib/surgical-sales/buildProviderIntelligenceSummaryView";
import {
  resolveProviderCommercialMomentum,
  type ProviderCommercialMomentum,
} from "@/lib/surgical-sales/providerCommercialMomentum";
import {
  buildProviderCaseIntelligenceRollup,
  observationCaseHasCapturedNotes,
} from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import { buildProviderIntelligenceKnowledgeDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import {
  observationPermissionConfirmedOnFile,
} from "@/lib/surgical-sales/observationPermissionModel";
import {
  pickActiveObservationCase,
} from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import {
  buildProviderObservationCaseHref,
  buildProviderObservationCaseWorkflowHref,
} from "@/lib/surgical-sales/providerDirectoryLinks";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import { countObservedProcedures, type PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type ProviderCommandHeaderChipGroup = "execution" | "intelligence" | "gap" | "opportunity";

export type ProviderCommandHeaderChipTone =
  | "neutral"
  | "brand"
  | "success"
  | "warn"
  | "intel"
  | "gap";

export type ProviderCommandHeaderChip = {
  id: string;
  label: string;
  group: ProviderCommandHeaderChipGroup;
  tone: ProviderCommandHeaderChipTone;
};

export type ProviderCommandHeaderPrimaryActionKind =
  | "href"
  | "openObservationApproval";

export type ProviderCommandHeaderPrimaryAction = {
  label: string;
  kind: ProviderCommandHeaderPrimaryActionKind;
  href?: string;
};

export type ProviderCommandHeaderView = {
  metaSubtitle: string | null;
  chips: ProviderCommandHeaderChip[];
  overflowChipCount: number;
  primaryAction: ProviderCommandHeaderPrimaryAction;
  topOpportunityLabel: string | null;
};

/** Compact header strip — status only; long intelligence lives in overview panels. */
export const PROVIDER_COMMAND_HEADER_MAX_CHIPS = 3;
export const PROVIDER_COMMAND_HEADER_CHIP_MAX_LABEL_LENGTH = 28;

function shortenSpecialtyLabel(specialty: string | null): string | null {
  if (!specialty) return null;
  const trimmed = specialty.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+surgery$/i, "").trim() || trimmed;
}

function shortenProductSignal(label: string): string {
  const match = label.match(/^(.+?)\s+observed\b/i);
  if (match?.[1]) return `${match[1].trim()} observed`;
  return label;
}

function isCompactHeaderChipLabel(label: string): boolean {
  return label.trim().length <= PROVIDER_COMMAND_HEADER_CHIP_MAX_LABEL_LENGTH;
}

function providerDebriefCompleted(engagements: ProviderEngagementSummary[]): boolean {
  return engagements.some((engagement) => {
    const type = normalizeEngagementType(String(engagement.engagement_type ?? ""));
    return type === "provider_debrief" && String(engagement.status ?? "").toLowerCase() === "completed";
  });
}

function pushChip(
  chips: ProviderCommandHeaderChip[],
  seen: Set<string>,
  chip: ProviderCommandHeaderChip | null,
): void {
  if (!chip) return;
  const key = chip.label.trim().toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  chips.push(chip);
}

export function buildProviderCommandHeaderChips(input: {
  momentum: ProviderCommercialMomentum | null;
  completedObservations: number;
  caseRollup: ReturnType<typeof buildProviderCaseIntelligenceRollup>;
  biggestUnknown: string | null;
  topOpportunity: string | null;
  observationPathwayActive: boolean;
}): { chips: ProviderCommandHeaderChip[]; overflowChipCount: number } {
  const chips: ProviderCommandHeaderChip[] = [];
  const seen = new Set<string>();

  if (input.momentum?.state === "observation_ready") {
    pushChip(chips, seen, {
      id: "execution-observation-ready",
      label: "Observation Ready",
      group: "execution",
      tone: "brand",
    });
  } else if (
    input.momentum?.label &&
    input.momentum.state !== "early_discovery" &&
    isCompactHeaderChipLabel(input.momentum.label)
  ) {
    pushChip(chips, seen, {
      id: `execution-momentum-${input.momentum.state}`,
      label: input.momentum.label,
      group: input.momentum.tone === "success" || input.momentum.tone === "opportunity" ? "opportunity" : "execution",
      tone:
        input.momentum.tone === "success" || input.momentum.tone === "opportunity"
          ? "success"
          : input.momentum.tone === "brand"
            ? "brand"
            : "neutral",
    });
  }

  if (input.observationPathwayActive || input.completedObservations > 0 || input.caseRollup?.visible) {
    pushChip(chips, seen, {
      id: "execution-observation-progress",
      label: `${input.completedObservations} of ${PROVIDER_OBSERVATION_TARGET} observations`,
      group: "execution",
      tone: input.completedObservations > 0 ? "success" : "neutral",
    });
  }

  const productLabel = input.caseRollup?.productEvidence?.emergingSignalLabel;
  if (productLabel) {
    const compactProductLabel = shortenProductSignal(productLabel);
    if (isCompactHeaderChipLabel(compactProductLabel)) {
      pushChip(chips, seen, {
        id: "intel-product",
        label: compactProductLabel,
        group: "intelligence",
        tone: "intel",
      });
    }
  }

  const compactChips = chips.filter((chip) => isCompactHeaderChipLabel(chip.label));
  const visibleChips = compactChips.slice(0, PROVIDER_COMMAND_HEADER_MAX_CHIPS);
  const overflowChipCount = Math.max(0, compactChips.length - PROVIDER_COMMAND_HEADER_MAX_CHIPS);

  return {
    chips: visibleChips,
    overflowChipCount,
  };
}

export function resolveProviderCommandHeaderPrimaryAction(input: {
  contact: Record<string, unknown>;
  providerId: string;
  accountId?: string | null;
  newEngagementHref: string;
  cases?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
}): ProviderCommandHeaderPrimaryAction {
  const contact = input.contact ?? {};
  if (isProviderSalesCustomer(contact)) {
    const activeCase = pickActiveObservationCase(input.cases);
    if (activeCase?.id) {
      return {
        label: "Continue Observation Case",
        kind: "href",
        href: buildProviderObservationCaseWorkflowHref(String(activeCase.id)),
      };
    }
    return { label: "", kind: "href" };
  }
  const gateInput: PathwayGateInput = {
    contact,
    engagements: input.engagements,
    cases: input.cases,
  };

  if (!observationPermissionConfirmedOnFile(contact)) {
    return {
      label: "Update Permission",
      kind: "openObservationApproval",
    };
  }

  const completed = countObservedProcedures(gateInput);
  const observationCaseHref = buildProviderObservationCaseHref({
    providerId: input.providerId,
    accountId: input.accountId ?? null,
  });

  if (completed >= PROVIDER_OBSERVATION_TARGET && !providerDebriefCompleted(input.engagements ?? [])) {
    return {
      label: "Plan Provider Debrief",
      kind: "href",
      href: buildProviderEngagementTypeHref(input.newEngagementHref, "provider_debrief"),
    };
  }

  const activeCase = pickActiveObservationCase(input.cases);
  if (activeCase?.id) {
    const caseHref = buildProviderObservationCaseWorkflowHref(String(activeCase.id));
    const hasNotes = observationCaseHasCapturedNotes(activeCase);
    return {
      label: hasNotes ? "Continue Observation Case" : "Continue Observation Case",
      kind: "href",
      href: caseHref,
    };
  }

  if (completed < PROVIDER_OBSERVATION_TARGET) {
    return {
      label: "Add Observation Case",
      kind: "href",
      href: observationCaseHref,
    };
  }

  return {
    label: "Add Observation Case",
    kind: "href",
    href: observationCaseHref,
  };
}

export function buildProviderCommandHeaderMetaSubtitle(input: {
  organizationName: string | null;
  specialty: string | null;
}): string | null {
  const org = input.organizationName?.trim() || null;
  const specialty = shortenSpecialtyLabel(input.specialty);
  if (org && specialty) return `${org} · ${specialty}`;
  return org || specialty;
}

export function buildProviderCommandHeaderView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  accountId?: string | null;
  specialty?: string | null;
  organizationName?: string | null;
  relationshipStage?: string;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  newEngagementHref: string;
}): ProviderCommandHeaderView {
  const contact = input.contact ?? {};
  const relationshipStage = String(input.relationshipStage || contact.provider_relationship_stage || "early_discovery");
  const snap = buildProviderIntelligenceSnapshot(contact, input.providerId);
  const intelView = buildProviderIntelligenceSummaryView({
    contact,
    planning: snap.planning,
  });
  const momentum = resolveProviderCommercialMomentum({
    contact,
    relationshipStage,
    planning: snap.planning,
    engagements: input.engagements ?? [],
    opportunities: input.opportunities,
    cases: input.cases,
    intelOverall: intelView.overallStatus,
  });

  const briefing = buildProviderIntelligenceKnowledgeDashboardView({
    contact,
    providerId: input.providerId,
    accountId: input.accountId,
    engagements: input.engagements,
    cases: input.cases,
  });

  const caseRollup = briefing.caseIntelligence;
  const completedObservations = caseRollup?.completedCount ?? countObservedProcedures({
    contact,
    engagements: input.engagements,
    cases: input.cases,
  });

  const { chips, overflowChipCount } = buildProviderCommandHeaderChips({
    momentum,
    completedObservations,
    caseRollup,
    biggestUnknown: briefing.pulse.biggestUnknown,
    topOpportunity: briefing.pulse.strongestCommercialSignal,
    observationPathwayActive:
      momentum?.state === "observation_ready" ||
      Boolean(observationPermissionConfirmedOnFile(contact)) ||
      Boolean(caseRollup?.visible),
  });

  return {
    metaSubtitle: buildProviderCommandHeaderMetaSubtitle({
      organizationName: input.organizationName ?? null,
      specialty: input.specialty ?? null,
    }),
    chips,
    overflowChipCount,
    primaryAction: resolveProviderCommandHeaderPrimaryAction({
      contact,
      providerId: input.providerId,
      accountId: input.accountId,
      newEngagementHref: input.newEngagementHref,
      cases: input.cases,
      engagements: input.engagements,
    }),
    topOpportunityLabel: briefing.pulse.strongestCommercialSignal,
  };
}

export function providerCommandHeaderChipClassName(tone: ProviderCommandHeaderChipTone): string {
  if (tone === "brand") return " provider-command-chip--brand";
  if (tone === "success") return " provider-command-chip--success";
  if (tone === "warn") return " provider-command-chip--warn";
  if (tone === "intel") return " provider-command-chip--intel";
  return " provider-command-chip--neutral";
}
