import { resolveScopeForLogUpdateField } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  resolveIntelligenceSaveDestination,
  type IntelligenceSaveDestination,
} from "@/lib/surgical-sales/intelligenceSaveDestination";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import {
  intelligenceFieldConflict,
  isGenericIntelligenceValue,
  shouldRecommendObservationApprovalReplace,
} from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import { isLowQualityIntelligenceText } from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import {
  detectIntelligenceReversals,
  existingValueContradictsReversal,
  type DetectedIntelligenceReversal,
} from "@/lib/surgical-sales/intelligenceContradictionDetection";
import { contactUpdateCorroboratesExisting } from "@/lib/surgical-sales/contactEntityIdentity";
import {
  buildPreservedNamedEntity,
  extractPrimarySchedulingNamedPerson,
} from "@/lib/surgical-sales/namedEntityPreservation";
import {
  buildSchedulingReplacementProposedValue,
  detectSchedulingContactReplacement,
} from "@/lib/surgical-sales/schedulingContactOwnership";
import type {
  LogUpdateConflictResolution,
  LogUpdateFieldConflict,
  LogUpdateRoutedFieldUpdate,
} from "@/lib/surgical-sales/logUpdateFieldTypes";

export type {
  LogUpdateConflictResolution,
  LogUpdateFieldConflict,
  LogUpdateRoutedFieldUpdate,
} from "@/lib/surgical-sales/logUpdateFieldTypes";

const LABEL_BY_DB_KEY = new Map([
  ...PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
  ...ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
]);

type RouteRule = {
  id: string;
  label: string;
  dbKey: string;
  test: (text: string) => boolean;
  propose?: (text: string) => string;
  /** When set, used instead of dbKey-only inference (e.g. engagement-only signals). */
  scopeOverride?: IntelligenceScope;
};

function attachScope(
  update: Omit<LogUpdateRoutedFieldUpdate, "proposedScope" | "scopeReason" | "proposedDestination" | "destinationReason">,
  sourceText: string,
  scopeOverride?: IntelligenceScope,
): LogUpdateRoutedFieldUpdate {
  const resolved = scopeOverride
    ? {
        scope: scopeOverride,
        reason: `Routed as ${scopeOverride} intelligence for this touch.`,
      }
    : resolveScopeForLogUpdateField(update.dbKey, update.label, `${sourceText} ${update.proposedValue}`);
  const destination = resolveIntelligenceSaveDestination({
    scope: resolved.scope,
    dbKey: update.dbKey,
    text: `${sourceText} ${update.proposedValue}`,
  });
  return {
    ...update,
    proposedScope: resolved.scope,
    scopeReason: resolved.reason,
    proposedDestination: destination.destination,
    destinationReason: destination.reason,
  };
}

const ROUTE_RULES: RouteRule[] = [
  {
    id: "or_access_path",
    label: "OR access — barriers and openness",
    dbKey: "provider_observation_access_path",
    test: (t) =>
      /\bor\s+access\b/i.test(t) ||
      /\baccess\s+(gate|path|goes|through|via|requires?)\b/i.test(t) ||
      /\b(vendor\s+access|approval\s+path)\b/i.test(t),
  },
  {
    id: "vendor_credentialing",
    label: "Vendor credentialing on file",
    dbKey: "provider_credentialing_status",
    test: (t) =>
      /\b(vendor\s+credential|credentialing|vendor\s+clearance)\b/i.test(t) ||
      /\bthrough\s+vendor\b/i.test(t),
    propose: (t) => {
      if (/\b(cleared|approved|credentialed)\b/i.test(t)) return "Credentialed / cleared.";
      if (/\b(blocked|restricted|not\s+allowed|denied)\b/i.test(t)) return "Access restricted.";
      return snippet(t);
    },
  },
  {
    id: "credentialing_needed",
    label: "Credentialing still required",
    dbKey: "provider_observation_credentialing_needed",
    test: (t) =>
      /\b(credentialing|vendor\s+clearance)\b/i.test(t) &&
      !/\b(cleared|credentialed|is\s+complete)\b/i.test(t) &&
      !/\bonly\s+after\s+credentialing?\b/i.test(t),
  },
  {
    id: "scheduler_observation_coordination",
    label: "Scheduler — observation coordination",
    dbKey: "provider_observation_coordinator_contact",
    test: (t) => {
      if (detectSchedulingContactReplacement(t)) return true;
      return (
        (/\b(scheduler|coordinator)\b/i.test(t) ||
          (/\b(observation|case)\b/i.test(t) && extractPrimarySchedulingNamedPerson(t) !== null)) &&
        /\b(observation|credentialing|case access|scheduling)\b/i.test(t) &&
        !/\b(who\s+approves|approv(e|al|es)\s+observation)\b/i.test(t)
      );
    },
    propose: (t) => {
      // Preserve WHO the coordinator is — a generic role line makes a
      // replace-vs-keep contact conflict undecidable for the reviewer.
      const replacement = detectSchedulingContactReplacement(t);
      if (replacement) {
        const entity = buildPreservedNamedEntity(replacement.successorName, t);
        return buildSchedulingReplacementProposedValue({
          replacement,
          role: entity.possibleRole ?? "Scheduling Coordinator",
        });
      }
      const person = extractPrimarySchedulingNamedPerson(t);
      if (person) {
        const role = person.possibleRole ?? "Scheduling Coordinator";
        const evidence = snippet(currentSchedulingOwnerEvidenceSnippet(t, person.name), 200);
        return `${person.name} — ${role}. "${evidence}"`;
      }
      return "Scheduler involved in observation coordination.";
    },
  },
  {
    id: "observation_approval",
    label: "Who approves observations",
    dbKey: "provider_observation_coordinator_contact",
    test: (t) =>
      (/\b(scheduler|coordinator|or\s+manager|office\s+manager|nurse)\b/i.test(t) &&
        (/\b(who\s+approves|approv(e|al|es)\s+observation|observation\s+requests?)\b/i.test(t) ||
          /\b(named|contact\s+is|handles\s+scheduling)\b/i.test(t))) ||
      /\bobservation\s+requests?\s+(are\s+)?(approved|cleared)/i.test(t),
    propose: (t) => {
      const sched = t.match(/\b(the\s+)?(scheduler|coordinator|or\s+manager|office\s+manager)\b/i);
      if (sched) return `${sched[0].trim()} — observation approval path. ${snippet(t, 180)}`;
      return snippet(t);
    },
  },
  {
    id: "observation_allowance",
    label: "Whether observation is allowed",
    dbKey: "provider_observation_feasibility",
    test: (t) => /\b(allowed|restricted|blocked|not\s+allowed|credentialed|can\s+observe|cannot\s+observe)\b/i.test(t),
    propose: (t) => {
      if (
        /\b(allowed|permitted|can\s+observe|observation\s+is\s+allowed)\b/i.test(t) &&
        /\b(only\s+after|but\s+only|once\s+credentialing?|when\s+credentialing?|after\s+credentialing?)\b/i.test(
          t,
        )
      ) {
        return "Allowed after credentialing is complete.";
      }
      if (/\b(not\s+allowed|blocked|restricted|cannot)\b/i.test(t)) return "Restricted";
      if (/\b(allowed|approved|credentialed|can\s+observe)\b/i.test(t)) return "Allowed";
      return snippet(t);
    },
  },
  {
    id: "credentialing_gate",
    label: "Credentialing required before observation",
    dbKey: "provider_observation_credentialing_needed",
    test: (t) =>
      /\b(credentialing|vendor\s+clearance)\b/i.test(t) &&
      (/\bonly\s+after\s+credentialing?\b/i.test(t) ||
        /\b(before\s+observ|required\s+for|must\s+complete|pending\s+credential)/i.test(t) ||
        (/\bobserv/i.test(t) && !/\b(cleared|credentialed)\b/i.test(t))),
    propose: () => "Credentialing must be complete before observation.",
  },
  {
    id: "morning_case_access",
    label: "Morning case access window",
    dbKey: "provider_observation_access_path",
    test: (t) =>
      /\b(mornings?|morning)\b/i.test(t) &&
      /\b(easier|better|preferred|smoother|access|case access)\b/i.test(t),
    propose: () => "Morning observation access may be easier.",
    scopeOverride: "organization",
  },
  {
    id: "observation_best_days",
    label: "Best OR days / case types",
    dbKey: "provider_observation_best_days_case_types",
    test: (t) =>
      /\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b/i.test(t) ||
      /\b(best\s+days?|case\s+days?)\b/i.test(t),
    propose: proposeBestDaysCaseTypes,
  },
  {
    id: "workflow_discussion_openness",
    label: "Open to workflow discussion",
    dbKey: "provider_evaluation_openness",
    test: (t) =>
      /\b(open to|seems open|open for)\b/i.test(t) &&
      /\b(workflow|discussion|evaluat|conversation)\b/i.test(t),
    propose: () => "Open to workflow discussion.",
  },
  {
    id: "clinical_workflow",
    label: "Procedures / case mix",
    dbKey: "provider_procedure_focus",
    test: (t) =>
      !isLowValueProcedureCapabilityText(t) &&
      /\b(case\s+volume|procedures?|modality|hernia|colorectal|robotic|laparoscopic|lap\b|wound|ortho|bariatric|ventral)\b/i.test(
        t,
      ),
    propose: proposeProcedureFocus,
  },
  {
    id: "technique_modality",
    label: "Technique / modality",
    dbKey: "provider_technique_preferences",
    test: (t) =>
      !isLowValueProcedureCapabilityText(t) &&
      /\b(robotic|laparoscopic|lap\b|open\s+case|modality|technique)\b/i.test(t),
    propose: proposeTechniqueModality,
  },
  {
    id: "case_volume",
    label: "Case volume / mix",
    dbKey: "provider_case_volume_estimate",
    test: (t) => /\b(case\s+volume|\d+\s+cases?|\bcases?\s+per)\b/i.test(t),
  },
  {
    id: "commercial_influence",
    label: "Buying process / preference card",
    dbKey: "provider_preference_card_signals",
    test: (t) =>
      /\b(decision\s+maker|committee|supply\s+chain|preference\s+card|purchasing|value\s+analysis)\b/i.test(t),
  },
  {
    id: "decision_maker",
    label: "Decision-maker / committee",
    dbKey: "provider_decision_maker_status",
    test: (t) =>
      /\b(decision\s+maker|committee\s+first|committee\s+review)\b/i.test(t) ||
      (/\bsupply\s+chain\b/i.test(t) && /\b(approv|approve|must|has\s+to|before)\b/i.test(t)),
    propose: proposeDecisionMaker,
  },
  {
    id: "communication_preference",
    label: "Communication preference",
    dbKey: "provider_communication_style",
    test: (t) => /\b(text|email|e-mail|call|phone|pager|communicat|message)\b/i.test(t),
    propose: proposeCommunicationStyle,
  },
  {
    id: "relationship_responsiveness",
    label: "How responsive they are",
    dbKey: "provider_responsiveness",
    test: (t) =>
      /\b(follow[- ]?up|responds?|response|calls?\s+back|hard\s+to\s+reach|slow\s+to\s+respond|responsiveness|same\s+day)\b/i.test(
        t,
      ),
    propose: proposeResponsiveness,
  },
  {
    id: "follow_up_rhythm",
    label: "Follow-up rhythm",
    dbKey: "provider_follow_up_approach",
    test: (t) => /\b(follow[- ]?up|touchpoint|check[- ]?in\s+rhythm)\b/i.test(t),
  },
];

import { stillWorthConfirmingFromLogUpdate } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";

function snippet(text: string, max = 320): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function currentSchedulingOwnerEvidenceSnippet(text: string, personName: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const nameRe = new RegExp(`\\b${personName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const current = sentences.find(
    (sentence) =>
      nameRe.test(sentence) &&
      !/\b(?:previously|used\s+to|no\s+longer)\b/i.test(sentence),
  );
  return current ?? text.trim();
}

const WEEKDAY_PATTERNS: Array<[RegExp, string]> = [
  [/\bmondays?\b/i, "Monday"],
  [/\btuesdays?\b/i, "Tuesday"],
  [/\bwednesdays?\b/i, "Wednesday"],
  [/\bthursdays?\b/i, "Thursday"],
  [/\bfridays?\b/i, "Friday"],
  [/\bsaturdays?\b/i, "Saturday"],
  [/\bsundays?\b/i, "Sunday"],
];

function extractWeekdays(text: string): string[] {
  return WEEKDAY_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
}

function proposeBestDaysCaseTypes(text: string): string {
  const days = extractWeekdays(text);
  const dayPart = days.length > 0 ? days.join(" and ") : "";
  if (/\bhernia\b/i.test(text) && dayPart) {
    return `Hernia cases on ${dayPart}.`;
  }
  if (dayPart) return `Cases on ${dayPart}.`;
  return snippet(text);
}

function isLowValueProcedureCapabilityText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (
    /\b(?:does|do|performs?|has)\s+(?:a\s+)?fair\s+amount\s+of\b/i.test(trimmed) &&
    /\b(?:robotic|laparoscopic|colorectal|hernia|cases?|work)\b/i.test(trimmed)
  ) {
    return !/\b(?:most|primarily|focus|specializ|high[-\s]+volume|higher volume|case volume|procedure volume|increas|growing|doing more|seeing more)\b/i.test(
      trimmed,
    );
  }
  return false;
}

function proposeProcedureFocus(text: string): string {
  if (/\bcolorectal\b/i.test(text)) {
    const modality = /\brobotic\b/i.test(text) ? "Robotic colorectal" : "Colorectal";
    return `${modality} focus.`;
  }
  if (/\bhernia\b/i.test(text)) {
    const modality = /\blaparoscopic\b/i.test(text) ? "Laparoscopic hernia" : "Hernia";
    const days = extractWeekdays(text);
    if (days.length > 0) return `${modality} focus — cases on ${days.join(" and ")}.`;
    return `${modality} repair focus.`;
  }
  return snippet(text);
}

function proposeTechniqueModality(text: string): string {
  if (/\blaparoscopic\b/i.test(text)) return "Laparoscopic";
  if (/\brobotic\b/i.test(text)) return "Robotic";
  if (/\bopen\s+case/i.test(text)) return "Open";
  return snippet(text);
}

function proposeDecisionMaker(text: string): string {
  if (/\bsupply\s+chain\b/i.test(text)) {
    return "Supply chain approves new products before a trial.";
  }
  return snippet(text);
}

function proposeCommunicationStyle(text: string): string {
  if (/\btext\b/i.test(text)) return "Prefers text messaging.";
  if (/\bemail\b/i.test(text)) return "Prefers email.";
  return snippet(text);
}

function proposeResponsiveness(text: string): string {
  if (/\bsame\s+day\b/i.test(text)) return "Usually responds same day.";
  return snippet(text);
}

function fieldIsPopulated(value: string): boolean {
  const t = value.trim();
  return t.length > 0 && t.toLowerCase() !== "unknown";
}

function normalizeCompare(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function valuesConflict(existing: string, proposed: string): boolean {
  const a = normalizeCompare(existing);
  const b = normalizeCompare(proposed);
  if (!fieldIsPopulated(existing)) return false;
  if (!b) return false;
  if (a === b) return false;
  if (a.includes(b) || b.includes(a)) return false;
  return true;
}

export { shouldRecommendObservationApprovalReplace };

function defaultPropose(text: string): string {
  return snippet(text);
}

function buildReversalFieldUpdate(
  reversal: DetectedIntelligenceReversal,
  sourceText: string,
  existingFields: Record<string, string>,
): LogUpdateRoutedFieldUpdate {
  const existingValue = String(existingFields[reversal.dbKey] ?? "").trim();
  const conflict: LogUpdateFieldConflict | null = existingValueContradictsReversal(
    reversal.domain,
    existingValue,
  )
    ? {
        dbKey: reversal.dbKey,
        existingValue,
        newValue: reversal.negatedValue,
        resolution: null,
      }
    : null;

  return attachScope(
    {
      id: `reversal-${reversal.domain}`,
      label: reversal.label,
      dbKey: reversal.dbKey,
      proposedValue: reversal.negatedValue,
      accepted: true,
      conflict,
    },
    sourceText,
  );
}

/**
 * Contradiction pass — when reversal language negates an observation-access rule,
 * drop the positive-direction extractions for that domain and surface ONE
 * negated update (with a conflict item when the stored record contradicts it).
 */
export function applyIntelligenceReversalsToFieldUpdates(
  sourceText: string,
  updates: LogUpdateRoutedFieldUpdate[],
  existingFields: Record<string, string>,
): LogUpdateRoutedFieldUpdate[] {
  const reversals = detectIntelligenceReversals(sourceText);
  if (reversals.length === 0) return updates;

  const suppressed = new Set(
    reversals.flatMap((r) => [...r.suppressedDbKeys, r.dbKey]),
  );
  const kept = updates.filter(
    (u) => !suppressed.has(u.dbKey) || u.id.startsWith("reversal-"),
  );

  for (const reversal of reversals) {
    if (kept.some((u) => u.dbKey === reversal.dbKey)) continue;
    kept.unshift(buildReversalFieldUpdate(reversal, sourceText, existingFields));
  }

  return kept;
}

export function routeLogUpdateToProviderFields(
  sourceText: string,
  existingFields: Record<string, string>,
): LogUpdateRoutedFieldUpdate[] {
  const text = sourceText.trim();
  if (!text) return [];

  const reversals = detectIntelligenceReversals(text);
  const byDbKey = new Map<string, LogUpdateRoutedFieldUpdate>();

  for (const rule of ROUTE_RULES) {
    if (!rule.test(text)) continue;
    if (byDbKey.has(rule.dbKey)) continue;

    const proposedValue = (rule.propose ?? defaultPropose)(text);
    const existingValue = String(existingFields[rule.dbKey] ?? "").trim();
    // Same person re-confirmed in the same contact slot ("Karen still handles
    // observation scheduling" over a stored Karen) is corroborating evidence —
    // the note lands in history, but no field change and no merge card.
    if (
      contactUpdateCorroboratesExisting({ dbKey: rule.dbKey, existingValue, proposedValue })
    ) {
      continue;
    }
    // Fallback conflicts only surface when both values are meaningful —
    // generic existing vs specific proposed auto-replaces, generic proposed
    // never challenges a specific value.
    const fallbackConflict = (): LogUpdateFieldConflict | null => {
      if (!valuesConflict(existingValue, proposedValue)) return null;
      if (isGenericIntelligenceValue(proposedValue)) return null;
      return {
        dbKey: rule.dbKey,
        existingValue,
        newValue: proposedValue,
        resolution: isGenericIntelligenceValue(existingValue)
          ? ("replace" as LogUpdateConflictResolution)
          : (null as LogUpdateConflictResolution),
      };
    };
    const conflict =
      intelligenceFieldConflict({
        dbKey: rule.dbKey,
        existingValue,
        proposedValue,
      }) ?? fallbackConflict();

    byDbKey.set(
      rule.dbKey,
      attachScope(
        {
          id: rule.id,
          label: rule.label,
          dbKey: rule.dbKey,
          proposedValue,
          accepted: true,
          conflict,
        },
        text,
        rule.scopeOverride,
      ),
    );
  }

  const updates = [...byDbKey.values()];

  const conditionalObservation =
    /\b(allowed|permitted|can\s+observe|observation\s+is\s+allowed)\b/i.test(text) &&
    /\b(only\s+after|but\s+only|after\s+credentialing?)\b/i.test(text);

  const positiveAccess =
    !conditionalObservation &&
    reversals.length === 0 &&
    updates.some((u) => u.dbKey === "provider_observation_access_path") &&
    (updates.some((u) => u.dbKey === "provider_observation_coordinator_contact") ||
      updates.some((u) => u.dbKey === "provider_credentialing_status"));

  if (positiveAccess && !byDbKey.has("provider_observation_feasibility")) {
    updates.push(
      attachScope(
        {
          id: "deployment_risk_reduced",
          label: "Field readiness improved",
          dbKey: "provider_observation_feasibility",
          proposedValue: "Allowed — access and approval path are clearer.",
          accepted: true,
          conflict: valuesConflict(
            String(existingFields.provider_observation_feasibility ?? "").trim(),
            "Allowed — access and approval path are clearer.",
          )
            ? {
                dbKey: "provider_observation_feasibility",
                existingValue: String(existingFields.provider_observation_feasibility ?? "").trim(),
                newValue: "Allowed — access path and approval authority clarified.",
                resolution: null,
              }
            : null,
        },
        text,
      ),
    );
  }

  if (updates.length === 0 && reversals.length === 0) {
    const fallbackSnippet = snippet(text);
    if (isLowQualityIntelligenceText(fallbackSnippet)) {
      return updates;
    }
    updates.push(
      attachScope(
        {
          id: "field_learning",
          label: "Facility context — general update",
          dbKey: "provider_or_team_dynamics",
          proposedValue: fallbackSnippet,
          accepted: true,
          conflict: valuesConflict(
            String(existingFields.provider_or_team_dynamics ?? "").trim(),
            snippet(text),
          )
            ? {
                dbKey: "provider_or_team_dynamics",
                existingValue: String(existingFields.provider_or_team_dynamics ?? "").trim(),
                newValue: snippet(text),
                resolution: null,
              }
            : null,
        },
        text,
      ),
    );
  }

  return applyIntelligenceReversalsToFieldUpdates(text, updates, existingFields);
}

/** Field updates that persist to contact columns (organization + provider scopes). */
export function logUpdatePersistentFieldUpdates(
  updates: LogUpdateRoutedFieldUpdate[],
): LogUpdateRoutedFieldUpdate[] {
  return updates.filter((u) => u.proposedScope !== "case");
}

export function stillMissingFromLogUpdate(
  text: string,
  existingFields?: Record<string, string>,
  fieldUpdates: LogUpdateRoutedFieldUpdate[] = [],
): string[] {
  return stillWorthConfirmingFromLogUpdate(text, existingFields, fieldUpdates);
}

export function fieldLabelForDbKey(dbKey: string): string {
  return LABEL_BY_DB_KEY.get(dbKey) ?? dbKey.replace(/^provider_/, "").replace(/_/g, " ");
}

export function logUpdateHasUnresolvedConflicts(
  updates: LogUpdateRoutedFieldUpdate[],
): boolean {
  return updates.some((u) => u.accepted && u.conflict && !u.conflict.resolution);
}

export function logUpdateAcceptedFieldPatches(
  updates: LogUpdateRoutedFieldUpdate[],
): Array<{ dbKey: string; value: string; mergeStrategy: "replace" | "append" }> {
  return updates
    .filter((u) => u.accepted)
    .map((u) => {
      const resolution = u.conflict?.resolution;
      const mergeStrategy: "replace" | "append" =
        resolution === "replace" ? "replace" : "append";
      const value =
        resolution === "replace"
          ? u.conflict!.newValue
          : u.proposedValue;
      return { dbKey: u.dbKey, value, mergeStrategy };
    });
}
