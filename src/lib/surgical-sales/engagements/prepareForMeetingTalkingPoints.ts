import { normalizeSalesStage, salesStageLabel, type SalesStage } from "@/lib/sales/stages";
import { formatEngagementType, normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import {
  INTRO_CALL_TALKING_AVOID_PATTERN,
  INTRO_CALL_TALKING_BY_PRODUCT,
  INTRO_CALL_TALKING_BY_SPECIALTY,
  INTRO_CALL_TALKING_BY_SPECIALTY_GENERIC,
  INTRO_CALL_TALKING_CORE,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import { PREP_CONTEXT_TALKING } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { DominantPrepGenerationFlags } from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import {
  resolveEffectiveSpecialtyKeyForPrep,
  resolvePrepGenerationFlags,
} from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import { INTRO_CALL_DISCOVERY_FOCUS_AREAS } from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";
import { buildIntroCallPathwayTalkingPoints } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import {
  isIntroCallProductPrepEnabled,
  resolveIntroCallProductPrepBundle,
} from "@/lib/surgical-sales/engagements/introCallProductContext";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export const MAX_SUGGESTED_TALKING_POINTS = 6;

export type PrepareSuggestedTalkingPoints = {
  points: string[];
  /** Short subtitle for UI, e.g. "ACSIS · General Surgery · Observation" */
  context_label: string | null;
};

type SpecialtyKey = "general_surgery" | "wound_care" | "orthopedics" | "default";

const SALESY_OR_GENERIC_PATTERN =
  /excited to|thrilled|best-in-class|industry-leading|partner with you|leverage our|game.?changer|cutting.?edge|value proposition|product positioning|differentiation|peer utilization|align to stated|clinical priorities and current vendor/i;

/** Discussion paths — clinically aware, workflow-first (not sales bullets) */
const PRODUCT_SPECIALTY_TOPICS: Record<
  PreCallPlanProductLine,
  Partial<Record<SpecialtyKey | "default", string[]>>
> = {
  ACSIS: {
    general_surgery: [
      "Current ventral hernia fixation workflow",
      "Procedural bottlenecks during minimally invasive repair",
      "Monthly laparoscopic and open hernia case volume",
      "Where percutaneous tacks or sutures add time or bleeding",
      "Mesh handling and fascial closure in complex defects",
      "Workflow consistency across surgeons in the hernia program",
    ],
    default: [
      "Standard mesh and fixation sequence in hernia cases",
      "OR time impact vs current closure habit",
      "Case types that would be first for a workflow trial",
    ],
  },
  BioTissue: {
    wound_care: [
      "Challenges with current biologic selection",
      "Advanced wound staging before graft escalation",
      "NPWT compatibility and dressing rules for biologics",
      "Clinic time and adherence during graft application",
      "Heal-rate documentation the committee expects",
      "Payer mix constraints on advanced wound products",
    ],
    default: [
      "When the practice escalates beyond standard dressings",
      "Who owns graft selection — surgeon, nursing, or committee",
      "Monthly advanced wound case volume",
    ],
  },
  Merakris: {
    wound_care: [
      "Challenges with current skin-substitute selection",
      "Advanced wound staging before graft escalation",
      "NPWT compatibility and dressing rules for grafts",
      "Clinic time and adherence during graft application",
      "Heal-rate documentation the committee expects",
      "Payer mix constraints on advanced wound products",
    ],
    default: [
      "When the practice escalates beyond standard dressings",
      "Who owns graft selection — surgeon, nursing, or committee",
      "Monthly advanced wound case volume",
    ],
  },
  TelaBio: {
    general_surgery: [
      "Fascial closure reinforcement in robotic ventral cases",
      "Tissue handling vs rolled mesh in the closure step",
      "Seroma or recurrence signals that change reinforcement",
      "Robotic dock time vs open hernia closure comparison",
    ],
    default: [
      "Where fascial reinforcement adds steps today",
      "Case selection for a reinforcement evaluation",
    ],
  },
  "Skeletal Dynamics": {
    orthopedics: [
      "Current distal extremity fixation workflow",
      "Tray turnover and instrument steps in trauma bays",
      "Plate and screw profile in osteopenic bone",
      "Night-call tray preference — fellow vs attending",
      "Sterile-field comparison purchasing expects",
      "Monthly ankle and hand fracture volume",
    ],
    default: [
      "Highest-volume extremity procedures this quarter",
      "What would justify a limited tray evaluation",
    ],
  },
  Endolumik: {
    general_surgery: [
      "Sizing and confirmation workflow in robotic cases",
      "Staff training load for device placement steps",
      "Case sequencing with robotics coordinator",
      "Steps that extend dock time beyond surgeon preference",
    ],
    default: [
      "Which robotic case types are in scope for evaluation",
      "Documentation the team wants captured post-case",
    ],
  },
};

const SPECIALTY_TOPICS: Record<SpecialtyKey, string[]> = {
  general_surgery: [
    "Reconstructive and hernia case mix month to month",
    "Robotic vs laparoscopic approach share",
    "Where the closure step creates the most friction",
  ],
  wound_care: [
    "DFU and limb-preservation volume drivers",
    "Workflow consistency across wound clinic providers",
    "When standard care fails — escalation triggers",
  ],
  orthopedics: [
    "Trauma call tray habits vs elective extremity cases",
    "Fixation choices in osteopenic or comminuted bone",
    "ASC vs hospital preference card differences",
  ],
  default: [
    "Highest-volume procedures for this provider",
    "Steps that slow turnover or add rework",
  ],
};

const ENGAGEMENT_TYPE_TOPICS: Partial<Record<string, string[]>> = {
  intro_call: [],
  observation_request: [
    "Ideal observation case — size, approach, and backup plan",
    "Photography, sterile field, and rep presence rules",
    "Who joins the post-case debrief",
  ],
  product_demo: [
    "Hands-on outcomes the demo must prove for staff",
    "Criteria to move from demo to first evaluation case",
  ],
  office_visit_360: [
    "Sim lab topics that map to real OR workflow",
    "Products that matter for the hands-on portion",
  ],
  or_visit: [
    "Trays opened today and why — habit vs protocol",
    "What to observe quietly vs discuss in room",
  ],
  in_service_training: [
    "Training gaps the team named before in-service",
    "Who will own the first post-training cases",
  ],
  evaluation_planning: [
    "Evaluation case count and success metrics",
    "Preference card and supply timing before first case",
  ],
  evaluation_follow_up: [
    "What's working in early evaluation cases",
    "What's blocking the next scheduled case",
  ],
  follow_up: [
    "What changed in workflow since last touchpoint",
    "Open items from the last conversation",
  ],
  post_case_follow_up: [
    "How the recent case compared to expectations",
    "What they'd adjust on the next similar case",
  ],
};

const STAGE_TOPICS: Partial<Record<SalesStage, string[]>> = {
  discovery: [],
  clinical_validation: [
    "Validation case selection and required documentation",
    "Imaging or photo protocol for the committee",
  ],
  evaluation_planned: [
    "Evaluation design — cases, metrics, and timeline",
    "Supply chain steps before the first trial case",
  ],
  evaluation_active: [
    "Mid-evaluation friction in the first cases",
    "Course corrections the surgeon wants before case three",
  ],
  outcome_review: [
    "Data the committee needs for a decision",
    "Objections surfaced during trial cases",
  ],
  preference_card_progress: [
    "Preference card edits still pending approval",
    "Remaining clinical objections to standardization",
  ],
  adoption_expanding: [
    "Criteria to expand to additional surgeons or sites",
    "Reorder signals and inventory reality",
  ],
};

function normalizeSpecialtyKey(specialty: string | null | undefined): SpecialtyKey {
  const s = String(specialty ?? "").trim().toLowerCase();
  if (/wound|dfu|limb preservation/i.test(s)) return "wound_care";
  if (/orthop|foot|ankle|hand|extremity|fixation|trauma/i.test(s)) return "orthopedics";
  if (/general|surgery|hernia|robotic|bariatric|tapp/i.test(s)) return "general_surgery";
  return "default";
}

function resolveProductLine(raw: string | null | undefined): PreCallPlanProductLine | "" {
  const first = String(raw ?? "")
    .split(/[,;|]/)[0]
    ?.trim();
  return isPreCallPlanProductLine(first) ? first : "";
}

function normalizeForDedupe(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

function isSimilar(a: string, b: string): boolean {
  const na = normalizeForDedupe(a);
  const nb = normalizeForDedupe(b);
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length >= nb.length ? na : nb;
  if (shorter.length > 18 && longer.includes(shorter.slice(0, Math.min(28, shorter.length)))) {
    return true;
  }
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 3));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap += 1;
  }
  const minSize = Math.min(wordsA.size, wordsB.size);
  return minSize >= 3 && overlap / minSize >= 0.65;
}

function sanitizeTopic(text: string): string | null {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length < 12) return null;
  if (SALESY_OR_GENERIC_PATTERN.test(t)) return null;
  if (/^competitive position:|^align to|^technique fit:|^or dynamics:|^relationship:/i.test(t)) {
    return null;
  }
  if (t.length > 100) {
    t = `${t.slice(0, 97).replace(/[,;]\s*[^,;.]*$/, "").trim()}…`;
  }
  return t;
}

function pushUnique(out: string[], candidate: string, limit: number): void {
  if (out.length >= limit) return;
  const clean = sanitizeTopic(candidate);
  if (!clean) return;
  if (out.some((existing) => isSimilar(existing, clean))) return;
  out.push(clean);
}

function pushIntroCallTopic(out: string[], candidate: string, limit: number): void {
  if (out.length >= limit) return;
  const raw = candidate.replace(/\s+/g, " ").trim();
  if (!raw || raw.length < 12) return;
  if (INTRO_CALL_TALKING_AVOID_PATTERN.test(raw) || SALESY_OR_GENERIC_PATTERN.test(raw)) return;
  pushUnique(out, raw, limit);
}

function buildIntroCallTalkingPoints(
  specialtyKey: SpecialtyKey,
  productLine: PreCallPlanProductLine | "",
  intel: PrepareKnownIntelligence,
  max: number,
  prepContextState?: EngagementPreparationContextState,
  prepSpecializationTier?: PreparationSpecializationTier,
  intentionalProductFocus = false,
  dominantPrep?: DominantPrepGenerationFlags,
): string[] {
  const points: string[] = [];
  const flags = resolvePrepGenerationFlags({
    dominantPrep,
    prepMode: dominantPrep?.prep_mode,
    productLine,
    providerSpecialty: specialtyKey,
    prepContextState,
    prepSpecializationTier,
    intentionalProductFocus,
    engagementType: "intro_call",
  });

  const prepState = flags.prep_context_state;
  const effectiveKey = flags.effective_specialty_key as SpecialtyKey;
  const tier = flags.product_prep_tier;
  const activeProduct = flags.product_line;
  const productAligned =
    flags.use_product_bundle &&
    isIntroCallProductPrepEnabled(activeProduct, tier, flags.intentional_product_focus);

  if (flags.use_product_bundle && activeProduct) {
    const productBundle = resolveIntroCallProductPrepBundle({
      specialtyKey: effectiveKey,
      productLine: activeProduct,
    });
    pushIntroCallTopic(points, productBundle.workflowFocus.replace(/\.$/, ""), max);
    for (const topic of productBundle.evaluationTalkingPoints.slice(0, tier === "high" ? 3 : 4)) {
      pushIntroCallTopic(points, topic, max);
    }
    for (const topic of productBundle.workflowTalkingPoints.slice(0, 2)) {
      pushIntroCallTopic(points, topic, max);
    }
    for (const topic of productSpecialtyPool(activeProduct, effectiveKey).slice(0, 2)) {
      pushIntroCallTopic(points, topic, max);
    }
    if (flags.include_prep_context_extras) {
      for (const topic of PREP_CONTEXT_TALKING[prepState] ?? []) {
        pushIntroCallTopic(points, topic, max);
      }
    }
    for (const topic of introCallIntelligenceTopics(intel, effectiveKey, activeProduct)) {
      pushIntroCallTopic(points, topic, max);
    }
    return points.slice(0, max);
  }

  if (flags.include_generic_talking_core || flags.include_specialty_workflow_focus) {
    const neutralBundle = resolveIntroCallProductPrepBundle({
      specialtyKey: effectiveKey,
      productLine: null,
    });
    pushIntroCallTopic(points, neutralBundle.workflowFocus.replace(/\.$/, ""), max);
  }
  if (flags.include_specialty_generic_pool) {
    const specialtyPool = INTRO_CALL_TALKING_BY_SPECIALTY_GENERIC[effectiveKey];
    for (const topic of specialtyPool.slice(0, 4)) {
      pushIntroCallTopic(points, topic, max);
    }
  }

  if (flags.include_generic_talking_core) {
    for (const topic of INTRO_CALL_TALKING_CORE) {
      if (topic.endsWith("?")) pushIntroCallTopic(points, topic, max);
    }
  }
  for (const topic of introCallIntelligenceTopics(intel, effectiveKey, "")) {
    pushIntroCallTopic(points, topic, max);
  }

  return points.slice(0, max);
}

function productSpecialtyPool(
  productLine: PreCallPlanProductLine,
  specialtyKey: SpecialtyKey,
): string[] {
  const byProduct = PRODUCT_SPECIALTY_TOPICS[productLine];
  if (byProduct) {
    return [...(byProduct[specialtyKey] ?? []), ...(byProduct.default ?? [])];
  }
  return [];
}

function firstVendorSnippet(text: string): string | null {
  const t = text
    .trim()
    .replace(/^competitive:\s*/i, "")
    .replace(/^current:\s*/i, "");
  if (!t) return null;
  const part = t.split(/[·;|,]/)[0]?.trim();
  if (!part || part.length < 4) return null;
  return part.slice(0, 40).trim();
}

function introCallIntelligenceTopics(
  intel: PrepareKnownIntelligence,
  specialtyKey: SpecialtyKey,
  productLine: PreCallPlanProductLine | "",
): string[] {
  const out: string[] = [];

  for (const bullet of intel.bullets) {
    if (bullet.key === "procedural_preferences" && bullet.value.length > 10) {
      const focus = bullet.value.slice(0, 90).trim();
      out.push(`Documented procedure focus — ${focus}`);
    }

    if (bullet.key === "competitor_usage") {
      const vendor = firstVendorSnippet(bullet.value);
      if (vendor) {
        out.push(
          productLine
            ? `Incumbent fixation habits with ${vendor} — where closure still lags`
            : `Incumbent workflow habits with ${vendor} — where procedural steps still lag`,
        );
      } else if (productLine) {
        out.push("Current mesh and fixation sequence versus steps that still slow closure");
      } else {
        out.push("Current procedural workflow versus steps that still slow the case");
      }
    }

    if (bullet.key === "product_interests" && bullet.value.length > 8) {
      const interest = bullet.value.slice(0, 70).trim();
      if (specialtyKey === "wound_care") {
        out.push(
          productLine
            ? `Stated biologic interest (${interest}) — validate against wound case mix`
            : `Stated clinical interest (${interest}) — validate against case mix and workflow`,
        );
      } else {
        out.push(`Stated interest (${interest}) — map to cases they run most often`);
      }
    }

    if (bullet.key === "evaluation_openness" && bullet.value.length > 8 && productLine) {
      out.push(`Evaluation openness — ${bullet.value.slice(0, 85).trim()}`);
    }

  }

  if (intel.last_key_insight?.body) {
    const body = intel.last_key_insight.body.slice(0, 85).trim();
    const when = intel.last_key_insight.at_label ? ` (${intel.last_key_insight.at_label})` : "";
    out.push(`Prior touchpoint follow-up${when}: ${body}`);
  }

  return out;
}

function intelligenceTopics(
  intel: PrepareKnownIntelligence,
  specialtyKey: SpecialtyKey,
  productLine: PreCallPlanProductLine | "",
): string[] {
  const out: string[] = [];

  for (const bullet of intel.bullets) {
    if (bullet.key === "procedural_preferences" && bullet.value.length > 10) {
      const focus = bullet.value.slice(0, 90).trim();
      if (/hernia|ventral|robotic|wound|fixation|trauma|dfu/i.test(focus)) {
        out.push(`Procedure focus — ${focus}`);
      } else {
        out.push(`Documented procedure focus: ${focus}`);
      }
    }

    if (bullet.key === "competitor_usage") {
      const vendor = firstVendorSnippet(bullet.value);
      if (vendor) {
        out.push(`Where ${vendor} still fits day-to-day — and where the closure step lags`);
      } else {
        out.push("Current vendor workflow vs steps that still frustrate the team");
      }
    }

    if (bullet.key === "product_interests" && bullet.value.length > 8) {
      const interest = bullet.value.slice(0, 70).trim();
      if (specialtyKey === "wound_care") {
        out.push(`Interest in ${interest} — fit with clinic dressing workflow`);
      } else if (productLine === "ACSIS") {
        out.push(`${interest} — map to hernia case types they run most`);
      } else {
        out.push(`${interest} — tie to their highest-volume cases`);
      }
    }

    if (bullet.key === "communication" && /direct|brief|data|minimal/i.test(bullet.value)) {
      out.push("Keep discussion procedural — data and case examples over broad overview");
    }
  }

  if (intel.last_key_insight?.body) {
    const body = intel.last_key_insight.body.slice(0, 85).trim();
    const when = intel.last_key_insight.at_label ? ` (${intel.last_key_insight.at_label})` : "";
    out.push(`Follow-through from last touchpoint${when}: ${body}`);
  }

  return out;
}

function planDerivedTopics(engagement: Record<string, unknown>): string[] {
  const out: string[] = [];
  const probes = String(engagement.pre_observation_probes ?? "")
    .split(/\n|;|•/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter((s) => s.length > 12 && s.length < 100);
  for (const probe of probes.slice(0, 1)) {
    if (!probe.endsWith("?")) {
      out.push(probe.charAt(0).toUpperCase() + probe.slice(1));
    }
  }
  const sim = String(engagement.sim_lab_focus ?? "").trim();
  if (sim) out.push(`Sim / hands-on focus — ${sim.slice(0, 90)}`);
  return out;
}

export function buildPrepareSuggestedTalkingPoints(input: {
  specialty: string | null;
  engagementType: string;
  productLine: string | null;
  opportunityStage: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  engagement?: Record<string, unknown>;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
  dominantPrep?: DominantPrepGenerationFlags;
}): PrepareSuggestedTalkingPoints {
  const dominant = input.dominantPrep;
  const legacyFlags = resolvePrepGenerationFlags({
    dominantPrep: input.dominantPrep,
    productLine: resolveProductLine(input.productLine),
    providerSpecialty: input.specialty,
    prepContextState: input.prepContextState,
    prepSpecializationTier: input.prepSpecializationTier,
    intentionalProductFocus: input.intentionalProductFocus,
  });
  const specialtyKey = legacyFlags.effective_specialty_key as SpecialtyKey;
  const productLine = legacyFlags.product_line;
  const engagementType = normalizeEngagementType(input.engagementType) || String(input.engagementType ?? "").trim();
  const stage = normalizeSalesStage(input.opportunityStage);
  const stageLabel = stage ? salesStageLabel(stage) : null;
  const typeLabel = formatEngagementType(engagementType);

  const points: string[] = [];
  const max = MAX_SUGGESTED_TALKING_POINTS;

  const specialtyPool = productLine
    ? productSpecialtyPool(productLine, specialtyKey)
    : (SPECIALTY_TOPICS[specialtyKey] ?? SPECIALTY_TOPICS.default);

  if (engagementType === "intro_call") {
    const productAligned =
      legacyFlags.use_product_bundle &&
      isIntroCallProductPrepEnabled(
        legacyFlags.product_line,
        legacyFlags.product_prep_tier,
        legacyFlags.intentional_product_focus,
      );
    if (!productAligned) {
      points.push(
        ...buildIntroCallPathwayTalkingPoints(input.knownIntelligence, Math.max(max, 6)),
      );
    } else {
      points.push(
        ...buildIntroCallTalkingPoints(
          specialtyKey,
          productLine,
          input.knownIntelligence,
          Math.max(max, 8),
          input.prepContextState ?? legacyFlags.prep_context_state,
          input.prepSpecializationTier ?? legacyFlags.product_prep_tier,
          Boolean(input.intentionalProductFocus ?? legacyFlags.intentional_product_focus),
          legacyFlags,
        ),
      );
    }
  } else {
    for (const topic of specialtyPool.slice(0, 2)) {
      pushUnique(points, topic, max);
    }

    for (const topic of intelligenceTopics(input.knownIntelligence, specialtyKey, productLine)) {
      pushUnique(points, topic, max);
    }

    for (const topic of specialtyPool.slice(2)) {
      pushUnique(points, topic, max);
    }

    for (const topic of ENGAGEMENT_TYPE_TOPICS[engagementType] ?? []) {
      pushUnique(points, topic, max);
    }

    if (stage === "discovery") {
      for (const topic of [
        "Clinical metrics that would justify changing vendors",
        "Who influences supply decisions beyond the surgeon",
      ]) {
        pushUnique(points, topic, max);
      }
    } else if (stage && STAGE_TOPICS[stage]) {
      for (const topic of STAGE_TOPICS[stage]!) {
        pushUnique(points, topic, max);
      }
    }
  }

  if (input.engagement) {
    for (const topic of planDerivedTopics(input.engagement)) {
      pushUnique(points, topic, max);
    }
  }

  if (points.length < 3) {
    for (const topic of SPECIALTY_TOPICS[specialtyKey] ?? SPECIALTY_TOPICS.default) {
      pushUnique(points, topic, max);
    }
  }

  const contextParts = [
    input.prepContextState
      ? input.prepContextState === "product_exploration"
        ? "Product Exploration"
        : input.prepContextState === "evaluation_planning"
          ? "Evaluation Planning"
          : input.prepContextState === "observation_support"
            ? "Observation / Support"
            : "Discovery"
      : null,
    productLine || null,
    input.specialty?.trim() || null,
    typeLabel || null,
    stageLabel,
  ].filter((p): p is string => Boolean(p));

  return {
    points: points.slice(0, max),
    context_label: contextParts.length > 0 ? contextParts.join(" · ") : null,
  };
}

export function formatTalkingPointsForClipboard(input: {
  points: string[];
  providerName?: string | null;
  engagementTypeLabel?: string | null;
}): string {
  const lines: string[] = [];
  const provider = String(input.providerName ?? "").trim();
  const typeLabel = String(input.engagementTypeLabel ?? "").trim();

  if (provider && typeLabel) {
    lines.push(`Talking points — ${provider}`, typeLabel);
  } else if (provider) {
    lines.push(`Talking points — ${provider}`);
  } else if (typeLabel) {
    lines.push(`Talking points — ${typeLabel}`);
  } else {
    lines.push("Suggested talking points");
  }

  lines.push("");
  for (const point of input.points) {
    const t = point.trim();
    if (t) lines.push(`• ${t}`);
  }
  return lines.join("\n").trimEnd();
}

/** Clipboard write with textarea fallback for mobile browsers that block async clipboard. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text.trim()) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "2em";
  textarea.style.height = "2em";
  textarea.style.padding = "0";
  textarea.style.border = "none";
  textarea.style.outline = "none";
  textarea.style.boxShadow = "none";
  textarea.style.background = "transparent";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}
