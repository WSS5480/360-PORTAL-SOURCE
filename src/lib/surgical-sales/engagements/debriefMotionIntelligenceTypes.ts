/**
 * Motion intelligence — prior debrief, intro call, contact/scheduling.
 * Influences conversation plan and advancement paths only (not scoring).
 */

import type { EvidenceAttribution } from "@/lib/surgical-sales/engagements/commercialEvidenceAttribution";

export type DebriefMotionIntelligenceKind =
  | "prior_provider_debrief"
  | "intro_call"
  | "contact_scheduling";

export type DebriefMotionCoachingUse =
  | "commitment"
  | "continuity"
  | "access"
  | "scheduling"
  | "stakeholder";

export type DebriefMotionIntelligenceItem = {
  kind: DebriefMotionIntelligenceKind;
  sourceLabel: string;
  date: string | null;
  excerpt: string;
  coachingUse: DebriefMotionCoachingUse;
  engagementId: string | null;
  fieldKey: string | null;
};

export type DebriefMotionIntelligenceBundle = {
  priorDebrief: DebriefMotionIntelligenceItem[];
  introCall: DebriefMotionIntelligenceItem[];
  contactScheduling: DebriefMotionIntelligenceItem[];
};

export type MotionIntelligenceReferenceView = {
  text: string;
  attributions: EvidenceAttribution[];
};
