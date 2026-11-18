import { describe, expect, it } from "vitest";
import { buildPrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import { buildPrepareSuggestedDiscovery } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import { buildPrepareSuggestedOpening } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedOpening";
import { assessEngagementWizardPrepReadiness } from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";
import { buildIntroCallCommercializationSignals } from "@/lib/surgical-sales/engagements/buildIntroCallCommercializationSignals";
import { buildIntroCallFutureObservationGoals } from "@/lib/surgical-sales/engagements/buildIntroCallFutureObservationGoals";
import { buildPrepareSuggestedTalkingPoints } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import { buildPrepareRisksBarriers } from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { buildPrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { INTRO_CALL_SUCCESS_OUTCOMES } from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import { INTRO_CALL_START_MISSION_OBJECTIVE } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { buildEngagementPrepModeView } from "@/lib/surgical-sales/engagements/engagementPrepMode";

const emptyIntel: PrepareKnownIntelligence = { bullets: [], last_key_insight: null };

function introPrepFlags(
  mode: Parameters<typeof buildEngagementPrepModeView>[0]["prepMode"],
  opts?: { productLine?: string | null; providerSpecialty?: string | null },
) {
  return buildEngagementPrepModeView({
    engagementType: "intro_call",
    prepMode: mode,
    productLine: opts?.productLine,
    providerSpecialty: opts?.providerSpecialty ?? "General Surgery",
  }).generation;
}

function smithProvider() {
  return {
    provider_specialty: "General Surgery",
    provider_procedure_focus: "Robotic ventral & incisional hernia",
    provider_competitive_products: "Medtronic Symbotic workflow",
    provider_current_vendors: "Intuitive Xi; Medtronic mesh",
    provider_evaluation_openness: "Will trial if OR time neutral",
    provider_or_team_dynamics: "Charge RN controls tray builds; robotics coordinator gates observation",
    access_notes: "Text coordinator first — surgeon rarely answers between cases",
    relationship_strength: "medium",
  };
}

function patelProvider() {
  return {
    provider_specialty: "Wound Care",
    provider_product_interests: "Advanced biologics for DFU",
    provider_competitive_products: "Organogenesis & MiMedx dominate committee",
    provider_evaluation_openness: "High — if VAC-compatible",
    relationship_strength: "strong",
  };
}

function johnsonProvider() {
  return {
    provider_specialty: "Orthopedics",
    provider_competitive_products: "Stryker ankle; DePuy VARIAX",
    provider_evaluation_openness: "Cautious — purchasing wants sterile field comparison",
    provider_preference_card_signals: "ASC preference cards frozen until Q3 vendor fair",
    relationship_strength: "weak",
  };
}

describe("Prepare For Meeting rule engines", () => {
  it("talking points differ by provider specialty and product line", () => {
    const smith = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "observation_request",
      productLine: "ACSIS",
      opportunityStage: "evaluation_active",
      knownIntelligence: buildPrepareKnownIntelligence({
        provider: smithProvider(),
        snapshot: buildProviderIntelligenceSnapshot(smithProvider(), "smith"),
      }),
      engagement: {},
    });

    const patel = buildPrepareSuggestedTalkingPoints({
      specialty: "Wound Care",
      engagementType: "office_visit_360",
      productLine: "BioTissue",
      opportunityStage: "clinical_validation",
      knownIntelligence: buildPrepareKnownIntelligence({
        provider: patelProvider(),
        snapshot: buildProviderIntelligenceSnapshot(patelProvider(), "patel"),
      }),
      engagement: {},
    });

    expect(smith.points.some((p) => /ventral|fixation|minimally invasive|hernia/i.test(p))).toBe(true);
    expect(patel.points.some((p) => /biologic|NPWT|wound|graft/i.test(p))).toBe(true);
    expect(smith.points.join("|")).not.toEqual(patel.points.join("|"));
    expect(smith.context_label).toMatch(/ACSIS/i);
    expect(patel.context_label).toMatch(/BioTissue/i);
    smith.points.forEach((p) => {
      expect(p).not.toMatch(/best-in-class|value proposition|peer utilization|Align to stated/i);
      expect(p).not.toMatch(/^Competitive position:/i);
    });
  });

  it("talking points are clinically aware with workflow-focused discussion paths", () => {
    const intel = buildPrepareKnownIntelligence({
      provider: smithProvider(),
      snapshot: buildProviderIntelligenceSnapshot(smithProvider(), "smith"),
    });
    const points = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: "ACSIS",
      opportunityStage: "discovery",
      knownIntelligence: intel,
      engagement: {},
    });
    expect(points.points.length).toBeGreaterThan(2);
    expect(points.points.length).toBeLessThanOrEqual(6);
    expect(
      points.points.some((p) =>
        /ventral|hernia|fixation|minimally invasive|OR sequence|observation access|procedure mix/i.test(p),
      ),
    ).toBe(true);
    expect(
      points.points.some((p) =>
        /Symbotic|closure|Incumbent fixation|Documented procedure focus|product-relevant workflow/i.test(p),
      ),
    ).toBe(true);
    const joined = points.points.join(" ").toLowerCase();
    const workflowHits = (joined.match(/workflow/g) || []).length;
    expect(workflowHits).toBeLessThan(4);
  });

  it("intro call without product focus stays workflow-generic not hernia-specific", () => {
    const goal = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: null,
      knownIntelligence: emptyIntel,
    });
    const discovery = buildPrepareSuggestedDiscovery({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: null,
      knownIntelligence: emptyIntel,
    });
    const talking = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: null,
      knownIntelligence: emptyIntel,
    });
    const opening = buildPrepareSuggestedOpening({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: null,
      knownIntelligence: emptyIntel,
    });
    const obsGoals = buildIntroCallFutureObservationGoals({
      providerSpecialty: "General Surgery",
      productLine: null,
      knownIntelligence: emptyIntel,
    });
    const signals = buildIntroCallCommercializationSignals({
      providerSpecialty: "General Surgery",
      productLine: null,
      knownIntelligence: emptyIntel,
    });

    const joined = [
      goal.goal,
      goal.why,
      discovery.questions.join(" "),
      talking.points.join(" "),
      opening.statement ?? "",
      obsGoals.items.join(" "),
      signals.signals.map((s) => s.text).join(" "),
    ].join(" ");

    expect(joined).not.toMatch(
      /\bhernia\b|abdominal wall|fixation|mesh|tack|ventral|incisional|closure device|fascial reinforcement/i,
    );
    expect(joined).toMatch(
      /majority of your operative volume|comfortable having us observe|pay attention|workflow friction/i,
    );
  });

  it("intro call with product focus uses the fixed pathway mission objective", () => {
    const goal = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
      dominantPrep: introPrepFlags("product_exploration", { productLine: "ACSIS" }),
    });
    expect(goal.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(goal.goal).toMatch(/observe their cases|products could fit/i);
  });

  it("intro call success outcomes frame commercialization progression", () => {
    expect(INTRO_CALL_SUCCESS_OUTCOMES).toHaveLength(7);
    const joined = INTRO_CALL_SUCCESS_OUTCOMES.join(" ");
    expect(joined).toMatch(/procedural workflow|case mix|OR workflow inefficien/i);
    expect(joined).toMatch(/observation|evaluation openness|case complexity|Observation focus/i);
  });

  it("suggested goals are SMART — specific, measurable, procedural, with a concrete horizon", () => {
    const intro = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
      dominantPrep: introPrepFlags("product_exploration", { productLine: "ACSIS" }),
    });
    const observation = buildPrepareSuggestedGoal({
      engagementType: "observation_request",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
    });
    const office = buildPrepareSuggestedGoal({
      engagementType: "office_visit_360",
      providerSpecialty: "Wound Care",
      opportunityStage: "clinical_validation",
      productLine: "BioTissue",
      knownIntelligence: emptyIntel,
    });

    expect(intro.goal).not.toMatch(
      /establish relationship|product\/procedure fit|openness to evaluating|limited workflow review|run a focused demo/i,
    );
    expect(intro.why).toMatch(
      /workflow through observation|permission from the surgeon|logistics handled separately/i,
    );
    expect(intro.why).not.toMatch(
      /Built for|product line|opportunity context|relationship building|product tour|Map procedural/i,
    );
    expect(intro.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(intro.goal).toMatch(/observe their cases|products could fit/i);
    expect(intro.goal).not.toMatch(/within \d+ days/i);

    expect(observation.goal).toMatch(/OR observation/i);
    expect(observation.goal).toMatch(/days/i);
    expect(observation.goal).toMatch(/OR observation|target clinical workflow|focused on/i);

    expect(office.goal).toMatch(/hands-on|session/i);
    expect(office.goal).toMatch(/days/i);
    expect(intro.goal).not.toEqual(observation.goal);

    const demo = buildPrepareSuggestedGoal({
      engagementType: "product_demo",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
    });
    expect(demo.why).toMatch(/procedural fit|formal evaluation/i);
    expect(demo.why).not.toMatch(/Incorporates|References stated/i);
  });

  it("intro goal references competitor when intelligence documents competitive usage", () => {
    const intel = buildPrepareKnownIntelligence({
      provider: smithProvider(),
      snapshot: buildProviderIntelligenceSnapshot(smithProvider(), "smith"),
    });
    const goal = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: "ACSIS",
      knownIntelligence: intel,
      intentionalProductFocus: true,
      dominantPrep: introPrepFlags("product_exploration", { productLine: "ACSIS" }),
    });
    expect(goal.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(goal.goal).toMatch(/observe their cases/i);
  });

  it("objectives stay single-domain and single-purpose (no stacked specialties)", () => {
    const ortho = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "Orthopedics",
      opportunityStage: "discovery",
      productLine: "Skeletal Dynamics",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
      dominantPrep: introPrepFlags("product_exploration", {
        productLine: "Skeletal Dynamics",
        providerSpecialty: "Orthopedics",
      }),
    });
    expect(ortho.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(ortho.goal).not.toMatch(/abdominal|hernia|ventral|wound care|biologic/i);

    const broad = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: null,
      knownIntelligence: emptyIntel,
      dominantPrep: introPrepFlags("general_discovery"),
    });
    expect(broad.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
  });

  it("intro call goals use the fixed pathway mission across specialties", () => {
    const gs = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      dominantPrep: introPrepFlags("specialty_workflow_discovery"),
    });
    expect(gs.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);

    const wound = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "Wound Care",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      dominantPrep: introPrepFlags("specialty_workflow_discovery", { providerSpecialty: "Wound Care" }),
    });
    expect(wound.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);

    const woundWhy = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "Wound Care",
      opportunityStage: "discovery",
      productLine: "BioTissue",
      knownIntelligence: emptyIntel,
    });
    expect(woundWhy.why).toMatch(/observation|procedural intelligence|evaluation pathway/i);
    expect(woundWhy.why).not.toMatch(/relationship building|product tour/i);
  });

  it("suggested discovery questions vary by specialty and product, max five", () => {
    const acsis = buildPrepareSuggestedDiscovery({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: "ACSIS",
      opportunityStage: "discovery",
      providerRelationshipStage: "prospect",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
    });
    const bio = buildPrepareSuggestedDiscovery({
      engagementType: "intro_call",
      providerSpecialty: "Wound Care",
      productLine: "BioTissue",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
    });

    expect(acsis.questions.length).toBeGreaterThan(0);
    expect(acsis.questions.length).toBeLessThanOrEqual(5);
    expect(acsis.questions.every((q) => q.endsWith("?"))).toBe(true);
    expect(
      acsis.questions.some((q) =>
        /observe one of your upcoming hernia|fixation workflow|ventral|incisional/i.test(q),
      ),
    ).toBe(true);
    expect(bio.questions.some((q) => /biologic|wound|observe|pay attention|workflow/i.test(q))).toBe(
      true,
    );
    acsis.questions.forEach((q) => {
      expect(q).not.toMatch(/clinical priorities rank|how satisfied are you with vendors|pain points/i);
    });
    expect(acsis.questions.join("|")).not.toEqual(bio.questions.join("|"));
    acsis.questions.forEach((q) => {
      expect(q).not.toMatch(/excited to|best-in-class|partner with you/i);
    });
  });

  it("intro call talking points emphasize workflow, observation pathway, and barriers", () => {
    const points = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: "ACSIS",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      engagement: {},
    });
    expect(points.points.length).toBeGreaterThan(3);
    expect(points.points.length).toBeLessThanOrEqual(6);
    const joined = points.points.join(" ");
    expect(joined).toMatch(/ventral|incisional hernia workflow/i);
    expect(joined).toMatch(/OR workflow inefficien|fixation|closure decision/i);
    expect(joined).toMatch(/Committee or purchasing|evaluation case profile|fixation/i);
    expect(joined).toMatch(
      /Committee or purchasing|Product selection influences|workflow alignment|evaluation readiness/i,
    );
    expect(joined).not.toMatch(/value proposition|best-in-class|pain points|relationship building/i);
  });

  it("intro call commercialization signals tag observable evaluatable adoptable paths", () => {
    const intel = buildPrepareKnownIntelligence({
      provider: smithProvider(),
      snapshot: buildProviderIntelligenceSnapshot(smithProvider(), "smith"),
    });
    const signals = buildIntroCallCommercializationSignals({
      providerSpecialty: "General Surgery",
      productLine: "ACSIS",
      knownIntelligence: intel,
      provider: smithProvider(),
    });
    expect(signals.title).toMatch(/Potential signals to validate/i);
    expect(signals.signals.length).toBeGreaterThan(3);
    expect(signals.signals.some((s) => s.pathway === "observable")).toBe(true);
    expect(signals.signals.some((s) => s.pathway === "evaluatable")).toBe(true);
    expect(signals.signals.some((s) => s.pathway === "adoptable")).toBe(true);
    const joined = signals.signals.map((s) => s.text).join(" ");
    expect(joined).toMatch(/volume|OR access|workflow|evaluation|alignment|responsiveness/i);
    expect(joined).toMatch(/coordinator|fixation|trial/i);
  });

  it("intro call future observation goals cover pathway planning", () => {
    const goals = buildIntroCallFutureObservationGoals({
      providerSpecialty: "General Surgery",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
    });
    expect(goals.items.length).toBeGreaterThan(3);
    expect(goals.items.length).toBeLessThanOrEqual(7);
    const joined = goals.items.join(" ");
    expect(joined).toMatch(/procedures most suitable for observation|open to observation/i);
    expect(joined).toMatch(/pay attention|workflow friction|noticed during observation/i);
    expect(joined).toMatch(/observation cadence|timeline for possible/i);
    expect(joined).toMatch(/highest-volume cases|surgeon wants noticed/i);
  });

  it("intro call prep branches on product selection for workflow guidance", () => {
    const neutral = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: null,
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      engagement: {},
    });
    expect(neutral.points.join(" ")).toMatch(/comfortable having us observe|pay attention|workflow friction/i);
    expect(neutral.points.join(" ")).not.toMatch(/fixation workflow and closure|bougie calibration|hernia/i);

    const acsis = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: "ACSIS",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
      dominantPrep: introPrepFlags("product_exploration", { productLine: "ACSIS" }),
      engagement: {},
    });
    expect(acsis.points.join(" ")).toMatch(/fixation workflow and closure inefficiencies/i);

    const endolumik = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: "Endolumik",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      engagement: {},
    });
    expect(endolumik.points.join(" ")).toMatch(/bougie calibration|foregut workflow/i);

    const acsisDiscovery = buildPrepareSuggestedDiscovery({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: "ACSIS",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
    });
    expect(acsisDiscovery.questions.some((q) => /fixation workflow|ventral/i.test(q))).toBe(true);

    const endolumikDiscovery = buildPrepareSuggestedDiscovery({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: "Endolumik",
      opportunityStage: "discovery",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
    });
    expect(endolumikDiscovery.questions.some((q) => /bougie|foregut|sizing/i.test(q))).toBe(true);
  });

  it("intro call discovery questions are operational and OR-centric", () => {
    const qs = buildPrepareSuggestedDiscovery({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: null,
      opportunityStage: "discovery",
      providerRelationshipStage: "prospect",
      knownIntelligence: emptyIntel,
    });
    expect(qs.questions.length).toBeGreaterThan(0);
    expect(qs.questions.length).toBeLessThanOrEqual(6);
    const joined = qs.questions.join(" ");
    expect(joined).toMatch(/comfortable having us observe|pay attention|workflow friction/i);
    expect(joined).toMatch(/majority of your operative volume|operative volume/i);
    expect(joined).not.toMatch(
      /worth your time|worth scheduling|pain points|ventral|incisional|hernia|mesh|fixation|credential|coordinator/i,
    );
  });

  it("suggested opening is conversational and clinically aware", () => {
    const opening = buildPrepareSuggestedOpening({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: null,
      opportunityStage: "discovery",
      providerRelationshipStage: "prospect",
      relationshipStrength: "medium",
      knownIntelligence: emptyIntel,
      dominantPrep: introPrepFlags("general_discovery"),
    });
    expect(opening.statement).toMatch(
      /procedures you run|workflow creates friction|observation would help/i,
    );
    expect(opening.statement).toMatch(/workflow|observation/i);
    expect(opening.statement).not.toMatch(
      /excited to|best-in-class|partner with you|early in the relationship|hernia|ventral|fixation/i,
    );
    if (opening.alternate) {
      expect(opening.alternate).toMatch(/observation|workflow|evaluation activity makes sense/i);
    }
    expect(opening.statement.length).toBeGreaterThan(30);
    expect(opening.statement.length).toBeLessThan(240);
  });

  it("evaluation-planned stage yields a pilot-case objective", () => {
    const goal = buildPrepareSuggestedGoal({
      engagementType: "product_demo",
      providerSpecialty: "General Surgery",
      opportunityStage: "evaluation_planned",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
    });
    expect(goal.goal).toMatch(/pilot|evaluation case/i);
    expect(goal.goal).toMatch(/ACSIS|workflow/i);
  });

  it("risks render from provider intelligence and stage", () => {
    const smithSnap = buildProviderIntelligenceSnapshot(smithProvider(), "smith");
    const intel = buildPrepareKnownIntelligence({ provider: smithProvider(), snapshot: smithSnap });
    const risks = buildPrepareRisksBarriers({
      provider: smithProvider(),
      snapshot: smithSnap,
      knownIntelligence: intel,
      opportunity: { stage: "evaluation_active" },
      engagement: { adoption_signals_to_watch: "Coordinator pushback on tray change" },
      engagementType: "observation_request",
    });

    expect(risks.risks.length).toBeGreaterThan(0);
    expect(risks.risks.some((r) => r.key === "limited_or_access" || r.key === "competitor_loyalty")).toBe(
      true,
    );
    risks.risks.forEach((r) => {
      expect(r.label.length).toBeGreaterThan(10);
      expect(r.label.length).toBeLessThan(120);
    });
  });

  it("johnson shows weak relationship and evaluation stall signals", () => {
    const snap = buildProviderIntelligenceSnapshot(johnsonProvider(), "johnson");
    const risks = buildPrepareRisksBarriers({
      provider: johnsonProvider(),
      snapshot: snap,
      knownIntelligence: buildPrepareKnownIntelligence({
        provider: johnsonProvider(),
        snapshot: snap,
      }),
      opportunity: { stage: "evaluation_planned" },
      engagement: {},
      engagementType: "product_demo",
      lastPriorEngagement: {
        engagement_date: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      },
    });

    expect(risks.risks.some((r) => r.key === "weak_relationship" || r.key === "evaluation_stalled")).toBe(
      true,
    );
  });
});

describe("Engagement wizard preparation readiness", () => {
  it("rates minimal, solid, and strong from operational signals", () => {
    const empty = assessEngagementWizardPrepReadiness({
      isStrategic: true,
      engagementType: "intro_call",
      workflowDraft: {},
      basicsProductLine: "",
      suggestContext: {},
    });
    expect(empty.level).toBe("minimal");
    expect(empty.level_label).toBe("Minimal");

    const solid = assessEngagementWizardPrepReadiness({
      isStrategic: true,
      engagementType: "intro_call",
      workflowDraft: {
        observation_goal: "Confirm monthly lap ventral volume within 30 days.",
        pre_observation_impact_opening_statement: "Wanted to understand your hernia workflow today.",
      },
      basicsProductLine: "ACSIS",
      suggestContext: { productLine: "ACSIS" },
    });
    expect(solid.level).toBe("solid");

    const strong = assessEngagementWizardPrepReadiness({
      isStrategic: true,
      engagementType: "product_demo",
      workflowDraft: {
        observation_goal: "Validate procedural fit with one pilot case in 21 days.",
        pre_observation_probes: "• What fixation workflow are you using?",
        pre_observation_impact_opening_statement: "Wanted to see how you handle mesh steps today.",
      },
      basicsProductLine: "",
      suggestContext: { opportunityProductLine: "BioTissue" },
    });
    expect(strong.level).toBe("strong");
    expect(strong.signals.filter((s) => s.met).length).toBeGreaterThanOrEqual(3);
  });
});

describe("Prepare For Meeting clipboard format", () => {
  it("includes provider and engagement type in header", async () => {
    const { formatTalkingPointsForClipboard } = await import(
      "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints"
    );
    const text = formatTalkingPointsForClipboard({
      points: ["Point A", "Point B"],
      providerName: "Dr. Smith",
      engagementTypeLabel: "Observation Access Request",
    });
    expect(text).toContain("Dr. Smith");
    expect(text).toContain("Observation Access Request");
    expect(text).toMatch(/• Point A/);
  });
});
