/**
 * Intro Call — commercialization workflow (not generic sales discovery).
 * Map OR/procedural workflow, qualify observation pathway, surface barriers.
 */

/** Preparation step onboarding — product-neutral until a product focus is selected */
export const INTRO_CALL_PREP_INTRO_LEAD =
  "Complete the official Intro Call Pre-call Plan — hospital, surgeon, SMART objective, opening, probes, tools, value, and close.";

export const INTRO_CALL_PREP_INTRO_SUB =
  "Choose a product focus only when you want procedure-specific language; otherwise keep portfolio discovery.";

export const INTRO_CALL_PREP_CUSTOMIZE_TITLE = "Advanced planning";

export const INTRO_CALL_PREP_CUSTOMIZE_LEAD =
  "Optional field-level edits — objective, opening, discovery probes, and observation notes. Workflow guidance above is the primary prep path.";

export const PREP_HIERARCHY_OBJECTIVE_TITLE = "Interaction objective (SMART)";
export const PREP_HIERARCHY_DISCOVERY_TITLE = "Workflow discovery guidance";
export const PREP_HIERARCHY_DISCOVERY_DESC =
  "Map procedural workflow and evaluation fit before product alignment.";
export const PREP_HIERARCHY_OBSERVATION_TITLE = "Observation qualification";
export const PREP_HIERARCHY_OBSERVATION_DESC =
  "Qualify whether the surgeon is open to observation and which cases to watch.";
export const PREP_HIERARCHY_EVALUATION_TITLE = "Evaluation readiness";
export const PREP_HIERARCHY_EVALUATION_DESC =
  "Signals and outcomes that indicate whether evaluation activity is realistic.";
export const PREP_HIERARCHY_OVERLAYS_TITLE = "Optional product overlays";
export const PREP_HIERARCHY_OVERLAYS_DESC =
  "Templates add product-specific starting points — use only after workflow discovery when helpful.";
export const PREP_HIERARCHY_ADVANCED_TITLE = "Advanced planning";

/** Observation qualification mode — discovery overlays */
export const INTRO_CALL_OBSERVATION_QUALIFICATION_DISCOVERY = [
  "Which case types would you be most comfortable having us observe?",
  "What would you want us to pay attention to during an observed case?",
  "Which procedure types are realistic for a first observation?",
  "Where does workflow friction show up most in the cases you run every week?",
] as const;

export const INTRO_CALL_OBSERVATION_QUALIFICATION_TALKING = [
  "Case types the surgeon would allow for observation",
  "What to watch for during observation — workflow, technique, friction",
  "Signals that observation is realistic vs. a longer discovery path",
] as const;

import {
  INTRO_CALL_DISCOVERY_CORE,
  INTRO_CALL_SUCCESS_OUTCOMES_DISCOVERY_FOCUS,
  INTRO_CALL_TALKING_DISCOVERY_FOCUS,
} from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";

export { INTRO_CALL_DISCOVERY_CORE };

/** Desired outcomes — discovery focus structure (default when no product) */
export const INTRO_CALL_SUCCESS_OUTCOMES: readonly string[] = INTRO_CALL_SUCCESS_OUTCOMES_DISCOVERY_FOCUS;

/** Universal intro-call topics — aligned to discovery focus areas */
export const INTRO_CALL_TALKING_CORE: string[] = [...INTRO_CALL_TALKING_DISCOVERY_FOCUS];

export const INTRO_CALL_SUCCESS_OUTCOMES_LEAD =
  "Target commercialization progression — not a generic discovery note.";

/** Default “Why this matters” — observation viability, procedural intelligence, evaluation pathway */
export const INTRO_CALL_WHY_THIS_MATTERS =
  "This interaction should help determine whether this provider is a realistic candidate for future OR observation, procedural intelligence gathering, and product evaluation activity.";

/** Product-neutral discovery — no product-evaluation framing */
export const INTRO_CALL_WHY_BROAD_DISCOVERY =
  "This interaction should map procedural workflow and whether observing their cases could be realistic — before any product or specialty alignment.";

export const INTRO_CALL_WHY_AVOID_PATTERN =
  /relationship building|build rapport|general conversation|product tour|not a pitch|Map procedural workflow/i;

/** Product-specific language — must not appear in default (no product) prep output */
export const INTRO_CALL_PRODUCT_SPECIFIC_AVOID_PATTERN =
  /\bventral\b|\bincisional\b|\bhernia\b|\bmesh\b|\bfixation\b|\btacks?\b|closure device|abdominal wall|fascial reinforcement|biologic graft|percutaneous tack/i;

/** Specialty overlays when product / initiative focus is selected */
export const INTRO_CALL_DISCOVERY_BY_SPECIALTY: Record<
  "general_surgery" | "wound_care" | "orthopedics" | "default",
  string[]
> = {
  general_surgery: [
    "Which reconstructive cases are most challenging operationally?",
    "How do you sequence mesh, fixation, and fascial closure in lap ventral cases today?",
    "Which ventral or incisional case types would you schedule for observation if access were approved?",
    "How standardized is tack versus suture fixation across your hernia program?",
  ],
  wound_care: [
    "Which wound types would you allow observation or case review on in clinic or the procedure room?",
    "What part of biologic application or dressing workflow creates the most inefficiency today?",
    "How involved is the wound care committee or formulary group in graft decisions?",
    "What documentation or heal-rate evidence does committee require before evaluation?",
  ],
  orthopedics: [
    "Which extremity procedures would you allow sterile-field observation on?",
    "How standardized is tray and fixation choice across trauma-call versus elective cases?",
    "What does purchasing need to see before a tray comparison or evaluation moves forward?",
    "Are there fracture patterns where OR time or instrument steps become a bottleneck?",
  ],
  default: [
    "Which case types create the most operational friction in the OR or clinic today?",
    "Who must approve workflow or product changes before they stick in practice?",
  ],
};

/** Specialty-level discovery — no product/procedure-line assumptions */
export const INTRO_CALL_DISCOVERY_BY_SPECIALTY_GENERIC: Record<
  "general_surgery" | "wound_care" | "orthopedics" | "default",
  string[]
> = {
  general_surgery: [
    "Which procedures drive the highest volume and create the most OR coordination load?",
    "Where do key procedural steps add time, variability, or access friction?",
    "Which case types would you put forward first if observation were approved?",
  ],
  wound_care: [
    "Which case types drive the highest volume in clinic or the procedure room?",
    "Where does the treatment workflow create the most inefficiency today?",
    "Which visits would you allow observation or case review on?",
    "Who influences supply decisions beyond the treating clinician?",
  ],
  orthopedics: [
    "Which procedures drive the highest extremity or trauma volume?",
    "Where does OR workflow or instrument turnover create the most friction?",
    "Which cases would you allow sterile-field observation on?",
    "What does purchasing need before a workflow comparison or evaluation moves forward?",
  ],
  default: [
    "Which case types create the most operational friction in the OR or clinic today?",
    "Who must approve workflow or product changes before they stick in practice?",
  ],
};

export const INTRO_CALL_DISCOVERY_BY_PRODUCT: Partial<
  Record<"ACSIS" | "BioTissue" | "Merakris" | "TelaBio" | "Skeletal Dynamics" | "Endolumik", string[]>
> = {
  ACSIS: [
    "Where do percutaneous tacks or sutures add time or bleeding risk in ventral closure?",
    "Which lap ventral cases would you put on the block for an observation?",
  ],
  BioTissue: [
    "When do you escalate from standard dressings to biologics — and who triggers that decision?",
    "What NPWT or dressing rules must any graft satisfy before evaluation?",
  ],
  Merakris: [
    "When do you escalate from dressings or NPWT to a skin substitute — and who triggers that decision?",
    "What formulary or payer rules must a graft satisfy before evaluation?",
  ],
  TelaBio: [
    "How does fascial reinforcement in robotic ventral cases differ from your open routine?",
    "Which robotic cases would you allow observation on for reinforcement workflow?",
  ],
  "Skeletal Dynamics": [
    "Which ankle or hand fracture patterns drive the most tray turnover friction?",
    "What sterile-field comparison would purchasing accept for a limited tray evaluation?",
  ],
  Endolumik: [
    "Which robotic case types require the most staff coordination around sizing confirmation?",
    "Where does sizing or confirmation extend dock time beyond surgeon preference?",
  ],
};

export const INTRO_CALL_DISCOVERY_STAGE_DISCOVERY: string[] = [
  "What monthly procedure volume should anchor observation planning?",
  "Which case types would you put forward first for observation?",
];

/** Intro-call provider stage — operational, not generic “worth scheduling” language */
export const INTRO_CALL_DISCOVERY_BY_PROVIDER_STAGE: Partial<
  Record<
    | "prospect"
    | "pre_call_planning"
    | "active_relationship"
    | "established_customer"
    | "dormant"
    | "archived",
    string[]
  >
> = {
  prospect: ["What monthly case volume should we use to judge observation feasibility?"],
  pre_call_planning: [
    "Which single procedure would you put forward first if observation access were approved?",
  ],
  dormant: ["What changed in OR workflow or committee posture since we last connected?"],
};

export const INTRO_CALL_DISCOVERY_AVOID_PATTERN =
  /excited to|best-in-class|partner with you|pain points|build rapport|stakeholder alignment|clinical priorities rank|how satisfied are you with vendors|worth your time|worth scheduling/i;

/** @deprecated Use INTRO_CALL_DISCOVERY_CORE */
export const INTRO_CALL_DISCOVERY_QUESTIONS = INTRO_CALL_DISCOVERY_CORE;

export const INTRO_CALL_TALKING_BY_SPECIALTY_GENERIC: Record<
  "general_surgery" | "wound_care" | "orthopedics" | "default",
  string[]
> = {
  general_surgery: [
    "Highest-volume procedure mix and monthly cadence",
    "OR workflow inefficiencies and coordination friction",
    "Procedural standardization across surgeons and settings",
    "Observation case selection — which procedures and what to watch for",
    "Stakeholder map beyond the surgeon",
    "Procedural complexity that affects observation or evaluation timing",
  ],
  wound_care: [
    "Highest-volume case mix — clinic and procedure room",
    "Treatment workflow inefficiencies and throughput friction",
    "Procedural standardization across the wound program",
    "Observation or case-review feasibility",
    "Committee, formulary, and stakeholder influences",
    "Documentation or outcomes bar before evaluation",
  ],
  orthopedics: [
    "Highest-volume extremity procedure mix",
    "OR workflow and turnover inefficiencies",
    "Technique and supply standardization across call types",
    "Sterile-field observation feasibility",
    "Purchasing and stakeholder requirements",
    "Procedural complexity in trauma versus elective flow",
  ],
  default: [
    "Highest-volume procedures and standard OR sequence",
    "Where workflow steps add time or coordination friction",
    "Stakeholders who influence technique or supply selection",
  ],
};

/** Specialty overlays when product / initiative focus is selected */
export const INTRO_CALL_TALKING_BY_SPECIALTY: Record<
  "general_surgery" | "wound_care" | "orthopedics" | "default",
  string[]
> = {
  general_surgery: [
    "Typical ventral and incisional hernia workflow",
    "Current fixation and closure decision process",
    "Lap, open, and robotic share within the hernia program",
    "Product selection influences — mesh, tacks, and fixation sequence",
    "Committee or purchasing barriers before observation",
    "Volume and reconstructive complexity in abdominal wall cases",
  ],
  wound_care: [
    "Typical advanced wound procedure mix — clinic and procedure room",
    "Biologic selection patterns and escalation triggers",
    "NPWT and dressing rules that constrain graft choice",
    "Case cadence for biologic-eligible wounds",
    "Committee or formulary barriers before evaluation",
    "Clinic throughput friction during graft application",
  ],
  orthopedics: [
    "Distal extremity procedure mix and monthly case cadence",
    "OR tray workflow and turnover friction in trauma bays",
    "Current fixation profile and screw-density habits",
    "Case types most suitable for sterile-field observation",
    "Purchasing requirements for tray comparison",
    "Night-call versus attending tray influence",
  ],
  default: [
    "Highest-volume procedures and standard OR sequence",
    "Closure or dressing habits that add steps or time",
    "Who influences product or tray selection beyond the surgeon",
  ],
};

/** Product-line overlays — procedural habits, not positioning */
export const INTRO_CALL_TALKING_BY_PRODUCT: Partial<
  Record<"ACSIS" | "BioTissue" | "Merakris" | "TelaBio" | "Skeletal Dynamics" | "Endolumik", string[]>
> = {
  ACSIS: [
    "Percutaneous tack versus suture fixation habits in ventral cases",
    "Mesh handling steps that extend the closure portion of the case",
  ],
  BioTissue: [
    "When the practice escalates from standard dressings to biologics",
    "Application steps that limit clinic room turnover",
  ],
  Merakris: [
    "When the practice escalates from dressings or NPWT to a skin substitute",
    "Application steps that limit clinic room turnover",
  ],
  TelaBio: [
    "Fascial reinforcement sequence in robotic ventral cases",
    "How reinforcement choice differs from open hernia routine",
  ],
  "Skeletal Dynamics": [
    "Tray footprint and instrument steps in ankle and hand ORIF",
    "Profile and density choices in osteopenic bone",
  ],
  Endolumik: [
    "Sizing and confirmation steps in robotic cases",
    "Staff coordination around device placement in the OR",
  ],
};

/** Reject SaaS-style or abstract discovery phrasing on intro-call talking points */
export const INTRO_CALL_TALKING_AVOID_PATTERN =
  /\bpain points\b|relationship building|build rapport|stakeholder alignment|clinical priorities|customer success|generic discovery|value proposition|product positioning|differentiation/i;

export type IntroCallSpecialtyKey = "general_surgery" | "wound_care" | "orthopedics" | "default";

/** Openings — workflow/OR-centric; no relationship-discovery lead-ins */
export const INTRO_CALL_OPENING_AVOID_PATTERN =
  /excited to|best-in-class|partner with you|early in the relationship|introduce myself properly|get to know you|learn about your needs|product pitch|value proposition|cutting.?edge/i;

export const INTRO_CALL_OPENING_PRIMARY_GENERIC: Record<IntroCallSpecialtyKey, string> = {
  general_surgery:
    "Wanted to understand which procedures drive your highest volume, where OR workflow inefficiencies show up, and whether observation access would be realistic.",
  wound_care:
    "Wanted to understand your highest-volume case mix, where workflow inefficiencies appear, and whether observation or case review could be realistic.",
  orthopedics:
    "Hoping to learn which procedures drive volume, where OR workflow friction shows up, and whether sterile-field observation could be realistic.",
  default:
    "Would love to understand procedural workflow, case mix, and whether observation or evaluation activity could make sense here.",
};

export const INTRO_CALL_OPENING_ALTERNATE_GENERIC: Record<IntroCallSpecialtyKey, string> = {
  general_surgery:
    "Hoping to map case mix, procedural standardization, and which cases you'd put forward for observation.",
  wound_care:
    "Hoping to understand case cadence and what would need to be true before observation or evaluation.",
  orthopedics:
    "Hoping to understand case mix, tray workflow friction, and what purchasing would need for a comparison or evaluation.",
  default:
    "Hoping to learn how cases run today and what would need to be true before observation or evaluation activity.",
};

export const INTRO_CALL_OPENING_PRIMARY: Record<IntroCallSpecialtyKey, string> = {
  general_surgery:
    "Wanted to better understand how your abdominal wall reconstruction workflow operates today — especially where closure or fixation inefficiencies may exist.",
  wound_care:
    "Wanted to better understand how your advanced wound and biologic workflow operates today — especially where graft selection or clinic throughput creates inefficiency.",
  orthopedics:
    "Hoping to learn how your OR team approaches distal extremity and trauma workflows today — especially where tray or fixation steps create operational friction.",
  default:
    "Would love to understand which procedures create the most operational friction and whether there are opportunities for workflow improvement.",
};

export const INTRO_CALL_OPENING_ALTERNATE: Record<IntroCallSpecialtyKey, string> = {
  general_surgery:
    "Hoping to learn how your OR team approaches reconstructive and hernia workflows today so we can identify whether future observation or evaluation activity makes sense.",
  wound_care:
    "Hoping to learn how your wound care team stages, treats, and escalates cases today — and whether observation or committee review would be realistic next steps.",
  orthopedics:
    "Hoping to learn how your OR team handles extremity fixation and tray workflow today so we can judge whether observation or evaluation activity makes sense.",
  default:
    "Hoping to learn how your OR team runs these cases today so we can identify whether future observation or evaluation activity makes sense.",
};

export const INTRO_CALL_OPENING_EVALUATION_STAGE =
  "Wanted to understand how cases are running with your current workflow and whether OR observation or a limited evaluation still fits your plan.";

/** Product-specific primary opener when specialty + product are both known */
export const INTRO_CALL_OPENING_PRODUCT_PRIMARY: Partial<
  Record<"ACSIS" | "BioTissue" | "Merakris" | "TelaBio" | "Skeletal Dynamics" | "Endolumik", string>
> = {
  ACSIS:
    "Wanted to better understand how your ventral and incisional hernia workflow operates today — especially where mesh handling, fixation, or closure steps create inefficiency.",
  BioTissue:
    "Wanted to better understand how your team selects and applies biologics in advanced wound cases — especially where dressing rules or clinic throughput create friction.",
  Merakris:
    "Wanted to better understand how your team selects and applies skin substitutes in chronic wounds — especially where NPWT, dressing rules, or clinic throughput create friction.",
  TelaBio:
    "Wanted to understand how fascial reinforcement runs in your robotic ventral cases today — and where closure steps add time versus your open routine.",
  "Skeletal Dynamics":
    "Hoping to learn how your OR team approaches ankle and hand fixation workflows today — especially where tray steps or implant profile create friction.",
  Endolumik:
    "Wanted to understand how sizing and confirmation run in your robotic cases today — especially where staff coordination or dock time creates inefficiency.",
};

export const INTRO_CALL_OBSERVATION_GOALS_BY_SPECIALTY_GENERIC: Record<IntroCallSpecialtyKey, string[]> = {
  general_surgery: [
    "Map highest-volume procedures that could host an industry observation",
    "Clarify which procedural steps you would want captured during observation",
    "Identify which case types the surgeon put forward for a first observation",
  ],
  wound_care: [
    "Identify clinic or procedure-room visits suitable for observation or case review",
    "Capture documentation protocol alongside any observation",
    "Document what the surgeon wants noticed during wound care workflow",
  ],
  orthopedics: [
    "Identify extremity cases suitable for sterile-field observation",
    "Learn which fracture patterns the surgeon would allow observation on",
    "Document what the surgeon wants noticed during fixation workflow",
  ],
  default: [
    "Confirm which case types the team would put forward for a first observation",
    "Document what the surgeon wants noticed during observation",
  ],
};

export const INTRO_CALL_OBSERVATION_GOALS_BY_SPECIALTY_PRODUCT: Record<IntroCallSpecialtyKey, string[]> = {
  general_surgery: [
    "Map ventral, incisional, and robotic hernia cases that could host an industry observation",
    "Clarify mesh, fixation, and closure steps you would want captured in the room",
    "Identify which hernia subtypes the surgeon put forward for observation",
  ],
  wound_care: [
    "Identify clinic or procedure-room visits suitable for observation or case review",
    "Capture documentation or photo protocol alongside any observation",
    "Document what the surgeon wants noticed during graft application workflow",
  ],
  orthopedics: [
    "Identify ankle, hand, and distal radius cases suitable for sterile-field observation",
    "Learn night-call versus attending preferences for which cases to observe",
    "Document what the surgeon wants noticed during tray and fixation workflow",
  ],
  default: [
    "Confirm which case types the team would put forward for a first observation",
    "Document what the surgeon wants noticed during observation",
  ],
};

export function introCallSpecialtyKey(
  specialty: string | null | undefined,
): IntroCallSpecialtyKey {
  const s = String(specialty ?? "").trim().toLowerCase();
  if (/wound|dfu|limb preservation/i.test(s)) return "wound_care";
  if (/orthop|foot|ankle|hand|extremity|fixation|trauma/i.test(s)) return "orthopedics";
  if (/general|surgery|hernia|robotic|bariatric|tapp/i.test(s)) return "general_surgery";
  return "default";
}
