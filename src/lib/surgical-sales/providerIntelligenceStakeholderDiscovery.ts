/**
 * Stakeholder-aware operational intelligence discovery — role-appropriate prompts and paths.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceFieldWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import {
  isOrganizationIntelligenceDbKey,
  ORGANIZATION_INTELLIGENCE_DB_KEYS,
} from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import type { ProgressiveDiscoveryPrompt } from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import { isCaseIntelligenceDbKey } from "@/lib/surgical-sales/caseIntelligenceFields";
import {
  resolveScopeForDbKey,
  type IntelligenceScopeResolution,
} from "@/lib/surgical-sales/intelligenceScopeInference";

/** Rapid Discovery audience — aligned to intelligence scope lanes. */
export type IntelligenceDiscoveryStakeholder =
  | "unspecified"
  | "provider_surgeon"
  | "facility_or_access"
  | "case_scoped"
  | "scheduler_office"
  | "administrative_procurement";

export const INTELLIGENCE_DISCOVERY_STAKEHOLDER_LABELS: Record<IntelligenceDiscoveryStakeholder, string> = {
  unspecified: "All",
  provider_surgeon: "Provider",
  facility_or_access: "Facility",
  case_scoped: "Case",
  scheduler_office: "Office / Scheduler",
  administrative_procurement: "Admin / Purchasing",
};

/** Single-line context chip for Rapid Discovery active question. */
export const INTELLIGENCE_DISCOVERY_CONTEXT_CHIP: Record<IntelligenceDiscoveryStakeholder, string> = {
  unspecified: "All",
  provider_surgeon: "Provider",
  facility_or_access: "Facility",
  case_scoped: "Case",
  scheduler_office: "Office / Scheduler",
  administrative_procurement: "Admin / Purchasing",
};

export const INTELLIGENCE_DISCOVERY_PATH_HINTS: Record<IntelligenceDiscoveryStakeholder, string> = {
  unspecified:
    "Prioritized unresolved questions across every scope — default when one conversation covers mixed roles.",
  provider_surgeon:
    "Surgeon-specific workflow, clinical fit, evaluation appetite, and relationship intelligence.",
  facility_or_access:
    "Facility-wide credentialing, OR access rules, and site scheduling pathways — organization intelligence by default.",
  case_scoped:
    "Case-day logistics — implants, trays, room timing, and support coverage for a scheduled case.",
  scheduler_office:
    "Observation scheduling and coordination — may map to facility or provider scope depending on the question.",
  administrative_procurement:
    "Purchasing, committee path, preference cards, and economic barriers — organization or provider by field.",
};

const FIELD_DEF_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

/** Primary stakeholder who should answer this field in the field. */
export const INTELLIGENCE_FIELD_PRIMARY_STAKEHOLDER: Record<string, IntelligenceDiscoveryStakeholder> = {
  provider_procedure_focus: "provider_surgeon",
  provider_technique_preferences: "provider_surgeon",
  provider_technique_detail: "provider_surgeon",
  provider_workflow_pain_points: "provider_surgeon",
  provider_case_volume_estimate: "provider_surgeon",
  provider_or_team_dynamics: "facility_or_access",
  provider_support_expectations: "facility_or_access",
  provider_communication_style: "provider_surgeon",
  provider_responsiveness: "provider_surgeon",
  provider_follow_up_approach: "provider_surgeon",
  influence_level: "provider_surgeon",
  provider_champion_potential: "provider_surgeon",
  provider_evaluation_openness: "provider_surgeon",
  provider_competitive_products: "provider_surgeon",
  provider_dissatisfaction_areas: "provider_surgeon",
  provider_observation_feasibility: "provider_surgeon",
  provider_ideal_observation_cases: "provider_surgeon",
  provider_first_observation_questions: "provider_surgeon",
  provider_decision_maker_status: "administrative_procurement",
  provider_preference_card_signals: "administrative_procurement",
  provider_current_vendors: "administrative_procurement",
  provider_observation_best_days_case_types: "facility_or_access",
  provider_credentialing_status: "facility_or_access",
  provider_observation_access_path: "facility_or_access",
  provider_observation_credentialing_needed: "facility_or_access",
  provider_observation_coordinator_contact: "scheduler_office",
  provider_observation_cadence_preference: "scheduler_office",
};

const SCHEDULER_OFFICE_ENGAGEMENT_TYPES = new Set([
  "observation_request",
  "office_visit",
  "credentialing",
]);

const SURGEON_FORWARD_ENGAGEMENT_TYPES = new Set([
  "intro_call",
  "case_day",
  "or_visit",
  "follow_up",
  "evaluation",
]);

const SCHEDULER_ROLE_TYPES = new Set([
  "scheduler",
  "office_manager",
  "assistant",
  "gatekeeper",
]);

const ADMIN_ROLE_TYPES = new Set(["billing", "purchasing", "admin"]);

const SURGEON_ROLE_TYPES = new Set(["surgeon", "physician_assistant", "nurse"]);

const STAKEHOLDER_PROGRESSIVE_PROMPTS: Record<
  IntelligenceDiscoveryStakeholder,
  Record<string, ProgressiveDiscoveryPrompt>
> = {
  provider_surgeon: {
    provider_workflow_pain_points: {
      prompt: "What creates the most workflow friction in the OR today?",
      progressBeat: "Workflow friction",
    },
    provider_evaluation_openness: {
      prompt: "What matters most to you when evaluating new products?",
      progressBeat: "Evaluation criteria",
    },
    provider_support_expectations: {
      prompt: "How involved do you want reps during procedures?",
      progressBeat: "Rep involvement",
    },
    provider_or_team_dynamics: {
      prompt: "What makes OR workflow smoother or harder on your case days?",
      progressBeat: "OR workflow rhythm",
    },
    provider_procedure_focus: {
      prompt: "Which procedures drive most of your volume right now?",
      progressBeat: "Procedure mix",
    },
    provider_technique_preferences: {
      prompt: "What is your primary surgical approach on high-volume cases?",
      progressBeat: "Modality",
    },
    provider_observation_feasibility: {
      prompt: "Are you open to a vendor observing a case when it helps workflow learning?",
      progressBeat: "Observation allowance",
    },
    provider_ideal_observation_cases: {
      prompt: "Which case types would be most useful for a first observation?",
      progressBeat: "Target cases",
    },
    provider_first_observation_questions: {
      prompt: "What do you want validated on the first case day?",
      progressBeat: "First case focus",
    },
    provider_follow_up_approach: {
      prompt: "What is the best way to follow up — and appetite for a next step?",
      progressBeat: "Next-step appetite",
    },
    provider_communication_style: {
      prompt: "How do you prefer reps to engage between case days?",
      progressBeat: "Engagement style",
    },
    provider_responsiveness: {
      prompt: "How responsive is the team when you need something between cases?",
      progressBeat: "Responsiveness",
    },
    influence_level: {
      prompt: "Who shapes technique and workflow choices on your cases?",
      progressBeat: "Clinical influence",
    },
  },
  facility_or_access: {
    provider_observation_access_path: {
      prompt: "How does vendor observation access work at this facility?",
      progressBeat: "OR access rules",
    },
    provider_observation_credentialing_needed: {
      prompt: "Is vendor credentialing required before observation at this site?",
      progressBeat: "Credentialing gate",
    },
    provider_credentialing_status: {
      prompt: "What is the facility vendor credentialing process?",
      progressBeat: "Credentialing path",
    },
    provider_observation_best_days_case_types: {
      prompt: "What are the best facility windows for observation scheduling?",
      progressBeat: "Facility scheduling",
    },
    provider_or_team_dynamics: {
      prompt: "What is the OR workflow culture at this facility?",
      progressBeat: "Facility workflow",
    },
    provider_support_expectations: {
      prompt: "What in-room support norms apply site-wide?",
      progressBeat: "Support norms",
    },
  },
  scheduler_office: {
    provider_observation_coordinator_contact: {
      prompt: "Who coordinates observation scheduling?",
      progressBeat: "Scheduling owner",
    },
    provider_observation_cadence_preference: {
      prompt: "How often can vendor observation realistically be scheduled?",
      progressBeat: "Observation cadence",
    },
    provider_observation_feasibility: {
      prompt: "Who approves vendor observation access before a date is held?",
      progressBeat: "Observation approval",
    },
  },
  administrative_procurement: {
    provider_preference_card_signals: {
      prompt: "What committee or purchasing steps gate preference-card changes?",
      progressBeat: "Card / committee path",
    },
    provider_decision_maker_status: {
      prompt: "Who approves evaluations and product adoption economically?",
      progressBeat: "Economic approver",
    },
    provider_evaluation_openness: {
      prompt: "What would purchasing need to see before a formal evaluation moves forward?",
      progressBeat: "Evaluation gates",
    },
    provider_current_vendors: {
      prompt: "Which vendors are under contract or embedded in purchasing today?",
      progressBeat: "Vendor landscape",
    },
    provider_champion_potential: {
      prompt: "Who internally would sponsor a trial through value analysis or committee?",
      progressBeat: "Internal sponsor",
    },
    influence_level: {
      prompt: "Who controls contracting and product approvals for this service line?",
      progressBeat: "Purchasing influence",
    },
  },
  case_scoped: {},
  unspecified: {},
};

const STAKEHOLDER_COACHING_PROMPTS: Record<IntelligenceDiscoveryStakeholder, Record<string, string>> = {
  provider_surgeon: {
    provider_workflow_pain_points: "Ask what creates the most workflow friction today",
    provider_evaluation_openness: "Ask what matters most when evaluating new products",
    provider_support_expectations: "Ask how involved they want reps during procedures",
    provider_or_team_dynamics: "Ask what makes OR workflow smoother or harder",
  },
  facility_or_access: {
    provider_observation_access_path: "Confirm facility-wide observation access rules",
    provider_observation_credentialing_needed: "Confirm whether vendor credentialing is required at this site",
    provider_credentialing_status: "Map the facility credentialing path",
  },
  scheduler_office: {
    provider_observation_coordinator_contact: "Ask who coordinates vendor observation scheduling",
    provider_observation_feasibility: "Ask who approves vendor observation access",
  },
  administrative_procurement: {
    provider_preference_card_signals: "Ask what committee or purchasing steps gate adoption",
    provider_decision_maker_status: "Ask who approves evaluations and contracting",
    provider_evaluation_openness: "Ask what purchasing needs before a trial",
    provider_current_vendors: "Ask which vendors are active under contract",
  },
  case_scoped: {},
  unspecified: {},
};

const STAKEHOLDER_INTERACTION_TIMING: Record<IntelligenceDiscoveryStakeholder, string> = {
  unspecified: "Next interaction",
  provider_surgeon: "Next provider touch",
  facility_or_access: "Facility / access touch",
  case_scoped: "Case day / logistics touch",
  scheduler_office: "Scheduler / office touch",
  administrative_procurement: "Purchasing / admin touch",
};

/**
 * Rapid Discovery routing — explicit allowlists so each audience lane stays focused.
 * Logistics (credentialing, access path, coordinator) never surface on the surgeon lane.
 */
/** Facility-wide organization intelligence (credentialing, OR access, site pathways). */
export const FACILITY_DISCOVERY_DB_KEYS = new Set(
  ORGANIZATION_INTELLIGENCE_DB_KEYS.filter(
    (dbKey) =>
      dbKey !== "provider_preference_card_signals" &&
      dbKey !== "provider_current_vendors" &&
      dbKey !== "provider_observation_coordinator_contact",
  ),
);

export const SURGEON_DISCOVERY_DB_KEYS = new Set([
  "provider_procedure_focus",
  "provider_technique_preferences",
  "provider_technique_detail",
  "provider_workflow_pain_points",
  "provider_case_volume_estimate",
  "provider_communication_style",
  "provider_responsiveness",
  "provider_follow_up_approach",
  "influence_level",
  "provider_champion_potential",
  "provider_evaluation_openness",
  "provider_observation_feasibility",
  "provider_ideal_observation_cases",
  "provider_first_observation_questions",
]);

/** Scheduling coordination — org or provider scope depending on field context. */
export const SCHEDULER_DISCOVERY_DB_KEYS = new Set([
  "provider_observation_coordinator_contact",
  "provider_observation_cadence_preference",
  "provider_observation_feasibility",
  "provider_observation_best_days_case_types",
  "provider_observation_access_path",
  "provider_observation_credentialing_needed",
]);

export const ADMIN_DISCOVERY_DB_KEYS = new Set([
  "provider_decision_maker_status",
  "provider_preference_card_signals",
  "provider_current_vendors",
  "provider_evaluation_openness",
  "provider_champion_potential",
  "influence_level",
]);

/** Short category chip when All audiences is selected. */
export const DISCOVERY_AUDIENCE_CATEGORY_CHIP: Record<
  Exclude<IntelligenceDiscoveryStakeholder, "unspecified">,
  string
> = {
  provider_surgeon: "Provider",
  facility_or_access: "Facility",
  case_scoped: "Case",
  scheduler_office: "Office",
  administrative_procurement: "Admin",
};

const STAKEHOLDER_LANE_ORDER: IntelligenceDiscoveryStakeholder[] = [
  "provider_surgeon",
  "facility_or_access",
  "case_scoped",
  "scheduler_office",
  "administrative_procurement",
];

const SURGEON_FOCUS_PRIORITY_BOOST: Partial<Record<string, number>> = {
  provider_workflow_pain_points: 56,
  provider_procedure_focus: 52,
  provider_technique_preferences: 48,
  provider_evaluation_openness: 44,
  provider_support_expectations: 44,
  provider_or_team_dynamics: 40,
  provider_communication_style: 32,
  provider_follow_up_approach: 32,
  influence_level: 28,
  provider_observation_feasibility: 24,
  provider_ideal_observation_cases: 20,
};

const FACILITY_FOCUS_PRIORITY_BOOST: Partial<Record<string, number>> = {
  provider_observation_credentialing_needed: 58,
  provider_observation_access_path: 54,
  provider_credentialing_status: 50,
  provider_observation_best_days_case_types: 44,
  provider_or_team_dynamics: 36,
  provider_support_expectations: 32,
};

const SCHEDULER_FOCUS_PRIORITY_BOOST: Partial<Record<string, number>> = {
  provider_observation_coordinator_contact: 52,
  provider_observation_cadence_preference: 44,
  provider_observation_feasibility: 40,
  provider_observation_best_days_case_types: 32,
  provider_observation_access_path: 28,
  provider_observation_credentialing_needed: 24,
};

const ADMIN_FOCUS_PRIORITY_BOOST: Partial<Record<string, number>> = {
  provider_decision_maker_status: 56,
  provider_preference_card_signals: 52,
  provider_current_vendors: 48,
  provider_evaluation_openness: 44,
  provider_champion_potential: 40,
  influence_level: 32,
};

/** Fields that unlock shared workflows but use different prompts per touch. */
const INTELLIGENCE_FIELD_SHARED_STAKEHOLDERS: Record<string, IntelligenceDiscoveryStakeholder[]> = {
  provider_observation_feasibility: ["provider_surgeon", "scheduler_office"],
  provider_evaluation_openness: ["provider_surgeon", "administrative_procurement"],
  influence_level: ["provider_surgeon", "administrative_procurement"],
  provider_champion_potential: ["provider_surgeon", "administrative_procurement"],
};

export function primaryStakeholderForIntelligenceField(dbKey: string): IntelligenceDiscoveryStakeholder {
  return INTELLIGENCE_FIELD_PRIMARY_STAKEHOLDER[dbKey] ?? "unspecified";
}

export function intelligenceFieldStakeholderAudiences(
  dbKey: string,
): IntelligenceDiscoveryStakeholder[] {
  const shared = INTELLIGENCE_FIELD_SHARED_STAKEHOLDERS[dbKey];
  if (shared) return shared;
  const primary = primaryStakeholderForIntelligenceField(dbKey);
  return primary === "unspecified" ? [] : [primary];
}

export function discoveryLaneForField(
  dbKey: string,
): Exclude<IntelligenceDiscoveryStakeholder, "unspecified"> | null {
  if (isCaseIntelligenceDbKey(dbKey)) return "case_scoped";
  if (FACILITY_DISCOVERY_DB_KEYS.has(dbKey)) return "facility_or_access";
  if (SURGEON_DISCOVERY_DB_KEYS.has(dbKey)) return "provider_surgeon";
  if (SCHEDULER_DISCOVERY_DB_KEYS.has(dbKey) && !FACILITY_DISCOVERY_DB_KEYS.has(dbKey)) {
    return "scheduler_office";
  }
  if (ADMIN_DISCOVERY_DB_KEYS.has(dbKey)) return "administrative_procurement";
  if (isOrganizationIntelligenceDbKey(dbKey)) return "facility_or_access";
  return null;
}

/** Category chip for All-mode questions (scope-aligned lanes). */
export function discoveryAudienceCategoryForField(dbKey: string): string {
  const lane = discoveryLaneForField(dbKey);
  if (lane) return DISCOVERY_AUDIENCE_CATEGORY_CHIP[lane];
  const primary = primaryStakeholderForIntelligenceField(dbKey);
  if (primary !== "unspecified") return DISCOVERY_AUDIENCE_CATEGORY_CHIP[primary];
  return "General";
}

export function isIntelligenceFieldAppropriateForStakeholder(
  dbKey: string,
  stakeholder: IntelligenceDiscoveryStakeholder,
): boolean {
  if (stakeholder === "unspecified") return true;
  if (stakeholder === "case_scoped") return isCaseIntelligenceDbKey(dbKey);
  if (stakeholder === "provider_surgeon") return SURGEON_DISCOVERY_DB_KEYS.has(dbKey);
  if (stakeholder === "facility_or_access") return FACILITY_DISCOVERY_DB_KEYS.has(dbKey);
  if (stakeholder === "scheduler_office") return SCHEDULER_DISCOVERY_DB_KEYS.has(dbKey);
  if (stakeholder === "administrative_procurement") return ADMIN_DISCOVERY_DB_KEYS.has(dbKey);
  return false;
}

/**
 * Proposed intelligence scope for Rapid Discovery — respects active audience lane defaults.
 */
export function resolveDiscoveryScopeForField(
  dbKey: string,
  discoveryStakeholder: IntelligenceDiscoveryStakeholder = "unspecified",
  text?: string,
): IntelligenceScopeResolution {
  if (discoveryStakeholder === "facility_or_access") {
    return {
      scope: "organization",
      reason: "Facility / OR Access — updates organization intelligence by default.",
    };
  }
  if (discoveryStakeholder === "provider_surgeon") {
    return {
      scope: "provider",
      reason: "Provider lane — updates provider intelligence by default.",
    };
  }
  if (discoveryStakeholder === "case_scoped") {
    return {
      scope: "case",
      reason: "Case lane — logistics and execution context for a scheduled case.",
    };
  }
  if (discoveryStakeholder === "scheduler_office") {
    const resolved = resolveScopeForDbKey(dbKey, text);
    return {
      ...resolved,
      reason: `${resolved.reason} Office / Scheduler lane — scope follows field context.`,
    };
  }
  if (discoveryStakeholder === "administrative_procurement") {
    const resolved = resolveScopeForDbKey(dbKey, text);
    if (isOrganizationIntelligenceDbKey(dbKey)) {
      return {
        scope: "organization",
        reason: "Admin / Purchasing — facility purchasing and vendor landscape.",
      };
    }
    return {
      ...resolved,
      reason: `${resolved.reason} Admin / Purchasing lane.`,
    };
  }
  return resolveScopeForDbKey(dbKey, text);
}

export function resolveIntelligenceDiscoveryStakeholder(input?: {
  roleType?: string | null;
  engagementType?: string | null;
  attendees?: string | null;
  explicit?: IntelligenceDiscoveryStakeholder | null;
}): IntelligenceDiscoveryStakeholder {
  if (input?.explicit && input.explicit !== "unspecified") return input.explicit;

  const role = String(input?.roleType ?? "")
    .trim()
    .toLowerCase();
  if (role && ADMIN_ROLE_TYPES.has(role)) return "administrative_procurement";
  if (role && SCHEDULER_ROLE_TYPES.has(role)) return "scheduler_office";
  if (role && SURGEON_ROLE_TYPES.has(role)) return "provider_surgeon";

  const eng = String(input?.engagementType ?? "")
    .trim()
    .toLowerCase();
  if (eng && SCHEDULER_OFFICE_ENGAGEMENT_TYPES.has(eng)) return "scheduler_office";
  if (eng && SURGEON_FORWARD_ENGAGEMENT_TYPES.has(eng)) return "provider_surgeon";

  const attendees = String(input?.attendees ?? "").toLowerCase();
  if (/\b(scheduler|coordinator|credentialing|office manager|materials)\b/.test(attendees)) {
    return "scheduler_office";
  }
  if (/\b(purchasing|procurement|value analysis|committee|supply chain)\b/.test(attendees)) {
    return "administrative_procurement";
  }
  if (/\b(surgeon|physician|doctor|dr\.|pa\b|fellow)\b/.test(attendees)) {
    return "provider_surgeon";
  }

  return "provider_surgeon";
}

export function stakeholderDiscoveryPrompt(
  dbKey: string,
  stakeholder: IntelligenceDiscoveryStakeholder,
): ProgressiveDiscoveryPrompt {
  const rolePrompt = STAKEHOLDER_PROGRESSIVE_PROMPTS[stakeholder]?.[dbKey];
  const def = FIELD_DEF_BY_KEY.get(dbKey);
  if (rolePrompt) {
    return {
      ...rolePrompt,
      whyItMatters: intelligenceFieldWhyItMatters(dbKey) ?? def?.helper,
      helper: def?.helper,
    };
  }
  const fieldLabel = def?.label ?? dbKey.replace(/^provider_/, "").replace(/_/g, " ");
  return {
    prompt: def
      ? `${intelligenceContextualCaptureCta(dbKey)} — tailored for ${INTELLIGENCE_DISCOVERY_STAKEHOLDER_LABELS[stakeholder].toLowerCase()}`
      : `What can you confirm about ${fieldLabel}?`,
    whyItMatters: intelligenceFieldWhyItMatters(dbKey) ?? def?.helper,
    helper: def?.helper,
  };
}

export function discoveryCoachingPrompt(
  dbKey: string,
  stakeholder: IntelligenceDiscoveryStakeholder = "unspecified",
): string | null {
  return STAKEHOLDER_COACHING_PROMPTS[stakeholder]?.[dbKey] ?? null;
}

/** Rapid Discovery audience filters — `unspecified` is the All lane (default). */
/** Rapid Discovery scope filters — optional enrichment lanes (not required setup). */
export const DISCOVERY_STAKEHOLDER_PATH_OPTIONS: {
  id: IntelligenceDiscoveryStakeholder;
  shortLabel: string;
}[] = [
  { id: "unspecified", shortLabel: "All" },
  { id: "facility_or_access", shortLabel: "Facility" },
  { id: "provider_surgeon", shortLabel: "Provider" },
  { id: "case_scoped", shortLabel: "Case" },
];

export function discoveryInteractionPrompt(
  dbKey: string,
  stakeholder: IntelligenceDiscoveryStakeholder = "unspecified",
): { prompt: string; timingLabel: string } {
  const tailored = stakeholderDiscoveryPrompt(dbKey, stakeholder);
  return {
    prompt: tailored.prompt,
    timingLabel: STAKEHOLDER_INTERACTION_TIMING[stakeholder],
  };
}

/** Tactical ask pools aligned to stakeholder conversations. */
export const TACTICAL_ASK_POOL_BY_STAKEHOLDER = {
  provider_surgeon: [
    "What creates the most workflow friction in the OR today?",
    "What matters most when evaluating new products?",
    "How involved do you want reps during procedures?",
    "What makes OR workflow smoother or harder on case days?",
    "Which procedures would you consider for a workflow trial first?",
  ],
  facility_or_access: [
    "Is vendor credentialing required before observation at this facility?",
    "How does vendor observation access work site-wide?",
    "What is the facility credentialing path?",
    "What are the best facility windows for observation?",
    "What OR workflow culture should reps expect here?",
  ],
  scheduler_office: [
    "How far in advance should observation requests be submitted?",
    "Who approves vendor observation access?",
    "Who coordinates observation scheduling?",
    "How often can observation realistically be scheduled?",
    "What scheduling steps gate a sterile-field visit?",
  ],
  administrative_procurement: [
    "Who owns budget approval for a workflow change?",
    "What does purchasing need to see in a sterile-field comparison?",
    "Which value committee or NP review gates new products?",
    "What cost-per-case threshold would block adoption?",
    "Who signs off on trial inventory and consignment?",
  ],
} as const;

export function stakeholderPriorityBoost(
  dbKey: string,
  stakeholder: IntelligenceDiscoveryStakeholder,
): number {
  if (stakeholder === "unspecified") {
    const lane = discoveryLaneForField(dbKey);
    if (!lane) return 0;
    const laneOrderBoost =
      (STAKEHOLDER_LANE_ORDER.length - STAKEHOLDER_LANE_ORDER.indexOf(lane)) * 18;
    const focusBoost =
      (lane === "provider_surgeon"
        ? SURGEON_FOCUS_PRIORITY_BOOST[dbKey]
        : lane === "facility_or_access"
          ? FACILITY_FOCUS_PRIORITY_BOOST[dbKey]
          : lane === "case_scoped"
            ? (isCaseIntelligenceDbKey(dbKey) ? 28 : 0)
            : lane === "scheduler_office"
              ? SCHEDULER_FOCUS_PRIORITY_BOOST[dbKey]
              : ADMIN_FOCUS_PRIORITY_BOOST[dbKey]) ?? 0;
    return laneOrderBoost + focusBoost;
  }

  if (!isIntelligenceFieldAppropriateForStakeholder(dbKey, stakeholder)) {
    return -200;
  }

  if (stakeholder === "provider_surgeon") {
    return SURGEON_FOCUS_PRIORITY_BOOST[dbKey] ?? 20;
  }
  if (stakeholder === "facility_or_access") {
    return FACILITY_FOCUS_PRIORITY_BOOST[dbKey] ?? 20;
  }
  if (stakeholder === "scheduler_office") {
    return SCHEDULER_FOCUS_PRIORITY_BOOST[dbKey] ?? 20;
  }
  if (stakeholder === "administrative_procurement") {
    return ADMIN_FOCUS_PRIORITY_BOOST[dbKey] ?? 20;
  }
  if (stakeholder === "case_scoped") {
    return isCaseIntelligenceDbKey(dbKey) ? 24 : -200;
  }
  return 0;
}

export function filterDbKeysForDiscoveryStakeholder(
  dbKeys: readonly string[],
  stakeholder: IntelligenceDiscoveryStakeholder,
): string[] {
  if (stakeholder === "unspecified") return [...dbKeys];
  return dbKeys.filter((dbKey) => isIntelligenceFieldAppropriateForStakeholder(dbKey, stakeholder));
}
