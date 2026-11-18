/**
 * Operational risks for provider overview — field-time protection (not CRM notes).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  learningGapForField,
  type IntelligenceLearningGap,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  isIntelligenceSectionVisibleForCommercialStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  overviewRiskConsequence,
  overviewRiskMitigation,
  overviewRiskTitle,
  overviewRiskTitleForIncumbent,
  overviewRiskTitleForInfluence,
  overviewRiskTitleForOrAccess,
  overviewRiskTitleForScheduling,
} from "@/lib/surgical-sales/providerOverviewRiskCopy";

export { PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_TITLE as PROVIDER_OPERATIONAL_RISKS_TITLE } from "@/lib/surgical-sales/providerOverviewVocabulary";

export type ProviderOperationalRiskId =
  | "credentialing_unknown"
  | "or_access_blockers"
  | "incumbent_vendor_strength"
  | "unclear_influence_structure"
  | "scheduling_uncertainty"
  | "weak_engagement_responsiveness";

export type ProviderOperationalRiskSeverity = "high" | "medium" | "low";

export type ProviderOperationalRisk = {
  id: ProviderOperationalRiskId;
  title: string;
  headline: string;
  severity: ProviderOperationalRiskSeverity;
  severityLabel: string;
  consequence: string;
  mitigation: string;
  consequenceScan: string;
  mitigationScan: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
};

const SEVERITY_LABELS: Record<ProviderOperationalRiskSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_RANK: Record<ProviderOperationalRiskSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

type ProviderOperationalRiskDraft = Omit<
  ProviderOperationalRisk,
  "consequenceScan" | "mitigationScan"
>;

function finalizeOperationalRisk(risk: ProviderOperationalRiskDraft): ProviderOperationalRisk {
  return {
    ...risk,
    consequenceScan: scanLine(risk.consequence, 56),
    mitigationScan: scanLine(risk.mitigation, 56),
  };
}

const INCUMBENT_STRENGTH_PATTERNS =
  /\b(entrenched|dominant|exclusive|sole vendor|standard on|locked in|preference card|on contract|primary vendor|committed to|loyal to|years with)\b/i;

const WEAK_RESPONSIVENESS_PATTERNS =
  /\b(slow to respond|delayed|rarely returns|hard to reach|weeks to reply|unresponsive|sporadic)\b/i;

const ACCESS_BLOCKER_PATTERNS =
  /\b(block|denied|restricted|committee|gate|not allowed|no vendor|limited access|credentialing)\b/i;

function gap(
  contact: Record<string, unknown>,
  dbKey: string,
  sectionId: ProviderIntelligenceSectionId,
): IntelligenceLearningGap | null {
  return learningGapForField(dbKey, sectionId, contact);
}

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function worstGap(
  contact: Record<string, unknown>,
  keys: { dbKey: string; sectionId: ProviderIntelligenceSectionId }[],
): IntelligenceLearningGap | null {
  let worst: IntelligenceLearningGap | null = null;
  for (const { dbKey, sectionId } of keys) {
    const g = gap(contact, dbKey, sectionId);
    if (!g) continue;
    if (!worst || (g.state === "unknown" && worst.state !== "unknown")) {
      worst = g;
    } else if (!worst) {
      worst = g;
    }
  }
  return worst;
}

function detectCredentialingUnknown(
  contact: Record<string, unknown>,
): ProviderOperationalRiskDraft | null {
  const triggers = [
    { dbKey: "provider_credentialing_status", sectionId: "or_environment" as const },
    { dbKey: "provider_observation_credentialing_needed", sectionId: "observation_readiness" as const },
  ];
  const g = worstGap(contact, triggers);
  if (!g) return null;

  const vendorGap = gap(contact, "provider_credentialing_status", "or_environment");
  const obsGap = gap(contact, "provider_observation_credentialing_needed", "observation_readiness");
  const severity: ProviderOperationalRiskSeverity =
    vendorGap?.state === "unknown" && obsGap?.state === "unknown"
      ? "high"
      : g.state === "unknown"
        ? "high"
        : "medium";

  const title = overviewRiskTitle({ riskId: "credentialing_unknown", dbKey: g.dbKey });
  return {
    id: "credentialing_unknown",
    title,
    headline: title,
    severity,
    severityLabel: SEVERITY_LABELS[severity],
    consequence: overviewRiskConsequence(
      "credentialing_unknown",
      "Visits may not include product or observation until clearance is confirmed.",
    ),
    mitigation: overviewRiskMitigation(
      "credentialing_unknown",
      "Confirm vendor and observation credentialing with the coordinator.",
    ),
    sectionId: g.sectionId,
    dbKey: g.dbKey,
  };
}

function detectOrAccessBlockers(contact: Record<string, unknown>): ProviderOperationalRiskDraft | null {
  const accessGap = gap(contact, "provider_observation_access_path", "observation_readiness");
  const feasibilityGap = gap(contact, "provider_observation_feasibility", "observation_readiness");
  const accessText = fieldText(contact, "provider_observation_access_path");
  const feasibilityText = fieldText(contact, "provider_observation_feasibility");

  const hasBlockerSignal =
    ACCESS_BLOCKER_PATTERNS.test(accessText) ||
    /\b(not allowed|no observation|restricted)\b/i.test(feasibilityText);

  if (!accessGap && !feasibilityGap && !hasBlockerSignal) return null;

  const g = accessGap ?? feasibilityGap;
  const severity: ProviderOperationalRiskSeverity =
    feasibilityGap?.state === "unknown" || accessGap?.state === "unknown" || hasBlockerSignal
      ? "high"
      : "medium";

  const title = overviewRiskTitleForOrAccess(hasBlockerSignal);

  return {
    id: "or_access_blockers",
    title,
    headline: title,
    severity,
    severityLabel: SEVERITY_LABELS[severity],
    consequence: overviewRiskConsequence(
      "or_access_blockers",
      "Observation may not happen with the access you planned.",
    ),
    mitigation: overviewRiskMitigation(
      "or_access_blockers",
      "Map committee, scheduler, and credentialing gates first.",
    ),
    sectionId: "observation_readiness",
    dbKey: g?.dbKey ?? "provider_observation_access_path",
  };
}

function detectIncumbentVendorStrength(
  contact: Record<string, unknown>,
): ProviderOperationalRiskDraft | null {
  const vendorGap = gap(contact, "provider_current_vendors", "or_environment");
  const competitiveGap = gap(contact, "provider_competitive_products", "commercial_signals");
  const vendorText = fieldText(contact, "provider_current_vendors");
  const competitiveText = fieldText(contact, "provider_competitive_products");
  const combined = `${vendorText} ${competitiveText}`.trim();

  const entrenchedCaptured =
    fieldHasIntelligenceSignal("provider_current_vendors", vendorText) &&
    INCUMBENT_STRENGTH_PATTERNS.test(combined);

  if (vendorGap?.state === "unknown" && competitiveGap?.state === "unknown") {
    const title = overviewRiskTitleForIncumbent(false, true);
    return {
      id: "incumbent_vendor_strength",
      title,
      headline: title,
      severity: "medium",
      severityLabel: SEVERITY_LABELS.medium,
      consequence: overviewRiskConsequence(
        "incumbent_vendor_strength",
        "Trials may miss the real incumbent pressure in the room.",
      ),
      mitigation: overviewRiskMitigation(
        "incumbent_vendor_strength",
        "Map observation access workflow and scheduling lead time before case days.",
      ),
      sectionId: "or_environment",
      dbKey: "provider_current_vendors",
    };
  }

  if (entrenchedCaptured) {
    const title = overviewRiskTitleForIncumbent(true, false);
    return {
      id: "incumbent_vendor_strength",
      title,
      headline: title,
      severity: "high",
      severityLabel: SEVERITY_LABELS.high,
      consequence: overviewRiskConsequence(
        "incumbent_vendor_strength",
        "Generic demos may not move preference-card decisions.",
      ),
      mitigation: overviewRiskMitigation(
        "incumbent_vendor_strength",
        "Validate dissatisfaction before another observation day.",
      ),
      sectionId: "commercial_signals",
      dbKey: "provider_competitive_products",
    };
  }

  if (competitiveGap && competitiveGap.state === "unknown") {
    const title = overviewRiskTitle({ riskId: "incumbent_vendor_strength", dbKey: competitiveGap.dbKey });
    return {
      id: "incumbent_vendor_strength",
      title,
      headline: title,
      severity: "medium",
      severityLabel: SEVERITY_LABELS.medium,
      consequence: overviewRiskConsequence(
        "incumbent_vendor_strength",
        "Trial asks may not address the real incumbent.",
      ),
      mitigation: overviewRiskMitigation(
        "incumbent_vendor_strength",
        "Capture incumbent products and access rules first.",
      ),
      sectionId: "commercial_signals",
      dbKey: "provider_competitive_products",
    };
  }

  return null;
}

function detectUnclearInfluenceStructure(
  contact: Record<string, unknown>,
): ProviderOperationalRiskDraft | null {
  const influenceGap = gap(contact, "influence_level", "relationship_intelligence");
  const decisionGap = gap(contact, "provider_decision_maker_status", "relationship_intelligence");
  const championGap = gap(contact, "provider_champion_potential", "relationship_intelligence");

  const gaps = [influenceGap, decisionGap, championGap].filter(Boolean) as IntelligenceLearningGap[];
  if (gaps.length === 0) return null;

  const unknownCount = gaps.filter((g) => g.state === "unknown").length;
  const severity: ProviderOperationalRiskSeverity =
    unknownCount >= 2 ? "high" : unknownCount === 1 ? "medium" : "low";

  const primary = decisionGap ?? influenceGap ?? championGap!;

  const title = overviewRiskTitleForInfluence(unknownCount);
  return {
    id: "unclear_influence_structure",
    title,
    headline: title,
    severity,
    severityLabel: SEVERITY_LABELS[severity],
    consequence: overviewRiskConsequence(
      "unclear_influence_structure",
      "Time with the wrong contact may not move the case.",
    ),
    mitigation: overviewRiskMitigation(
      "unclear_influence_structure",
      "Map decision role, influence, and champion.",
    ),
    sectionId: "relationship_intelligence",
    dbKey: primary.dbKey,
  };
}

function detectSchedulingUncertainty(
  contact: Record<string, unknown>,
  engagements: ProviderEngagementSummary[],
): ProviderOperationalRiskDraft | null {
  const coordinatorGap = gap(contact, "provider_observation_coordinator_contact", "observation_readiness");
  const windowGap = gap(contact, "provider_observation_best_days_case_types", "observation_readiness");
  const cadenceGap = gap(contact, "provider_observation_cadence_preference", "observation_readiness");

  const hasUpcoming = engagements.some((e) => isUpcomingEngagementStatus(e.status));
  const gaps = [coordinatorGap, windowGap, cadenceGap].filter(Boolean) as IntelligenceLearningGap[];
  if (gaps.length === 0) return null;

  const unknownCount = gaps.filter((g) => g.state === "unknown").length;
  let severity: ProviderOperationalRiskSeverity =
    coordinatorGap?.state === "unknown" && windowGap?.state === "unknown"
      ? "high"
      : unknownCount >= 2
        ? "high"
        : "medium";

  if (hasUpcoming && coordinatorGap?.state === "unknown") {
    severity = "high";
  }

  const primary = coordinatorGap ?? windowGap ?? cadenceGap!;

  const title = overviewRiskTitleForScheduling(coordinatorGap?.state === "unknown");
  return {
    id: "scheduling_uncertainty",
    title,
    headline: title,
    severity,
    severityLabel: SEVERITY_LABELS[severity],
    consequence: overviewRiskConsequence(
      "scheduling_uncertainty",
      "Cases may not post or book on the day you planned.",
    ),
    mitigation: overviewRiskMitigation(
      "scheduling_uncertainty",
      "Confirm coordinator ownership and posting window.",
    ),
    sectionId: "observation_readiness",
    dbKey: primary.dbKey,
  };
}

function detectWeakEngagementResponsiveness(
  contact: Record<string, unknown>,
): ProviderOperationalRiskDraft | null {
  const responsivenessGap = gap(contact, "provider_responsiveness", "relationship_intelligence");
  const responsivenessText = fieldText(contact, "provider_responsiveness");
  const strength = String(contact.relationship_strength || "unknown").trim().toLowerCase();

  const weakCaptured =
    fieldHasIntelligenceSignal("provider_responsiveness", responsivenessText) &&
    WEAK_RESPONSIVENESS_PATTERNS.test(responsivenessText);

  if (!responsivenessGap && strength !== "weak" && !weakCaptured) return null;

  const severity: ProviderOperationalRiskSeverity = weakCaptured || strength === "weak" ? "high" : "medium";

  const title = overviewRiskTitle({ riskId: "weak_engagement_responsiveness", dbKey: responsivenessGap?.dbKey });

  return {
    id: "weak_engagement_responsiveness",
    title,
    headline: title,
    severity,
    severityLabel: SEVERITY_LABELS[severity],
    consequence: overviewRiskConsequence(
      "weak_engagement_responsiveness",
      "Follow-up and scheduling may stall between visits.",
    ),
    mitigation: overviewRiskMitigation(
      "weak_engagement_responsiveness",
      "Test response time on the next touch.",
    ),
    sectionId: "relationship_intelligence",
    dbKey: responsivenessGap?.dbKey ?? "provider_responsiveness",
  };
}

const DETECTORS: ((ctx: {
  contact: Record<string, unknown>;
  engagements: ProviderEngagementSummary[];
}) => ProviderOperationalRiskDraft | null)[] = [
  ({ contact }) => detectCredentialingUnknown(contact),
  ({ contact }) => detectOrAccessBlockers(contact),
  ({ contact }) => detectIncumbentVendorStrength(contact),
  ({ contact }) => detectUnclearInfluenceStructure(contact),
  ({ contact, engagements }) => detectSchedulingUncertainty(contact, engagements),
  ({ contact }) => detectWeakEngagementResponsiveness(contact),
];

export function buildProviderOperationalRisks(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  maxItems?: number;
}): ProviderOperationalRisk[] {
  const engagements = input.engagements ?? [];
  const risks: ProviderOperationalRisk[] = [];

  for (const detect of DETECTORS) {
    const risk = detect({ contact: input.contact, engagements });
    if (!risk) continue;
    if (!isIntelligenceSectionVisibleForCommercialStage(risk.sectionId, input.commercialStage)) {
      continue;
    }
    risks.push(finalizeOperationalRisk(risk));
  }

  return risks
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, input.maxItems ?? 6);
}
