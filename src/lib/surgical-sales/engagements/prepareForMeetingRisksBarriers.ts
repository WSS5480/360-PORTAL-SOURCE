import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { buildEngagementIntelligenceReadiness } from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";

export type PrepareRiskBarrier = {
  key: string;
  label: string;
};

export type PrepareRisksBarriers = {
  risks: PrepareRiskBarrier[];
};

type RiskDef = { key: string; label: string };

const RISKS: Record<string, RiskDef> = {
  limited_or_access: {
    key: "limited_or_access",
    label: "Limited OR access — confirm coordinator and observation window before the visit",
  },
  competitor_loyalty: {
    key: "competitor_loyalty",
    label: "Competitor loyalty — lead with differentiation vs current vendor on the card",
  },
  pricing_concern: {
    key: "pricing_concern",
    label: "Pricing concern — anchor value and committee/payer path, not list price",
  },
  workflow_disruption: {
    key: "workflow_disruption",
    label: "Workflow disruption concern — quantify OR time and staff steps vs status quo",
  },
  skeptical_switching: {
    key: "skeptical_switching",
    label: "Skeptical of switching — validate evaluation criteria before pushing trial",
  },
  follow_up_overdue: {
    key: "follow_up_overdue",
    label: "Follow-up overdue — reopen last commitment before adding new asks",
  },
  evaluation_stalled: {
    key: "evaluation_stalled",
    label: "Evaluation stalled — name the blocker and next case date on this call",
  },
  do_not_contact: {
    key: "do_not_contact",
    label: "Do-not-contact flag — confirm compliant outreach before proceeding",
  },
  weak_relationship: {
    key: "weak_relationship",
    label: "Weak relationship — keep the ask small and earn trust before evaluation",
  },
};

const ACCESS_PATTERNS =
  /\b(access|coordinator|blocks?|observation slot|walk-?in|between cases|gates?|rarely answers|vendor days?)\b/i;
const COMPETITOR_PATTERNS =
  /\b(medtronic|ethicon|stryker|depuy|organogenesis|mimedx|symbotic|competitive|dominate|on contract|preference card|current vendor|standard on)\b/i;
const PRICING_PATTERNS =
  /\b(pricing|price|cost|payer|formulary|purchasing|value analysis|committee packet)\b/i;
const WORKFLOW_PATTERNS =
  /\b(or time|workflow|tray|dock|disruption|learning curve|training burden|skin-to-skin|turnover|footprint)\b/i;
const SKEPTICAL_PATTERNS =
  /\b(cautious|reluctant|skeptic|will trial if|switching|loyal|buy-?in|before vendor|not sole-sign)\b/i;
const STALL_PATTERNS =
  /\b(stalled|frozen|vendor fair|committee due|no cases?|blocked|on hold|waiting on)\b/i;

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function corpus(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function matches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
}

function lastTouchDaysAgo(lastPrior: {
  engagement_date?: string | null;
  scheduled_at?: string | null;
} | null | undefined): number | null {
  if (!lastPrior) return null;
  return daysSince(lastPrior.engagement_date) ?? daysSince(lastPrior.scheduled_at);
}

function pushRisk(target: PrepareRiskBarrier[], def: RiskDef, max: number) {
  if (target.length >= max) return;
  if (target.some((r) => r.key === def.key)) return;
  target.push({ key: def.key, label: def.label });
}

function pushCustomRisk(target: PrepareRiskBarrier[], label: string, max: number) {
  const t = label.trim();
  if (!t || target.length >= max) return;
  const key = `custom:${t.toLowerCase()}`;
  if (target.some((r) => r.label.toLowerCase() === t.toLowerCase())) return;
  target.push({ key, label: t.length > 88 ? `${t.slice(0, 87)}…` : t });
}

function detectFromText(text: string, out: PrepareRiskBarrier[], max: number) {
  if (!text) return;
  const hasAccess = matches(text, ACCESS_PATTERNS);
  if (hasAccess) pushRisk(out, RISKS.limited_or_access, max);
  if (matches(text, COMPETITOR_PATTERNS)) pushRisk(out, RISKS.competitor_loyalty, max);
  if (matches(text, PRICING_PATTERNS)) pushRisk(out, RISKS.pricing_concern, max);
  if (matches(text, SKEPTICAL_PATTERNS)) pushRisk(out, RISKS.skeptical_switching, max);
  if (matches(text, STALL_PATTERNS)) pushRisk(out, RISKS.evaluation_stalled, max);
  if (
    matches(text, WORKFLOW_PATTERNS) &&
    (matches(text, SKEPTICAL_PATTERNS) ||
      matches(text, STALL_PATTERNS) ||
      /disruption|learning curve|training burden|reluctant|neutral on/i.test(text))
  ) {
    pushRisk(out, RISKS.workflow_disruption, max);
  }
}

function stageRisks(stage: SalesStage | null, lastTouchDays: number | null, out: PrepareRiskBarrier[], max: number) {
  if (!stage) return;
  if (stage === "evaluation_active" || stage === "evaluation_planned") {
    if (lastTouchDays != null && lastTouchDays >= 21) {
      pushRisk(out, RISKS.evaluation_stalled, max);
    }
  }
  if (stage === "clinical_validation" && lastTouchDays != null && lastTouchDays >= 28) {
    pushRisk(out, RISKS.follow_up_overdue, max);
  }
  if (stage === "discovery" && lastTouchDays != null && lastTouchDays >= 14) {
    pushRisk(out, RISKS.follow_up_overdue, max);
  }
}

function engagementTypeRisks(engagementType: string, out: PrepareRiskBarrier[], max: number) {
  const type = normalizeEngagementType(engagementType);
  if (type === "observation_request") {
    pushRisk(out, RISKS.limited_or_access, max);
  }
}

function opennessRisk(openness: string | null, out: PrepareRiskBarrier[], max: number) {
  if (!openness) return;
  const o = openness.toLowerCase();
  if (/cautious|low|reluctant|skeptic|will trial if|only if|gates?/i.test(o)) {
    pushRisk(out, RISKS.skeptical_switching, max);
  }
  if (/neutral|or time neutral/i.test(o) && /skeptic|reluctant|disruption|switch/i.test(o)) {
    pushRisk(out, RISKS.skeptical_switching, max);
  }
}

export function buildPrepareRisksBarriers(input: {
  provider: Record<string, unknown>;
  snapshot: ProviderIntelligenceSnapshot;
  knownIntelligence: PrepareKnownIntelligence;
  opportunity: { stage?: string | null } | null;
  engagement: Record<string, unknown>;
  lastPriorEngagement?: {
    engagement_date?: string | null;
    scheduled_at?: string | null;
  } | null;
  engagementType: string;
}): PrepareRisksBarriers {
  const max = 6;
  const out: PrepareRiskBarrier[] = [];
  const { provider, snapshot: snap } = input;

  if (provider.do_not_contact === true) {
    pushRisk(out, RISKS.do_not_contact, max);
  }

  const relationship = trimOrNull(provider.relationship_strength);
  if (relationship === "weak" || relationship === "unknown") {
    pushRisk(out, RISKS.weak_relationship, max);
  }

  const stage = normalizeSalesStage(input.opportunity?.stage);
  const lastTouchDays = lastTouchDaysAgo(input.lastPriorEngagement);
  stageRisks(stage, lastTouchDays, out, max);
  engagementTypeRisks(input.engagementType, out, max);

  opennessRisk(snap.evaluation_openness, out, max);

  const textBlob = corpus([
    trimOrNull(provider.access_notes),
    trimOrNull(provider.personality_notes),
    trimOrNull(provider.provider_rep_strategy_notes),
    snap.competitive_products,
    snap.current_vendors,
    snap.evaluation_openness,
    snap.or_team_dynamics,
    snap.preference_card_signals,
    snap.technique_preferences,
    snap.relationship_summary,
    snap.observation_readiness,
    trimOrNull(input.engagement.adoption_signals_to_watch),
    trimOrNull(input.engagement.pre_observation_additional_notes),
  ]);

  detectFromText(textBlob, out, max);

  const engagementType = normalizeEngagementType(input.engagementType);
  if (engagementType === "follow_up" || engagementType === "office_visit_360") {
    const readiness = buildEngagementIntelligenceReadiness({
      provider,
      engagementType: input.engagementType,
      providerId: provider.id ? String(provider.id) : null,
      maxBlockers: max,
    });
    for (const blocker of readiness.preVisitBlockers) {
      pushCustomRisk(out, blocker.label, max);
    }
  }

  for (const bullet of input.knownIntelligence.bullets) {
    if (bullet.key === "competitor_usage") pushRisk(out, RISKS.competitor_loyalty, max);
    if (bullet.key === "or_dynamics") detectFromText(bullet.value, out, max);
  }

  if (lastTouchDays != null && lastTouchDays >= 21) {
    pushRisk(out, RISKS.follow_up_overdue, max);
  }

  const adoptionSignals = trimOrNull(input.engagement.adoption_signals_to_watch);
  if (adoptionSignals) {
    const bullets = adoptionSignals
      .split(/\n|;|•/)
      .map((s) => s.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
    for (const b of bullets.slice(0, 2)) {
      const lower = b.toLowerCase();
      if (matches(lower, ACCESS_PATTERNS)) pushRisk(out, RISKS.limited_or_access, max);
      else if (matches(lower, COMPETITOR_PATTERNS)) pushRisk(out, RISKS.competitor_loyalty, max);
      else if (matches(lower, PRICING_PATTERNS)) pushRisk(out, RISKS.pricing_concern, max);
      else if (matches(lower, WORKFLOW_PATTERNS)) pushRisk(out, RISKS.workflow_disruption, max);
      else if (matches(lower, SKEPTICAL_PATTERNS)) pushRisk(out, RISKS.skeptical_switching, max);
      else if (matches(lower, STALL_PATTERNS)) pushRisk(out, RISKS.evaluation_stalled, max);
      else pushCustomRisk(out, `Watch: ${b}`, max);
    }
  }

  const accessNotes = trimOrNull(provider.access_notes);
  if (accessNotes && matches(accessNotes, ACCESS_PATTERNS) && !out.some((r) => r.key === "limited_or_access")) {
    pushRisk(out, RISKS.limited_or_access, max);
  }

  return { risks: out.slice(0, max) };
}
