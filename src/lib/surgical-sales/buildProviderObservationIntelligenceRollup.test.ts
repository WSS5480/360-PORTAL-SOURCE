import { describe, expect, it } from "vitest";

import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";
import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";
import { buildProviderIntelligenceFieldBriefingStory } from "./buildProviderIntelligenceFieldBriefingStory";
import { buildProviderFieldIntelligenceModel } from "./providerFieldIntelligenceModel";
import { buildProviderIntelligenceReferenceView } from "./buildProviderIntelligenceReferenceView";
import { resolveNormalizedObservationPermission } from "./observationPermissionModel";
import { buildProviderCaseIntelligenceRollup } from "./buildProviderObservationIntelligenceRollup";
import { BRIEFING_ENGINE_TERM_PATTERN } from "./observationCaseBriefingPresentation";

const RAW_PROVIDER_ROLLUP_LABELS = [
  "Provider pain points",
  "Staff pain points",
  "Workflow bottlenecks",
  "Current products used",
  "Not ready for debrief",
  "Continue observations until repeated patterns are clear",
  "Current likely angle: visualization/fixation workflow",
];

function expectNoRawRollupLabels(lines: string[]) {
  const joined = lines.join("\n");
  for (const label of RAW_PROVIDER_ROLLUP_LABELS) {
    expect(joined).not.toContain(label);
  }
  expect(joined).not.toMatch(BRIEFING_ENGINE_TERM_PATTERN);
}

const DR_APPLE_SAVED_CONTACT = {
  id: "provider-apple",
  first_name: "Michael",
  last_name: "Apple",
  provider_observation_feasibility: "approved",
  provider_observation_access_path:
    "Observation interest: Yes. Observation approval: No. Access path identified: Partial. Blocker: Approval pathway",
  provider_observation_credentialing_needed: "required",
  provider_credentialing_status: "Vendor credentialing required before OR access",
  provider_observation_coordinator_contact: "Karen — contact info missing",
  provider_scheduling_contact: "And Follow appears involved in scheduler on the provider side.",
  provider_procedure_focus:
    "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing procedure volume",
  provider_competitive_products: "Bard Mesh — needs confirmation during observation",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: {
      source_type: "intro_call",
      source_label: "Intro call debrief",
      source_engagement_id: "eng-apple-intro",
      lifecycle_state: "validated",
      validated_at: "2026-06-01T12:00:00Z",
      evidence_text: "He gave me approval to come observe cases",
    },
    provider_observation_coordinator_contact: {
      source_type: "intro_call",
      source_label: "Intro call debrief",
      source_engagement_id: "eng-apple-intro",
      lifecycle_state: "confirmed",
      evidence_text:
        "Karen from his office handles most of the scheduling coordination and works closely with the hospital OR scheduling team, but I do not have her contact information yet.",
    },
    provider_procedure_focus: {
      source_type: "intro_call",
      lifecycle_state: "confirmed",
      evidence_text:
        "Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to.",
    },
    provider_competitive_products: {
      source_type: "intro_call",
      lifecycle_state: "captured",
      evidence_text:
        "He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.",
    },
  },
};

const DR_APPLE_ENGAGEMENTS = [
  {
    id: "eng-apple-intro",
    engagement_type: "intro_call",
    status: "completed",
    debrief_completed: true,
    debrief_completed_at: "2026-06-01T14:00:00Z",
  },
] as never[];

const DR_APPLE_INCOMPLETE_OBSERVATION_CASE = {
  id: "case-apple-obs-1",
  case_type: "observation",
  status: "confirmed",
  surgeon_contact_id: "provider-apple",
  live_observation_competitors: "They were using Bard Mesh again",
  live_observation_workflow:
    "There were a couple points where they spent extra time getting a better view before placing fixation",
  live_observation_product_fit:
    "The early opportunity may be around visualization and fixation workflow",
  live_observation_staff_process: "The team seemed organized",
};

describe("Provider case intelligence rollup", () => {
  it("aggregates incomplete observation case note signals for provider tab", () => {
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [DR_APPLE_INCOMPLETE_OBSERVATION_CASE],
    });

    expect(rollup?.visible).toBe(true);
    expect(rollup?.observationProgressLabel).toBe("0 of 5 observation cases complete");
    expect(rollup?.capturedNotesLabel).toBe("1 case note captured");
    expect(rollup?.evidenceMaturityLabel).toBe("Early case signals");
    expect(rollup?.maturityPill).toBe("Early signals");
    const emergingSignals = rollup?.emergingCaseSignals ?? [];
    expect(emergingSignals.length).toBeGreaterThan(0);
    expect(emergingSignals.join("\n")).toMatch(/Bard Mesh/i);
    expect(emergingSignals.join("\n")).not.toMatch(/in \d+ completed case/i);
    expect(emergingSignals.join("\n")).not.toMatch(/Staff frustrations related to workflow delays/i);
    expect(rollup?.needsMoreEvidence.length).toBeGreaterThan(0);
    expect(
      rollup?.needsMoreEvidence.some((gap) =>
        /listen(ing)? for provider frustration/i.test(gap),
      ),
    ).toBe(true);
    expect(
      rollup?.needsMoreEvidence.some((gap) =>
        /watch for workflow delays|friction points|determine whether visualization before fixation repeats/i.test(
          gap,
        ),
      ),
    ).toBe(true);
    expectNoRawRollupLabels(rollup?.needsMoreEvidence ?? []);
    expect(rollup?.observationCaseNoteExcerpt).toBe(
      "1 case note captured · not yet counted as a completed observation",
    );
    expect(rollup?.debriefImplication.length).toBeGreaterThan(0);
    expect(rollup?.debriefImplication.some((line) => /provider frustrations still unknown/i.test(line))).toBe(
      true,
    );
    expectNoRawRollupLabels(rollup?.debriefImplication ?? []);
    expect(rollup?.detailsLabel).toBe("View case details");
    expect(rollup?.productEvidence?.maturity).toBe("incomplete_case_note");
    expect(rollup?.detailsHref).toBe("/portal/sales/cases/case-apple-obs-1");
  });

  it("updates provider intelligence gaps and field brief when observation note confirms product use", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      engagements: DR_APPLE_ENGAGEMENTS,
      cases: [DR_APPLE_INCOMPLETE_OBSERVATION_CASE],
    });

    const gapText = view.needsMoreEvidence.map((chip) => `${chip.text} ${chip.description ?? ""}`).join("\n");
    // Current-case captures reframe baseline prompts (post-capture still-need fix):
    // product identified → recurrence/future-looking prompts instead of generic asks.
    expect(gapText).toMatch(
      /continue listening for provider frustration|determine whether visualization before fixation repeats|listen for provider frustration|watch for workflow delays/i,
    );
    expect(gapText).not.toMatch(/Confirm product usage during first observation/i);
    expect(gapText).not.toMatch(/Current products used/i);
    expectNoRawRollupLabels(view.caseIntelligence?.needsMoreEvidence ?? []);

    const emergingText = view.emergingSignals.map((chip) => chip.text).join("\n");
    expect(emergingText).toMatch(/ventral hernia|abdominal wall reconstruction/i);
    expect(emergingText).not.toMatch(/Observation approval confirmed/i);
    expect(emergingText).not.toMatch(/Scheduler referenced/i);

    const commercialText = view.commercialMeaning.map((chip) => chip.text).join("\n");
    expect(commercialText).toMatch(/Debrief not ready yet/i);

    const brief = view.fieldBrief.join(" ");
    expect(brief).toMatch(/current observation case note has captured Bard Mesh use/i);
    expect(brief).toMatch(/case has not been marked complete/i);
    expect(brief).not.toMatch(/needs confirmation during observation/i);

    expect((view.caseIntelligence?.emergingCaseSignals ?? []).join("\n")).not.toMatch(
      /in \d+ completed case/i,
    );
    const productCard = view.fieldEvidence.find((card) => card.title === "Product Interest");
    expect(productCard?.excerpt).toMatch(/captured in the current case note/i);
    const noteCard = view.fieldEvidence.find((card) => card.title === "Observation");
    expect(noteCard?.excerpt).toMatch(/not yet counted as a completed observation/i);
  });

  it("uses observed-in-case wording when one observation case is complete", () => {
    const completedCase = { ...DR_APPLE_INCOMPLETE_OBSERVATION_CASE, status: "completed" };
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [completedCase],
    });
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      engagements: DR_APPLE_ENGAGEMENTS,
      cases: [completedCase],
    });

    expect(rollup?.evidenceMaturityLabel).toBe("Observed in 1 completed case");
    const emergingSignals = rollup?.emergingCaseSignals ?? [];
    expect(emergingSignals).toEqual(
      expect.arrayContaining([
        "Bard Mesh was used during the case in 1 completed case",
        "Staff appeared organized",
      ]),
    );
    expect(emergingSignals.join("\n")).toMatch(
      /Extra time was spent improving visualization before fixation in 1 completed case/i,
    );
    expect(emergingSignals.join("\n")).not.toMatch(/frustration during cases/i);
    expect(emergingSignals.join("\n")).not.toMatch(/concern around/i);
    expect(
      emergingSignals.every((line) =>
        /was used during|appeared organized|Extra time was spent|product opening/i.test(line),
      ),
    ).toBe(true);
    expect(rollup?.needsMoreEvidence.length).toBeLessThanOrEqual(3);
    expectNoRawRollupLabels(rollup?.needsMoreEvidence ?? []);
    // Bard Mesh is already captured in this case, so the product-identification
    // baseline prompt is replaced by a recurrence-focused prompt (post-capture fix).
    expect(rollup?.needsMoreEvidence.join("\n")).not.toMatch(/identify which products are used/i);
    expect(rollup?.needsMoreEvidence[0]).toMatch(
      /determine whether visualization before fixation repeats/i,
    );
    expect(view.pulse.biggestUnknown).toBe(rollup?.needsMoreEvidence[0]);
    expectNoRawRollupLabels(rollup?.debriefImplication ?? []);
    expect(rollup?.observationCaseNoteExcerpt).toBe("1 observation case complete · 1 case note captured");

    const productCard = view.fieldEvidence.find((card) => card.title === "Product Interest");
    expect(productCard?.excerpt).toMatch(
      /Bard Mesh was observed in 1 observation case\. Confirm whether usage is consistent across additional cases/i,
    );

    const brief = view.fieldBrief.join(" ");
    expect(brief).toMatch(/One completed observation has captured Bard Mesh use/i);
    expect(brief).toMatch(/Observation access is approved, and scheduling is coordinated through/i);
    expect(brief).not.toMatch(/· Scheduler ·/i);
    expect(brief).not.toMatch(/342343242/i);
    expect(brief).not.toMatch(/^John has confirmed observation approval/i);

    expect(view.showIntelChipGrid).toBe(false);
    expect(view.needsMoreEvidence.find((chip) => /confirm current product use/i.test(chip.text))).toBeUndefined();
  });

  it("uses specific provider frustration context in emerging signals when evidence includes it", () => {
    const completedCase = {
      ...DR_APPLE_INCOMPLETE_OBSERVATION_CASE,
      status: "completed",
      live_observation_clinical_pain_points:
        "Provider showed frustration getting visualization right before fixation",
    };
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [completedCase],
    });

    const signals = (rollup?.emergingCaseSignals ?? []).join("\n");
    expect(signals).toMatch(
      /Michael Apple expressed frustration during visualization\/fixation decision-making/i,
    );
    expect(signals).toMatch(/in 1 completed case/i);
    expect(signals).not.toMatch(/frustration around frustration/i);
    expect(signals).not.toMatch(/concern around/i);
  });

  it("shows Bard Mesh in emerging signals when case row hints product use without product_in_use finding id", () => {
    const completedCase = {
      id: "case-apple-obs-2",
      case_type: "observation",
      status: "completed",
      live_observation_competitors: "Still using Bard Mesh on hernia cases",
    };
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [completedCase],
    });

    expect(rollup?.emergingCaseSignals).toEqual(
      expect.arrayContaining(["Bard Mesh was used during the case in 1 completed case"]),
    );
  });

  it("aligns provider still missing with observation still need to learn for the same case", () => {
    const caseRow = DR_APPLE_INCOMPLETE_OBSERVATION_CASE;
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [caseRow],
    });
    const observation = buildObservationRepPresentationView({
      caseRow,
      providerContact: DR_APPLE_SAVED_CONTACT,
      priorCases: [],
    });

    const providerStillMissing = rollup?.needsMoreEvidence ?? [];
    const observationStillNeed = observation.stillNeedToLearn.map((item) => item.text);

    expect(providerStillMissing.length).toBeGreaterThan(0);
    expect(observationStillNeed.length).toBeGreaterThan(0);
    expect(providerStillMissing[0]).toBe(observationStillNeed[0]);
    expect(providerStillMissing.length).toBeLessThanOrEqual(3);
    expectNoRawRollupLabels(providerStillMissing);
  });

  it("keeps observation intelligence output unchanged", () => {
    const caseRow = { ...DR_APPLE_INCOMPLETE_OBSERVATION_CASE, status: "completed" };
    const priorCases = [
      {
        id: "case-prior",
        status: "completed",
        live_observation_competitors: "Bard Mesh observed",
        live_observation_workflow: "Extra visualization time before fixation",
        notes: "Bard Mesh observed during case.",
      },
    ];
    const input = {
      caseRow,
      providerContact: DR_APPLE_SAVED_CONTACT,
      priorCases,
      activities: [
        {
          activity_type: "note",
          body: "They were using Bard Mesh again. Team seemed organized.",
        },
      ],
    };

    const before = buildObservationRepPresentationView(input);
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [caseRow, ...priorCases],
    });

    const after = buildObservationRepPresentationView(input);

    expect(after.whatWeKnow.map((item) => item.text)).toEqual(before.whatWeKnow.map((item) => item.text));
    expect(after.stillNeedToLearn.map((item) => item.text)).toEqual(
      before.stillNeedToLearn.map((item) => item.text),
    );
    expect(after.debriefReadiness.reasons).toEqual(before.debriefReadiness.reasons);
    expect(
      rollup?.emergingCaseSignals.every((line) =>
        /was used during|appeared organized|expressed frustration|Extra time was spent|product opening/i.test(
          line,
        ),
      ),
    ).toBe(true);
    expectNoRawRollupLabels(rollup?.needsMoreEvidence ?? []);
    expectNoRawRollupLabels(rollup?.debriefImplication ?? []);
  });

  it("formats scheduler name cleanly in field brief when contact line includes role metadata", () => {
    const contact = {
      ...DR_APPLE_SAVED_CONTACT,
      provider_observation_coordinator_contact:
        "Karen Smith · Scheduler · Observation scheduling · 342343242",
      provider_intelligence_field_metadata: {
        ...DR_APPLE_SAVED_CONTACT.provider_intelligence_field_metadata,
        provider_observation_coordinator_contact: {
          source_type: "profile",
          lifecycle_state: "validated",
          evidence_text: "Karen Smith · Scheduler · Observation scheduling · 342343242",
        },
      },
    };
    const completedCase = { ...DR_APPLE_INCOMPLETE_OBSERVATION_CASE, status: "completed" };
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact,
      providerId: "provider-apple",
      engagements: DR_APPLE_ENGAGEMENTS,
      cases: [completedCase],
    });

    const brief = view.fieldBrief.join(" ");
    expect(brief).toMatch(/scheduling is coordinated through Karen Smith/i);
    expect(brief).not.toMatch(/342343242/i);
    expect(brief).not.toMatch(/· Scheduler ·/i);
  });

  it("keeps intro-call product gap when no observation note confirms product use", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      engagements: DR_APPLE_ENGAGEMENTS,
    });

    const productGap = view.needsMoreEvidence.find((chip) => /confirm current product use/i.test(chip.text));
    expect(productGap?.description).toMatch(/Bard Mesh was mentioned/i);
    expect(view.caseIntelligence).toBeNull();
  });

  it("uses completed-case wording in field brief when observation case is complete", () => {
    const model = buildProviderFieldIntelligenceModel({ contact: DR_APPLE_SAVED_CONTACT });
    const reference = buildProviderIntelligenceReferenceView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
    });
    const permission = resolveNormalizedObservationPermission({
      contact: DR_APPLE_SAVED_CONTACT,
      engagements: DR_APPLE_ENGAGEMENTS,
    });
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [{ ...DR_APPLE_INCOMPLETE_OBSERVATION_CASE, status: "completed" }],
    });

    const story = buildProviderIntelligenceFieldBriefingStory({
      contact: DR_APPLE_SAVED_CONTACT,
      model,
      permission,
      reference,
      observationRollup: rollup,
    }).join(" ");

    expect(story).toMatch(/One completed observation has captured Bard Mesh use/i);
    expect(story).toMatch(/visualization\/fixation workflow signal/i);
    expect(story).toMatch(/Observation access is approved/i);
  });

  it("prefers UF emerging case signals when read-model provider runs are present", () => {
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [DR_APPLE_INCOMPLETE_OBSERVATION_CASE],
      universalFactsReadModel: {
        providerRuns: [
          {
            capture_id: "capture-uf",
            declared_source_type: "observation_case",
            extraction_model: "universal-surgical-rules-v1",
            created_at: "2026-06-10T12:00:00Z",
            operational_note_id: null,
            facts: [
              {
                id: "fact-uf-1",
                capture_id: "capture-uf",
                provider_id: "provider-apple",
                organization_id: null,
                case_id: "case-apple-obs-1",
                encounter_id: null,
                concept: "current_product",
                normalized_label: "Bard Mesh was used during the case",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "They're still using Bard Mesh.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Bard Mesh",
                created_at: "2026-06-10T12:00:00Z",
              },
              {
                id: "fact-uf-2",
                capture_id: "capture-uf",
                provider_id: "provider-apple",
                organization_id: null,
                case_id: "case-apple-obs-1",
                encounter_id: null,
                concept: "visualization_or_access_issue",
                normalized_label: "Extra time getting visualization before fixation",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text:
                  "They spent extra time getting a better view before placing fixation",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                created_at: "2026-06-10T12:00:00Z",
              },
            ],
          },
        ],
      },
    });

    const emergingSignals = rollup?.emergingCaseSignals ?? [];
    expect(emergingSignals.join("\n")).toMatch(/Bard Mesh was used during the case/i);
    expect(emergingSignals.join("\n")).toMatch(/Extra time getting visualization before fixation/i);
    expect(emergingSignals.join("\n")).not.toMatch(/in \d+ completed case/i);
  });

  it("uses UF pillar scores for debrief implication so staff gaps clear when staff workflow is captured", () => {
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      cases: [DR_APPLE_INCOMPLETE_OBSERVATION_CASE],
      universalFactsReadModel: {
        programRuns: [
          {
            capture_id: "capture-salt",
            declared_source_type: "observation_case",
            extraction_model: "gpt-universal-v1",
            created_at: "2026-06-15T12:00:00Z",
            operational_note_id: "note-salt",
            facts: [
              {
                id: "fact-provider-sentiment",
                capture_id: "capture-salt",
                provider_id: "provider-apple",
                organization_id: null,
                case_id: "case-apple-obs-1",
                encounter_id: null,
                concept: "provider_sentiment",
                normalized_label: "Mark Salt expressed frustration",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "frustration with instrumentation availability and OR efficiency",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                created_at: "2026-06-15T12:00:00Z",
              },
              {
                id: "fact-staff-workflow",
                capture_id: "capture-salt",
                provider_id: "provider-apple",
                organization_id: null,
                case_id: "case-apple-obs-1",
                encounter_id: null,
                concept: "staff_workflow",
                normalized_label: "Staff workflow appeared coordinated",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "team seemed organized and communication was smooth",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                created_at: "2026-06-15T12:00:00Z",
              },
            ],
          },
        ],
        providerRuns: [
          {
            capture_id: "capture-salt",
            declared_source_type: "observation_case",
            extraction_model: "gpt-universal-v1",
            created_at: "2026-06-15T12:00:00Z",
            operational_note_id: "note-salt",
            facts: [
              {
                id: "fact-provider-sentiment",
                capture_id: "capture-salt",
                provider_id: "provider-apple",
                organization_id: null,
                case_id: "case-apple-obs-1",
                encounter_id: null,
                concept: "provider_sentiment",
                normalized_label: "Mark Salt expressed frustration",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "frustration with instrumentation availability and OR efficiency",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                created_at: "2026-06-15T12:00:00Z",
              },
              {
                id: "fact-staff-workflow",
                capture_id: "capture-salt",
                provider_id: "provider-apple",
                organization_id: null,
                case_id: "case-apple-obs-1",
                encounter_id: null,
                concept: "staff_workflow",
                normalized_label: "Staff workflow appeared coordinated",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "team seemed organized and communication was smooth",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                created_at: "2026-06-15T12:00:00Z",
              },
            ],
          },
        ],
      },
    });

    const debrief = rollup?.debriefImplication ?? [];
    expect(debrief.some((line) => /staff frustrations not yet understood/i.test(line))).toBe(false);
    expect(debrief.some((line) => /provider frustrations still unknown/i.test(line))).toBe(false);
  });
});
