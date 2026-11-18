/**
 * Provider overview briefing — calm, operational, rep-friendly display copy.
 */

export const PROVIDER_OVERVIEW_BRIEFING_LABEL = {
  operationalPathway: "Operational pathway",
  operationalReadiness: "Operational readiness",
  operationalReadinessPurpose: "What operational intelligence do we currently have?",
  missionSummary: "Mission status",
  missionSummaryAria: "Mission briefing summary",
  /** @deprecated Use pathwayStageIntelligenceSectionLabel(stageId) */
  missionBlockers: "Discovery Targets",
  pathwayIntelligenceSection: "Discovery Targets",
  missionRecommendedMove: "Recommended move",
  operationalConfidence: "Operational confidence",
  currentFocus: "Current focus",
  /** @deprecated Use currentFocus */
  focusArea: "Current focus",
  nextFieldMove: "Next action",
  currentStatus: "Status",
  evidenceCaptured: "Evidence captured",
  opensAfterApproval: "Opens after approval",
  upcomingEngagement: "Upcoming engagement",
  debriefNeeded: "Debrief needed",
  visibility: "Visibility",
  accessConfidence: "Access confidence",
  readiness: "Readiness",
  accessWorkflow: "Access workflow",
  discoveryIntelligence: "Discovery intelligence",
  clinicalValidation: "Clinical validation",
  clinicalNotStartedYet: "Not started yet",
  /** @deprecated Use readiness */
  observationReadiness: "Observation Readiness",
  fieldIntelligence: "Field intelligence",
  focusOpen: "Open exploration",
  noneScheduled: "None scheduled",
  nextAction: "Next action",
  whyNow: "Why now",
  /** @deprecated Use whyNow */
  purpose: "Why now",
  upcoming: "Upcoming",
  secondaryActions: "Secondary actions",
  priorityUnknowns: "Operational unknowns",
  readinessItemsTracked: "Readiness items tracked",
  /** @deprecated Use accessConfidence */
  accessStatus: "Access confidence",
  /** @deprecated */
  momentum: "Momentum",
  /** @deprecated Use nextAction rail structure */
  executionRailEyebrow: "What happens next",
  /** @deprecated Use nextAction rail structure */
  executionRailTitle: "Next actions",
  /** @deprecated */
  recommendedNextStep: "Recommended next step",
  /** @deprecated */
  executionUnlock: "Unlocks",
  /** @deprecated Use executionUnlock */
  whyItMatters: "Unlocks",
  /** @deprecated Use secondaryActions */
  supportingActions: "Secondary actions",
  /** @deprecated Removed from command rail */
  providerSnapshot: "Provider snapshot",
} as const;

/** Discovery pathway sections on Provider Overview — title + short subtitle only. */
export const DISCOVERY_OVERVIEW_GROUP_COPY = {
  access_readiness: {
    title: "Observation access",
    subtitle: "Approval, scheduling, and facility pathway.",
  },
  clinical_fit: {
    title: "Clinical signals",
    subtitle: "Workflow fit and case opportunity.",
  },
  champion_landscape: {
    title: "Key relationships",
    subtitle: "Influence paths and decision support.",
  },
} as const;

export type DiscoveryOverviewGroupId = keyof typeof DISCOVERY_OVERVIEW_GROUP_COPY;

/** Map pathway visibility band to rep-friendly language. */
export function formatOverviewVisibility(riskLevel: string): string {
  switch (riskLevel.trim().toLowerCase()) {
    case "low":
      return "Strong";
    case "medium":
      return "Building";
    case "high":
      return "Early";
    default:
      return "Forming";
  }
}

/** Rep-facing operational confidence for the command surface. */
export function formatOperationalConfidence(
  confidenceLevel: string,
  riskLevel: string,
): string {
  const confidence = confidenceLevel.trim().toLowerCase();
  const risk = riskLevel.trim().toLowerCase();

  if (confidence === "validated" || confidence === "strong") {
    return "Strong procedural visibility";
  }
  if (confidence === "developing" && (risk === "low" || risk === "medium")) {
    return "Partial operational visibility";
  }
  if (confidence === "early" || risk === "high") {
    return "Limited field validation";
  }
  if (confidence === "developing") {
    return "Confidence forming";
  }
  return "Limited field validation";
}

/** Soften access / confidence labels for briefing telemetry. */
export function formatOverviewAccessConfidence(confidenceLevel: string): string {
  const raw = confidenceLevel.trim();
  if (!raw) return "Building";
  switch (raw.toLowerCase()) {
    case "early":
      return "Forming";
    case "developing":
      return "Building";
    case "strong":
      return "Established";
    case "validated":
      return "Validated";
    default:
      return sanitizeFieldFriendlyOverviewCopy(raw);
  }
}

/**
 * Strip legacy technical / punitive phrasing from user-visible overview copy.
 */
export function sanitizeFieldFriendlyOverviewCopy(text: string): string {
  if (!text?.trim()) return "";
  let t = text.trim();
  t = t.replace(/\bprimary blocker\b/gi, "current focus");
  t = t.replace(/\bcurrent blocker\b/gi, "current focus");
  t = t.replace(/\boperational blocker\b/gi, "current focus");
  t = t.replace(/\bblockers?\b/gi, "validation");
  t = t.replace(/\bvisibility risk\b/gi, "visibility");
  t = t.replace(/\bhigh risk\b/gi, "early visibility");
  t = t.replace(/\brisk\b/gi, "visibility");
  t = t.replace(/\boperational signals?\b/gi, "readiness");
  t = t.replace(/\bfield signals?\b/gi, "readiness");
  t = t.replace(/\bsignals?\b/gi, "readiness");
  t = t.replace(/\badvancement signal\b/gi, "readiness");
  t = t.replace(/\btactical gap\b/gi, "next field move");
  t = t.replace(/\boperational gaps?\b/gi, "validation");
  t = t.replace(/\bgaps?\b/gi, "validation");
  t = t.replace(/\bblocked\b/gi, "not yet confirmed");
  t = t.replace(/\bmissing\b/gi, "still learning");
  t = t.replace(/\bnot captured\b/gi, "not yet captured");
  t = t.replace(/\blow confidence\b/gi, "limited field context available");
  t = t.replace(/\baccess barriers?\b/gi, "access details open");
  t = t.replace(/\bnot pursuing observation\b/gi, "observation permission declined");
  t = t.replace(/\bpriority learning\b/gi, "worth confirming soon");
  t = t.replace(/\bdeployment gaps?\b/gi, "supporting details");
  t = t.replace(/\bcritical\b/gi, "priority");
  t = t.replace(/\bfocus area\b/gi, "current focus");
  t = t.replace(/\bdeferred until approval\b/gi, "opens after approval");
  return t.replace(/\s{2,}/g, " ").trim();
}

/** User-visible focus line — strip legacy punitive phrasing when it slips through. */
export function softenOverviewFocusCopy(text: string | null): string | null {
  if (!text?.trim()) return null;
  const softened = sanitizeFieldFriendlyOverviewCopy(text);
  return softened || null;
}

export function formatOverviewMomentum(visibility: string, accessConfidence: string): string {
  return `${visibility} visibility · ${accessConfidence} access confidence`;
}

export function formatNextFieldMove(nextMove: string | null): string | null {
  if (!nextMove) return null;
  const line = sanitizeFieldFriendlyOverviewCopy(nextMove);
  return /^next (?:move|field move):/i.test(line)
    ? line
    : `Next field move: ${line}`;
}

/** Strip redundant prefix when next move is shown in its own section. */
export function displayNextFieldMoveLine(nextMove: string | null): string | null {
  if (!nextMove?.trim()) return null;
  const stripped = nextMove
    .trim()
    .replace(/^next (?:move|field move):\s*/i, "")
    .trim();
  const line = sanitizeFieldFriendlyOverviewCopy(stripped);
  return line || null;
}
