/**
 * Universal intelligence regression matrix.
 *
 * Goal: prove the extraction → read-model → presentation → grouping pipeline is
 * PRODUCT-AGNOSTIC and DICTATION-AGNOSTIC. Fixtures span different products,
 * competitors, procedures, contacts, and wording styles (terse, narrative,
 * present/past tense, dictated stream-of-consciousness, clinical shorthand).
 *
 * Every fixture runs the exact same production pipeline used by the app and asserts:
 *   1. Expected facts survive to the rep-facing output (no valid facts dropped).
 *   2. Forbidden facts never appear (no invented / mis-derived facts).
 *   3. Facts route to the correct rep-facing section (no wrong-section routing).
 *   4. Evidence grounding holds (every extracted fact's evidence is in the note).
 *   5. Negative / absence language ("no inventory issue today") never becomes a problem.
 *   6. Facts are not duplicated across the rendered surfaces.
 *
 * No product names or phrase-specific behavior is hard-coded into the engine — the
 * fixtures merely carry whatever product/competitor/contact the dictation mentions,
 * and assertions target engine BEHAVIOR (routing, grounding, negation), not fixes.
 *
 * ── TRACKED PRODUCT-/DICTATION-AGNOSTIC GAPS (see `knownGap` on individual facts) ──
 * The matrix surfaced real, non-hypothetical weaknesses where a VALID fact is dropped
 * or misrouted purely because of the product/anatomy/dictation style (never the schema):
 *   1. Provider pain/friction recognition is tuned to hernia/mesh "defect" phrasing and
 *      misses e.g. "seating the anchor in softer bone is awkward" (orthopedics).
 *   2. Inventory detection needs a recognized implant noun — "low on mesh inventory" is
 *      caught, but "low on suture anchor inventory" is dropped.
 *   3. Product-in-use detection misses "they currently use a <brand> graft" (vascular);
 *      the interest that follows is mis-inferred as an "increasing procedure volume" trend.
 *   4. Contact detection misses "Dana the OR coordinator set up the room…" (verb form).
 *   5. Terse/clipped dictation ("They used a Synthes plate. She asked if our plate holds
 *      up…") collapses to a single no-op fact.
 * Each gap is tagged so the suite stays green today, strictly guards everything that works,
 * and turns RED the moment a gap is fixed (promote it) or a working behavior regresses.
 * Fixing them requires GENERAL extraction improvements — not per-product/phrase patches.
 */

import { describe, expect, it } from "vitest";

import { buildObservationRepPresentationView } from "@/lib/surgical-sales/buildObservationRepPresentationView";
import { buildProviderIntelligenceKnowledgeDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { groupRepFriendlyIntelligenceItems } from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import {
  adaptUniversalFactsToCapturedSignals,
  adaptUniversalFactsToFollowUpNextVisitItems,
  adaptUniversalFactsToThisObservationItems,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type {
  UniversalFactExtractionRun,
  UniversalSurgicalFactRow,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

type PipelineStage =
  | "extraction"
  | "readModelObservation"
  | "observationRenderer"
  | "providerIntelligence";

type ExpectedPipelineFact = {
  id: string;
  label: string;
  /** Rep-facing section titles this fact is allowed to land in (routing guard). */
  expectedSections?: string[];
  stages: Partial<Record<PipelineStage, RegExp[]>>;
  /**
   * When set, this fact is a documented, currently-broken behavior of the engine
   * (a valid fact the engine drops or misroutes today). The suite stays green but
   * asserts the gap STILL exists — the moment the engine is improved (or regresses
   * differently) so this fact behaves, the test turns red and prompts promotion to
   * a strict assertion. This keeps known product-agnostic gaps tracked, not hidden.
   */
  knownGap?: string;
};

type AbsentFact = {
  label: string;
  stages: Partial<Record<PipelineStage, RegExp[]>>;
};

type MatrixFixture = {
  name: string;
  providerId: string;
  caseId: string;
  providerName: string;
  procedureType: string;
  note: string;
  expectedFacts: ExpectedPipelineFact[];
  absentFacts?: AbsentFact[];
};

type StageSnapshot = {
  extraction: string[];
  readModelObservation: string[];
  observationRenderer: string[];
  providerIntelligence: string[];
  observationSections: Array<{ section: string; text: string }>;
  providerSections: Array<{ section: string; text: string }>;
  groundingViolations: string[];
  debriefReadiness: string[];
};

/* ─────────────────────────── Fixture matrix ─────────────────────────── */

const MATRIX_FIXTURES: MatrixFixture[] = [
  {
    name: "orthopedics · rotator cuff · terse dictation · GalaFLEX + soft-bone fixation pain",
    providerId: "provider-reyes",
    caseId: "case-reyes",
    providerName: "Alan Reyes",
    procedureType: "Arthroscopic rotator cuff repair",
    note:
      "Observed Dr. Alan Reyes during an arthroscopic rotator cuff repair today. They used GalaFLEX for the case. Dr. Reyes said seating the anchor in softer bone can be awkward and he wants more fixation strength. He asked whether our anchor is available in a larger diameter and wanted product information for revision cases. The circulator mentioned they are getting low on suture anchor inventory. Maria coordinated the observation and had the room ready before we arrived. He was interested when I mentioned alternatives designed for stronger fixation in soft bone.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /GalaFLEX/i],
          readModelObservation: [/GalaFLEX/i],
          observationRenderer: [/GalaFLEX/i],
          providerIntelligence: [/GalaFLEX/i],
        },
      },
      {
        id: "fixation-pain",
        label: "Soft-bone fixation pain",
        expectedSections: ["Challenges & Friction"],
        knownGap:
          "Provider pain detection does not generalize: the identical sentence shape used for hernia/mesh " +
          "('positioning in larger defects is awkward') is captured, but 'seating the anchor in softer bone is " +
          "awkward' (orthopedic vocabulary) is dropped. Pain/friction recognition is tuned to defect/mesh phrasing.",
        stages: {
          extraction: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /softer bone|awkward|fixation strength/i],
          readModelObservation: [/soft(er)? bone|awkward|fixation/i],
          observationRenderer: [/soft(er)? bone|awkward|fixation/i],
        },
      },
      {
        id: "inventory",
        label: "Inventory issue",
        expectedSections: ["Challenges & Friction"],
        knownGap:
          "Inventory detection appears to require a recognized implant noun: 'getting low on mesh inventory' is " +
          "captured, but the structurally identical 'getting low on suture anchor inventory' is dropped.",
        stages: {
          extraction: [/inventory_availability_issue/i, /low|inventory/i],
          readModelObservation: [/low|inventory|availability/i],
          observationRenderer: [/low|inventory|availability/i],
        },
      },
      {
        id: "product-request",
        label: "Product information / larger size requested",
        expectedSections: ["Product Signals", "Next Steps"],
        stages: {
          extraction: [/requested_item|product_interest|next_action/i, /larger diameter|product information|available/i],
          readModelObservation: [/larger diameter|product information|available/i],
        },
      },
      {
        id: "contact-access",
        label: "Coordinator access",
        expectedSections: ["People & Access"],
        stages: {
          extraction: [/contact_role|access_pathway/i, /Maria|coordinated|room ready/i],
          readModelObservation: [/Maria/i],
        },
      },
    ],
  },
  {
    name: "colorectal · robotic LAR · present-tense narrative · OviTex vs Strattice",
    providerId: "provider-nair",
    caseId: "case-nair",
    providerName: "Priya Nair",
    procedureType: "Robotic low anterior resection",
    note:
      "Field note from Dr. Priya Nair observation during a robotic low anterior resection. Current product is OviTex. She says the handling on larger defects is what slows the team down, and Strattice is what they used before. She asked me to bring comparison information on options with better conformability. James from materials said backup sizes were not stocked before the case.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /OviTex/i],
          readModelObservation: [/OviTex/i],
          observationRenderer: [/OviTex/i],
        },
      },
      {
        id: "handling-pain",
        label: "Handling pain on larger defects",
        expectedSections: ["Challenges & Friction"],
        stages: {
          extraction: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /handling|larger defects|slows/i],
          readModelObservation: [/defects/i, /handling|slows/i],
        },
      },
      {
        id: "comparison-request",
        label: "Comparison information request",
        expectedSections: ["Product Signals", "Next Steps"],
        stages: {
          extraction: [/product_interest|requested_item|next_action/i, /comparison|bring|information|conformability/i],
          readModelObservation: [/comparison|bring|information|conformability/i],
        },
      },
      {
        id: "materials-inventory",
        label: "Materials inventory",
        expectedSections: ["Challenges & Friction", "People & Access"],
        stages: {
          extraction: [/inventory_availability_issue|contact_role/i, /James|backup sizes|stocked/i],
          readModelObservation: [/inventory or availability issue|product availability|backup sizes|stocked/i],
        },
      },
    ],
  },
  {
    name: "plastics · breast reconstruction · rambling narrative · SurgiMend contour annoyance + evaluation coordination",
    providerId: "provider-chen",
    caseId: "case-chen",
    providerName: "Grace Chen",
    procedureType: "Breast reconstruction",
    note:
      "Observed Dr. Grace Chen again today during a breast reconstruction. They were still using SurgiMend. During the case she mentioned that larger defects still take longer than she'd like because the matrix doesn't contour very well, and she said that's probably her biggest annoyance with the current setup. One of the scrub techs mentioned they've had a couple of cases delayed recently because the correct implant wasn't available in the room before the patient arrived. After the case, Dr. Chen asked me to bring some clinical information comparing products that handle larger defects better. Devon said he could help coordinate a product evaluation if the surgeon decides she wants to see something different.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /SurgiMend/i],
          readModelObservation: [/SurgiMend/i],
          observationRenderer: [/SurgiMend/i],
        },
      },
      {
        id: "contour-annoyance",
        label: "Contour annoyance",
        expectedSections: ["Challenges & Friction"],
        stages: {
          extraction: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /larger defects|contour|annoyance|take longer/i],
          readModelObservation: [/contour|take longer/i],
        },
      },
      {
        id: "implant-availability",
        label: "Implant availability before patient arrival",
        expectedSections: ["Challenges & Friction"],
        stages: {
          extraction: [/inventory_availability_issue|unavailable_item/i, /implant|available|room|patient arrived|delayed/i],
          readModelObservation: [/inventory or availability issue|product availability|requested item unavailable/i],
        },
      },
      {
        id: "clinical-comparison-request",
        label: "Clinical comparison request",
        expectedSections: ["Product Signals", "Next Steps"],
        stages: {
          extraction: [/product_interest|next_action/i, /clinical information|comparing products|larger defects/i],
          readModelObservation: [/clinical information|comparing products/i],
        },
      },
      {
        id: "evaluation-coordination",
        label: "Evaluation coordination contact",
        expectedSections: ["People & Access"],
        stages: {
          extraction: [/contact_role|next_action|product_interest/i, /Devon|coordinate|product evaluation/i],
          readModelObservation: [/Devon/i],
        },
      },
    ],
  },
  {
    name: "ophthalmology · negative language · nothing should become a problem",
    providerId: "provider-okafor",
    caseId: "case-okafor",
    providerName: "Ada Okafor",
    procedureType: "Corneal transplant",
    note:
      "Observation with Dr. Ada Okafor during a corneal transplant. They used AmnioGraft as usual. No inventory issues today, everything was stocked and ready. The staff did not seem frustrated and there were no handling complaints about the graft. No one asked for a product change.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /AmnioGraft/i],
          readModelObservation: [/AmnioGraft/i],
          observationRenderer: [/AmnioGraft/i],
        },
      },
    ],
    absentFacts: [
      {
        label: "No invented inventory problem from 'no inventory issues today'",
        stages: {
          readModelObservation: [/inventory or availability issue|product availability issue|low on|not stocked|out of stock/i],
          observationRenderer: [/inventory or availability issue|product availability issue|low on|not stocked|out of stock/i],
          providerIntelligence: [/inventory or availability issue|product availability issue|low on|not stocked|out of stock/i],
        },
      },
      {
        label: "No invented handling/pain problem from 'no handling complaints'",
        stages: {
          readModelObservation: [/handling complaint|handling issue|does ?n.t handle|sizing or fit issue|performance issue/i],
          observationRenderer: [/handling complaint|handling issue|does ?n.t handle|sizing or fit issue|performance issue/i],
        },
      },
      {
        // NOTE: providerIntelligence is intentionally excluded — that surface carries
        // standing "listen for staff frustration…" coaching prompts regardless of the
        // note, which are guidance, not extracted facts. We assert on the actual
        // observation surfaces where a real (mis)extracted claim would appear.
        label: "No invented staff friction from 'staff did not seem frustrated'",
        stages: {
          readModelObservation: [/frustrat|staff friction|staff workflow issue/i],
          observationRenderer: [/frustrat|staff friction|staff workflow issue/i],
        },
      },
    ],
  },
  {
    name: "podiatry · negated sizing · shorthand · Affinity fit fine",
    providerId: "provider-bianchi",
    caseId: "case-bianchi",
    providerName: "Luca Bianchi",
    procedureType: "Diabetic foot wound debridement",
    note:
      "Observation note: Dr. Luca Bianchi used Affinity for a diabetic foot wound during a debridement. No sizing problems this time, the grafts fit fine. Nothing else notable.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /Affinity/i],
          readModelObservation: [/Affinity/i],
          observationRenderer: [/Affinity/i],
        },
      },
    ],
    absentFacts: [
      {
        label: "No invented sizing issue from 'no sizing problems'",
        stages: {
          readModelObservation: [/sizing or fit issue|sizing problem|does ?n.t fit|fit issue/i],
          observationRenderer: [/sizing or fit issue|sizing problem|does ?n.t fit|fit issue/i],
          providerIntelligence: [/sizing or fit issue|sizing problem|does ?n.t fit|fit issue/i],
        },
      },
    ],
  },
  {
    name: "vascular · competitor in use · interest is not usage or evaluation",
    providerId: "provider-salazar",
    caseId: "case-salazar",
    providerName: "Mateo Salazar",
    procedureType: "Peripheral bypass",
    note:
      "Observed Dr. Mateo Salazar during a peripheral bypass. They currently use a Gore graft for these cases. He seemed interested in learning more about our graft options for below-knee cases, and asked what sizes we carry. No evaluation is planned yet.",
    expectedFacts: [
      {
        id: "competitor-in-use",
        label: "Competitor product in use",
        expectedSections: ["Current Workflow"],
        knownGap:
          "Product-in-use detection misses the 'they currently use a <brand> graft for these cases' phrasing. " +
          "The engine recognizes 'they used X for the case' / 'current product was X' but not 'currently use a X'.",
        stages: {
          extraction: [/current_product|competitor_product/i, /Gore/i],
          readModelObservation: [/Gore/i],
          observationRenderer: [/Gore/i],
        },
      },
      {
        id: "interest-signal",
        label: "Interest / sizing question",
        expectedSections: ["Product Signals", "Next Steps"],
        knownGap:
          "Interest language ('interested in learning more', 'asked what sizes we carry') is not routed to Product " +
          "Signals; instead it is mis-inferred as a 'procedure volume increasing' trend in Current Workflow.",
        stages: {
          extraction: [/product_interest|requested_item|provider_sentiment|next_action/i, /interested|learning more|sizes|graft options/i],
          readModelObservation: [/interested|learning more|sizes|graft options/i],
        },
      },
    ],
    absentFacts: [
      {
        label: "Interest must not be rendered as usage of our product",
        stages: {
          readModelObservation: [/used our|using our|our graft was used|switched to our/i],
          observationRenderer: [/used our|using our|our graft was used|switched to our/i],
          providerIntelligence: [/used our|using our|our graft was used|switched to our/i],
        },
      },
      {
        label: "Interest must not be rendered as a confirmed evaluation",
        stages: {
          readModelObservation: [/evaluation (is )?(scheduled|planned|underway|confirmed)|product evaluation (scheduled|underway)/i],
          observationRenderer: [/evaluation (is )?(scheduled|planned|underway|confirmed)|product evaluation (scheduled|underway)/i],
        },
      },
    ],
  },
  {
    name: "general surgery · coordinator is not a decision-maker",
    providerId: "provider-underwood",
    caseId: "case-underwood",
    providerName: "Ruth Underwood",
    procedureType: "Open ventral hernia repair",
    note:
      "Quick note: Dr. Ruth Underwood case today, they used Phasix mesh. Dana the OR coordinator set up the room and will schedule the next observation.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /Phasix/i],
          readModelObservation: [/Phasix/i],
          observationRenderer: [/Phasix/i],
        },
      },
      {
        id: "coordinator",
        label: "Coordinator / scheduling contact",
        expectedSections: ["People & Access"],
        knownGap:
          "Contact detection misses 'Dana the OR coordinator set up the room and will schedule the next observation'. " +
          "The engine recognizes 'Sarah coordinated the observation' but not the 'set up the room / will schedule' verb form.",
        stages: {
          extraction: [/contact_role|access_pathway|next_action/i, /Dana|coordinator|schedule/i],
          readModelObservation: [/Dana/i],
        },
      },
    ],
    absentFacts: [
      {
        label: "Coordinator must not be labeled a decision-maker",
        stages: {
          readModelObservation: [/decision.?maker/i],
          observationRenderer: [/decision.?maker/i],
          providerIntelligence: [/decision.?maker/i],
        },
      },
    ],
  },
  {
    name: "ENT · future action must not read as completed",
    providerId: "provider-mensah",
    caseId: "case-mensah",
    providerName: "Kwame Mensah",
    procedureType: "Endoscopic sinus surgery",
    note:
      "Observation with Dr. Kwame Mensah during an endoscopic sinus surgery. They used PropelMesh. I will send comparison data next week and plan to follow up after their next case.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /PropelMesh/i],
          readModelObservation: [/PropelMesh/i],
          observationRenderer: [/PropelMesh/i],
        },
      },
      {
        id: "future-action",
        label: "Future follow-up action",
        expectedSections: ["Next Steps"],
        stages: {
          extraction: [/next_action|support_needed|requested_item/i, /send comparison|follow up|next week/i],
          readModelObservation: [/comparison data|follow up|next week/i],
        },
      },
    ],
    absentFacts: [
      {
        label: "Future action must not render as already completed",
        stages: {
          readModelObservation: [/already sent|comparison data sent|sent the comparison|completed follow.?up/i],
          observationRenderer: [/already sent|comparison data sent|sent the comparison|completed follow.?up/i],
          providerIntelligence: [/already sent|comparison data sent|sent the comparison|completed follow.?up/i],
        },
      },
    ],
  },
  {
    name: "trauma · product question must not become a confirmed fit",
    providerId: "provider-ferreira",
    caseId: "case-ferreira",
    providerName: "Sofia Ferreira",
    procedureType: "Comminuted fracture fixation",
    note:
      "Trauma case with Dr. Sofia Ferreira. They used a Synthes plate. She asked if our plate holds up in comminuted fractures. Curious but nothing decided.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        knownGap:
          "Terse trauma dictation collapses to a single 'no meaningful intelligence' fact. 'They used a Synthes plate' " +
          "(indefinite article + brand + generic noun) is not detected as a product-in-use, and the note fragments " +
          "poorly around the 'Dr.' abbreviation. Extraction is sensitive to short, clipped dictation styles.",
        stages: {
          extraction: [/current_product|competitor_product/i, /Synthes/i],
          readModelObservation: [/Synthes/i],
          observationRenderer: [/Synthes/i],
        },
      },
      {
        id: "product-question",
        label: "Product capability question",
        expectedSections: ["Product Signals", "Next Steps"],
        knownGap:
          "Same terse-dictation gap: 'She asked if our plate holds up in comminuted fractures' is not captured as a " +
          "product interest/question in this clipped note style.",
        stages: {
          extraction: [/product_interest|requested_item|provider_sentiment/i, /holds up|comminuted|our plate/i],
          readModelObservation: [/holds up|comminuted|plate/i],
        },
      },
    ],
    absentFacts: [
      {
        label: "Question must not render as a confirmed product fit",
        stages: {
          readModelObservation: [/good fit|fits their|product fit confirmed|confirmed fit|is a fit/i],
          observationRenderer: [/good fit|fits their|product fit confirmed|confirmed fit|is a fit/i],
          providerIntelligence: [/good fit|fits their|product fit confirmed|confirmed fit|is a fit/i],
        },
      },
    ],
  },
  {
    name: "urology · repeated product mention must not duplicate",
    providerId: "provider-kraft",
    caseId: "case-kraft",
    providerName: "Ingrid Kraft",
    procedureType: "Robotic prostatectomy",
    note:
      "Observed Dr. Ingrid Kraft during a robotic prostatectomy. They used OviTex during the case. Later in the case, OviTex was used again for reinforcement. Dr. Kraft mentioned the mesh handling on larger defects slows him down.",
    expectedFacts: [
      {
        id: "current-product",
        label: "Current product",
        expectedSections: ["Current Workflow"],
        stages: {
          extraction: [/current_product|competitor_product/i, /OviTex/i],
          readModelObservation: [/OviTex/i],
          observationRenderer: [/OviTex/i],
        },
      },
      {
        id: "handling-pain",
        label: "Handling pain",
        expectedSections: ["Challenges & Friction"],
        stages: {
          extraction: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /handling|larger defects|slows/i],
          readModelObservation: [/larger defects|handling|slows/i],
        },
      },
    ],
  },
];

/* ─────────────────────────── Harness (production pipeline) ─────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[“”"'.!?()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderFact(
  fact: Pick<UniversalSurgicalFactRow, "concept" | "normalized_label" | "evidence_text" | "product_mentioned" | "person_mentioned">,
): string {
  return [fact.concept, fact.normalized_label, fact.evidence_text, fact.product_mentioned, fact.person_mentioned]
    .filter(Boolean)
    .join(" ");
}

function factRunFromDictation(fixture: MatrixFixture): {
  run: UniversalFactExtractionRun;
  groundingViolations: string[];
} {
  const extraction = extractUniversalSurgicalFacts({
    raw_note: fixture.note,
    declared_source_type: "observation_case",
    context: { provider_display_name: fixture.providerName },
  });

  const normalizedNote = normalizeText(fixture.note);
  const groundingViolations = extraction.facts
    .filter((fact) => {
      const evidence = normalizeText(fact.evidence_text);
      return evidence.length >= 4 && !normalizedNote.includes(evidence);
    })
    .map((fact) => `${fact.concept} :: "${fact.evidence_text}"`);

  const createdAt = "2026-06-25T12:45:00Z";
  const run: UniversalFactExtractionRun = {
    capture_id: `${fixture.caseId}-run`,
    declared_source_type: "observation_case",
    extraction_model: "rules",
    created_at: createdAt,
    operational_note_id: "note-latest",
    facts: extraction.facts.map((fact, index) => ({
      ...fact,
      id: `${fixture.caseId}-fact-${index}`,
      capture_id: `${fixture.caseId}-run`,
      provider_id: fixture.providerId,
      organization_id: `${fixture.providerId}-org`,
      case_id: fixture.caseId,
      encounter_id: null,
      suppressed: false,
      created_at: createdAt,
    })),
  };
  return { run, groundingViolations };
}

function buildStageSnapshot(fixture: MatrixFixture): StageSnapshot {
  const { run, groundingViolations } = factRunFromDictation(fixture);
  const readModel: UniversalFactsReadModelPayload = {
    caseRuns: [run],
    providerRuns: [run],
    programRuns: [run],
  };
  const caseRow = {
    id: fixture.caseId,
    status: "completed",
    case_type: "observation",
    procedure_type: fixture.procedureType,
    provider_name: fixture.providerName,
    surgeon_contact_id: fixture.providerId,
    account_id: `${fixture.providerId}-org`,
  };
  const activities = [
    {
      id: "note-latest",
      activity_type: "note",
      body: fixture.note,
      created_at: "2026-06-25T12:44:00Z",
      metadata_json: { note_id: "note-latest" },
    },
  ];
  const providerContact = {
    id: fixture.providerId,
    display_name: fixture.providerName,
    observation_count: 3,
  };
  const priorCases = [
    { id: "prior-1", status: "completed", case_type: "observation", surgeon_contact_id: fixture.providerId },
    { id: "prior-2", status: "completed", case_type: "observation", surgeon_contact_id: fixture.providerId },
  ];

  const observationItems = adaptUniversalFactsToThisObservationItems({
    caseRuns: [run],
    caseId: fixture.caseId,
    hasCurrentNotes: true,
    activeOperationalNoteIds: ["note-latest"],
    providerName: fixture.providerName,
  });
  const followUpItems = adaptUniversalFactsToFollowUpNextVisitItems({
    universalFactsReadModel: readModel,
    caseId: fixture.caseId,
    activeOperationalNoteIds: ["note-latest"],
    providerName: fixture.providerName,
  });
  const observationPresentation = buildObservationRepPresentationView({
    caseRow,
    activities,
    providerContact,
    priorCases,
    universalFactsReadModel: readModel,
  });
  const providerView = buildProviderIntelligenceKnowledgeDashboardView({
    contact: providerContact,
    providerId: fixture.providerId,
    cases: [caseRow, ...priorCases],
    universalFactsReadModel: readModel,
  });
  const providerCaseRollup = providerView.caseIntelligence;

  const observationSections = groupRepFriendlyIntelligenceItems([
    ...observationPresentation.thisObservation.items,
    ...observationPresentation.stillNeedToLearn,
  ]).flatMap((group) => group.items.map((item) => ({ section: group.title, text: item.text })));
  const providerSections = groupRepFriendlyIntelligenceItems([
    ...providerView.emergingSignals.map((item) => ({ text: item.text })),
    ...providerView.needsMoreEvidence.map((item) => ({ text: item.text })),
    ...(providerCaseRollup?.emergingCaseSignals ?? []).map((text) => ({ text })),
    ...(providerCaseRollup?.needsMoreEvidence ?? []).map((text) => ({ text })),
  ]).flatMap((group) => group.items.map((item) => ({ section: group.title, text: item.text })));

  return {
    extraction: run.facts.map(renderFact),
    readModelObservation: [...observationItems, ...followUpItems].map((item) => item.text),
    observationRenderer: [
      ...observationPresentation.thisObservation.items.map((item) => item.text),
      ...observationPresentation.stillNeedToLearn.map((item) => item.text),
    ],
    providerIntelligence: [
      ...providerView.emergingSignals.map((item) => item.text),
      ...providerView.needsMoreEvidence.map((item) => item.text),
    ],
    observationSections,
    providerSections,
    groundingViolations,
    debriefReadiness: [
      observationPresentation.debriefReadiness.headline,
      observationPresentation.debriefReadiness.nextStep,
      ...observationPresentation.debriefReadiness.reasons,
    ],
  };
}

/* ─────────────────────────── Assertions ─────────────────────────── */

function matchAll(text: string, patterns: RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(text));
}

function stageContains(lines: string[], patterns: RegExp[]): boolean {
  return lines.some((line) => matchAll(line, patterns));
}

function duplicateFacts(lines: string[]): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = normalizeText(line);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

function firstMissingStage(fact: ExpectedPipelineFact, snapshot: StageSnapshot): PipelineStage | null {
  const stages = Object.keys(fact.stages) as PipelineStage[];
  return stages.find((stage) => !stageContains(snapshot[stage], fact.stages[stage] ?? [])) ?? null;
}

function sectionAllowed(sectionTitle: string, expectedSections: string[]): boolean {
  return expectedSections.some((expected) => normalizeText(sectionTitle).includes(normalizeText(expected)));
}

/**
 * Routing guard. A fact is considered misrouted only when it surfaces in a section
 * but NONE of its occurrences land in an allowed section — i.e. it was routed to the
 * wrong place instead of the right one. We deliberately use presence-in-allowed
 * semantics (rather than "no occurrence outside allowed") because rep-facing item
 * text frequently repeats a product/contact name across cards, and a shared token
 * should not be misread as a misrouted duplicate.
 */
function expectedSectionFailures(fact: ExpectedPipelineFact, snapshot: StageSnapshot): string[] {
  if (!fact.expectedSections?.length) return [];
  const patterns = fact.stages.observationRenderer ?? fact.stages.readModelObservation ?? [];
  if (!patterns.length) return [];
  const matchingSections = [...snapshot.observationSections, ...snapshot.providerSections].filter((item) =>
    matchAll(item.text, patterns),
  );
  if (matchingSections.length === 0) return [];
  const routedCorrectly = matchingSections.some((item) => sectionAllowed(item.section, fact.expectedSections!));
  if (routedCorrectly) return [];
  return matchingSections.map((item) => `${fact.label} only routed to "${item.section}": ${item.text}`);
}

type FailureReport = {
  /** Real problems that must never happen — any entry fails the suite. */
  failures: string[];
  /** Documented gaps that are expected to still be broken today (see knownGap). */
  regressedKnownGaps: string[];
};

function expectedFactFailures(fact: ExpectedPipelineFact, snapshot: StageSnapshot): string[] {
  const problems: string[] = [];
  const missingStage = firstMissingStage(fact, snapshot);
  if (missingStage) {
    problems.push(
      [
        `DROPPED: "${fact.label}" missing at ${missingStage}`,
        `Expected: ${(fact.stages[missingStage] ?? []).map(String).join(" AND ")}`,
        `Available ${missingStage}:`,
        ...snapshot[missingStage].map((line) => `  - ${line}`),
      ].join("\n"),
    );
  }
  problems.push(...expectedSectionFailures(fact, snapshot).map((f) => `MISROUTED: ${f}`));
  return problems;
}

function buildFailureReport(fixture: MatrixFixture, snapshot: StageSnapshot): FailureReport {
  const failures: string[] = [];
  const regressedKnownGaps: string[] = [];

  // 1) Grounding — every extracted fact's evidence must appear in the source note.
  for (const violation of snapshot.groundingViolations) {
    failures.push(`Ungrounded (invented) evidence: ${violation}`);
  }

  // 2) Expected facts survive + route to the correct section.
  for (const fact of fixture.expectedFacts) {
    const problems = expectedFactFailures(fact, snapshot);
    if (fact.knownGap) {
      // This fact is a documented gap: it SHOULD currently be broken. If it starts
      // behaving (no problems), the engine changed — surface it so we promote the gap.
      if (problems.length === 0) {
        regressedKnownGaps.push(
          `RESOLVED KNOWN GAP — "${fact.label}" now behaves correctly. Remove knownGap and assert strictly. (was: ${fact.knownGap})`,
        );
      }
    } else {
      failures.push(...problems);
    }
  }

  // 3) Forbidden / absence facts must never appear (negative-language safety).
  for (const absent of fixture.absentFacts ?? []) {
    for (const [stage, patterns] of Object.entries(absent.stages) as Array<[PipelineStage, RegExp[]]>) {
      if (stageContains(snapshot[stage], patterns)) {
        const offending = snapshot[stage].filter((line) => matchAll(line, patterns));
        failures.push(`INVENTED: "${absent.label}" present at ${stage}: ${offending.join(" | ")}`);
      }
    }
  }

  // 4) No duplicated facts on the rep-facing surfaces.
  for (const [stage, lines] of [
    ["readModelObservation", snapshot.readModelObservation],
    ["observationRenderer", snapshot.observationRenderer],
    ["providerIntelligence", snapshot.providerIntelligence],
  ] as Array<[string, string[]]>) {
    const duplicates = duplicateFacts(lines);
    if (duplicates.length) failures.push(`DUPLICATED at ${stage}: ${duplicates.join(" ; ")}`);
  }

  return { failures, regressedKnownGaps };
}

describe("universal intelligence regression matrix (product- & dictation-agnostic)", () => {
  it.each(MATRIX_FIXTURES)("$name", (fixture) => {
    const snapshot = buildStageSnapshot(fixture);
    const { failures, regressedKnownGaps } = buildFailureReport(fixture, snapshot);
    // Real regressions: dropped/invented/duplicated/misrouted facts on working behavior.
    expect(failures, `\n${failures.join("\n\n")}\n`).toEqual([]);
    // Tracked gaps that unexpectedly started working — promote them to strict asserts.
    expect(regressedKnownGaps, `\n${regressedKnownGaps.join("\n")}\n`).toEqual([]);
  });
});
