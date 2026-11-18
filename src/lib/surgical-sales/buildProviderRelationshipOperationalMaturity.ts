/**
 * Relationship operational maturity — field-authentic indicators (not abstract confidence).
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  formatIntelligenceCaptureSummaryChip,
  labelForIntelligenceToken,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { OPERATIONAL_INTEL_RELATIONSHIP } from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";

export const RELATIONSHIP_OPERATIONAL_MATURITY_TITLE = "Relationship operational maturity";
export const RELATIONSHIP_OPERATIONAL_MATURITY_KICKER =
  "How the account actually runs for reps in the field";

export type RelationshipMaturityDimensionId =
  | "surgeon_engagement"
  | "staff_responsiveness"
  | "scheduler_accessibility"
  | "vendor_friendliness"
  | "rep_friendliness"
  | "follow_through_reliability";

export type RelationshipMaturitySignalStatus = "positive" | "caution" | "restrictive" | "unknown";

export type RelationshipMaturityIndicator = {
  id: RelationshipMaturityDimensionId;
  label: string;
  status: RelationshipMaturitySignalStatus;
  /** One-line field read — rep-facing. */
  scanLine: string;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
};

export type ProviderRelationshipOperationalMaturity = {
  title: string;
  kicker: string;
  /** Primary scan line for status cards and overview. */
  headline: string;
  tone: "success" | "warn" | "neutral" | "blocked";
  indicators: RelationshipMaturityIndicator[];
  documentedCount: number;
  openCount: number;
};

const DIMENSION_LABELS: Record<RelationshipMaturityDimensionId, string> = {
  surgeon_engagement: "Surgeon engagement style",
  staff_responsiveness: "Staff responsiveness",
  scheduler_accessibility: "Scheduler accessibility",
  vendor_friendliness: "Vendor friendliness",
  rep_friendliness: "Rep friendliness",
  follow_through_reliability: "Follow-through reliability",
};

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function fieldToken(contact: Record<string, unknown>, dbKey: string): string | null {
  const raw = fieldText(contact, dbKey);
  if (!raw) return null;
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  return parsed.token ?? parsed.tokens[0] ?? null;
}

function fieldNotes(contact: Record<string, unknown>, dbKey: string): string {
  const raw = fieldText(contact, dbKey);
  if (!raw) return "";
  return String(parseIntelligenceCaptureValue(dbKey, raw).notes ?? "").trim();
}

function hasSignal(contact: Record<string, unknown>, dbKey: string): boolean {
  return fieldHasIntelligenceSignal(dbKey, fieldText(contact, dbKey));
}

function notesMatch(contact: Record<string, unknown>, dbKey: string, pattern: RegExp): boolean {
  const combined = `${fieldText(contact, dbKey)} ${fieldNotes(contact, dbKey)}`;
  return pattern.test(combined);
}

function buildSurgeonEngagement(contact: Record<string, unknown>): RelationshipMaturityIndicator {
  const dbKey = "provider_communication_style";
  const token = fieldToken(contact, dbKey);
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, fieldText(contact, dbKey));
  const base = {
    id: "surgeon_engagement" as const,
    label: DIMENSION_LABELS.surgeon_engagement,
    dbKey,
    sectionId: "relationship_intelligence" as const,
  };

  if (!hasSignal(contact, dbKey)) {
    return {
      ...base,
      status: "unknown",
      scanLine: OPERATIONAL_INTEL_RELATIONSHIP.engagementUnknown,
    };
  }

  if (token === "cold" || notesMatch(contact, dbKey, /\b(guarded|closed|dismissive|arm.?s length)\b/i)) {
    return {
      ...base,
      status: "restrictive",
      scanLine: scanLine("Highly guarded access environment", 72),
    };
  }

  if (token === "advocate" || notesMatch(contact, dbKey, /\b(post.?case|debrief|open|approachable)\b/i)) {
    return {
      ...base,
      status: "positive",
      scanLine: scanLine("Surgeon open during post-case discussions", 72),
    };
  }

  if (token === "warm") {
    return {
      ...base,
      status: "positive",
      scanLine: scanLine(chip ? `Surgeon approachable — ${chip.toLowerCase()}` : "Surgeon approachable between cases", 72),
    };
  }

  if (token === "neutral") {
    return {
      ...base,
      status: "caution",
      scanLine: scanLine("Surgeon neutral — engagement varies by topic and timing", 72),
    };
  }

  return {
    ...base,
    status: "caution",
    scanLine: scanLine(chip ?? "Engagement style captured — confirm in-room behavior", 72),
  };
}

function buildStaffResponsiveness(contact: Record<string, unknown>): RelationshipMaturityIndicator {
  const dbKey = "provider_responsiveness";
  const token = fieldToken(contact, dbKey);
  const base = {
    id: "staff_responsiveness" as const,
    label: DIMENSION_LABELS.staff_responsiveness,
    dbKey,
    sectionId: "relationship_intelligence" as const,
  };

  if (!hasSignal(contact, dbKey)) {
    return {
      ...base,
      status: "unknown",
      scanLine: "Office response pattern between case days not confirmed",
    };
  }

  if (token === "fast" || token === "same_day") {
    return {
      ...base,
      status: "positive",
      scanLine: scanLine("Staff responsive between case days", 72),
    };
  }

  if (token === "slow") {
    return {
      ...base,
      status: "caution",
      scanLine: scanLine("Office staff slow to return messages between case days", 72),
    };
  }

  if (token === "inconsistent") {
    return {
      ...base,
      status: "caution",
      scanLine: scanLine("Responsiveness inconsistent — narrow follow-up windows", 72),
    };
  }

  const label = labelForIntelligenceToken(dbKey, token ?? "");
  return {
    ...base,
    status: "caution",
    scanLine: scanLine(label ? `Staff responsiveness: ${label}` : "Responsiveness captured — confirm cadence", 72),
  };
}

function buildSchedulerAccessibility(contact: Record<string, unknown>): RelationshipMaturityIndicator {
  const coordinatorKey = "provider_observation_coordinator_contact";
  const accessKey = "provider_observation_access_path";
  const base = {
    id: "scheduler_accessibility" as const,
    label: DIMENSION_LABELS.scheduler_accessibility,
    dbKey: coordinatorKey,
    sectionId: "observation_readiness" as const,
  };

  const hasCoordinator = hasSignal(contact, coordinatorKey);
  const accessTokens = parseIntelligenceCaptureValue(accessKey, fieldText(contact, accessKey)).tokens;
  const restrictiveAccess = accessTokens.some((t) =>
    ["committee", "credentialing", "rep_limit", "scheduler", "trial_block"].includes(t),
  );
  const hasIncumbentBlock = notesMatch(contact, accessKey, /\b(incumbent|sponsor|exclusive|locked)\b/i);

  if (!hasCoordinator && !hasSignal(contact, accessKey)) {
    return {
      ...base,
      status: "unknown",
      scanLine: "Scheduler accessibility unknown — map OR coordinator first",
    };
  }

  if (!hasCoordinator && restrictiveAccess) {
    return {
      ...base,
      status: "restrictive",
      scanLine: scanLine("Scheduler difficult without coordinator on file", 72),
    };
  }

  if (hasIncumbentBlock || (restrictiveAccess && !accessTokens.includes("none"))) {
    return {
      ...base,
      status: "restrictive",
      scanLine: scanLine("Scheduler difficult without incumbent sponsor", 72),
    };
  }

  if (hasCoordinator && !restrictiveAccess) {
    const coordChip = formatIntelligenceCaptureSummaryChip(coordinatorKey, fieldText(contact, coordinatorKey));
    return {
      ...base,
      status: "positive",
      scanLine: scanLine(
        coordChip ? `Scheduler reachable — ${coordChip}` : "Scheduler reachable once access rules are clear",
        72,
      ),
    };
  }

  if (hasCoordinator) {
    return {
      ...base,
      status: "caution",
      scanLine: scanLine("Coordinator identified — confirm posting and access gates", 72),
    };
  }

  return {
    ...base,
    status: "caution",
    scanLine: scanLine("Access gates on file — coordinator still needed for booking", 72),
  };
}

function buildVendorFriendliness(contact: Record<string, unknown>): RelationshipMaturityIndicator {
  const vendorKey = "provider_current_vendors";
  const credKey = "provider_credentialing_status";
  const teamKey = "provider_or_team_dynamics";
  const base = {
    id: "vendor_friendliness" as const,
    label: DIMENSION_LABELS.vendor_friendliness,
    dbKey: vendorKey,
    sectionId: "or_environment" as const,
  };

  const hasVendor = hasSignal(contact, vendorKey);
  const hasCred = hasSignal(contact, credKey);
  const credToken = fieldToken(contact, credKey);
  const teamNotes = `${fieldText(contact, teamKey)} ${fieldNotes(contact, teamKey)}`;
  const vendorNotes = `${fieldText(contact, vendorKey)} ${fieldNotes(contact, vendorKey)}`;

  if (!hasVendor && !hasCred) {
    return {
      ...base,
      status: "unknown",
      scanLine: OPERATIONAL_INTEL_RELATIONSHIP.vendorRulesUnknown,
    };
  }

  if (
    credToken === "blocked" ||
    credToken === "in_progress" ||
    /\b(no vendor|rep limit|locked|exclusive|incumbent only)\b/i.test(vendorNotes + teamNotes)
  ) {
    return {
      ...base,
      status: "restrictive",
      scanLine: scanLine("Tight vendor rules — credentialing or committee gates access", 72),
    };
  }

  if (credToken === "cleared" || /\b(open|welcoming|multiple vendor|rotation)\b/i.test(vendorNotes)) {
    return {
      ...base,
      status: "positive",
      scanLine: scanLine("OR vendor environment workable for new entrants", 72),
    };
  }

  const chip = formatIntelligenceCaptureSummaryChip(vendorKey, fieldText(contact, vendorKey));
  return {
    ...base,
    status: "caution",
    scanLine: scanLine(chip ? `Incumbent landscape: ${chip}` : "Vendor landscape captured — confirm access rules", 72),
  };
}

function buildRepFriendliness(contact: Record<string, unknown>): RelationshipMaturityIndicator {
  const supportKey = "provider_support_expectations";
  const commKey = "provider_communication_style";
  const base = {
    id: "rep_friendliness" as const,
    label: DIMENSION_LABELS.rep_friendliness,
    dbKey: supportKey,
    sectionId: "or_environment" as const,
  };

  const supportToken = fieldToken(contact, supportKey);
  const warmth = fieldToken(contact, commKey);
  const teamNotes = fieldNotes(contact, "provider_or_team_dynamics");

  if (!hasSignal(contact, supportKey) && !hasSignal(contact, commKey)) {
    return {
      ...base,
      status: "unknown",
      scanLine: "How the account treats reps not documented",
    };
  }

  if (
    supportToken === "minimal" ||
    /\b(no rep|rep.?free|vendor.?free|limited vendor)\b/i.test(teamNotes)
  ) {
    return {
      ...base,
      status: "restrictive",
      scanLine: scanLine("Rep access limited — facility expects low-touch vendor presence", 72),
    };
  }

  if (supportToken === "high_touch" || supportToken === "rep_led" || warmth === "warm" || warmth === "advocate") {
    return {
      ...base,
      status: "positive",
      scanLine: scanLine("Rep-friendly when scheduled — team expects vendor support in the room", 72),
    };
  }

  return {
    ...base,
    status: "caution",
    scanLine: scanLine("Rep touch acceptable — confirm expectations before over-contacting", 72),
  };
}

function buildFollowThrough(contact: Record<string, unknown>): RelationshipMaturityIndicator {
  const dbKey = "provider_follow_up_approach";
  const token = fieldToken(contact, dbKey);
  const champion = fieldToken(contact, "provider_champion_potential");
  const base = {
    id: "follow_through_reliability" as const,
    label: DIMENSION_LABELS.follow_through_reliability,
    dbKey,
    sectionId: "relationship_intelligence" as const,
  };

  if (!hasSignal(contact, dbKey)) {
    return {
      ...base,
      status: "unknown",
      scanLine: "Follow-through rhythm not agreed with the office",
    };
  }

  if (token === "coordinator") {
    return {
      ...base,
      status: "caution",
      scanLine: scanLine("Follow-through runs through coordinator — align promises to their cadence", 72),
    };
  }

  if (champion === "high" || champion === "medium" || token === "in_person") {
    return {
      ...base,
      status: "positive",
      scanLine: scanLine("Follow-through reliable when tied to case days or champion", 72),
    };
  }

  if (token === "email" || token === "ehr_portal") {
    return {
      ...base,
      status: "caution",
      scanLine: scanLine("Follow-up is async — document commitments in writing", 72),
    };
  }

  const label = labelForIntelligenceToken(dbKey, token ?? "");
  return {
    ...base,
    status: "positive",
    scanLine: scanLine(
      label ? `Follow-up plan: ${label}` : "Follow-up approach captured on file",
      72,
    ),
  };
}

export function buildRelationshipOperationalHeadline(
  indicators: RelationshipMaturityIndicator[],
): string {
  const documented = indicators.filter((i) => i.status !== "unknown");
  if (documented.length === 0) {
    return OPERATIONAL_INTEL_RELATIONSHIP.environmentEmpty;
  }

  const restrictive = indicators.filter((i) => i.status === "restrictive");
  const caution = indicators.filter((i) => i.status === "caution");
  const positive = indicators.filter((i) => i.status === "positive");

  if (restrictive.length >= 1 && (caution.length >= 1 || positive.length >= 1)) {
    return scanLine(`${restrictive[0]!.scanLine} · ${(caution[0] ?? positive[0])!.scanLine}`, 120);
  }

  if (positive.length >= 2) {
    return scanLine(`${positive[0]!.scanLine} · ${positive[1]!.scanLine}`, 120);
  }

  if (restrictive.length >= 1) return restrictive[0]!.scanLine;
  if (caution.length >= 1) return caution[0]!.scanLine;
  if (positive.length >= 1) return positive[0]!.scanLine;

  return documented[0]!.scanLine;
}

function resolveTone(
  indicators: RelationshipMaturityIndicator[],
): ProviderRelationshipOperationalMaturity["tone"] {
  const restrictive = indicators.filter((i) => i.status === "restrictive").length;
  const unknown = indicators.filter((i) => i.status === "unknown").length;
  const positive = indicators.filter((i) => i.status === "positive").length;

  if (restrictive >= 2 || (restrictive >= 1 && unknown >= 3)) return "blocked";
  if (unknown >= 4) return "neutral";
  if (restrictive >= 1 || unknown >= 2) return "warn";
  if (positive >= 4) return "success";
  return "warn";
}

export function buildProviderRelationshipOperationalMaturity(
  contact: Record<string, unknown>,
): ProviderRelationshipOperationalMaturity {
  const indicators = [
    buildSurgeonEngagement(contact),
    buildStaffResponsiveness(contact),
    buildSchedulerAccessibility(contact),
    buildVendorFriendliness(contact),
    buildRepFriendliness(contact),
    buildFollowThrough(contact),
  ];

  const documentedCount = indicators.filter((i) => i.status !== "unknown").length;
  const openCount = indicators.length - documentedCount;

  return {
    title: RELATIONSHIP_OPERATIONAL_MATURITY_TITLE,
    kicker: RELATIONSHIP_OPERATIONAL_MATURITY_KICKER,
    headline: buildRelationshipOperationalHeadline(indicators),
    tone: resolveTone(indicators),
    indicators,
    documentedCount,
    openCount,
  };
}
