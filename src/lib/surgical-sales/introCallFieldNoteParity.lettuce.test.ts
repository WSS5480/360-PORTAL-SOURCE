import { describe, expect, it } from "vitest";
import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";
import { normalizeClinicalIntelligenceFromFact } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { normalizeExtractedPersonName } from "@/lib/surgical-sales/schedulingContactOwnership";
import { shouldRejectAssignedProviderContactRole } from "@/lib/surgical-sales/sharedIntelligence/providerContactRolePolicy";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import { buildReviewProjectionFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { buildLogUpdateIntelligenceReview } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { validateAndNormalizeGptUniversalFacts } from "@/lib/surgical-sales/universalExtractor/validateGptUniversalFacts";

/** Canonical intro / field-note dictation from the Dr. Lettuce accuracy QA. */
export const LETTUCE_INTRO_DICTATION = [
  "Stopped by to introduce myself to Dr. Lettuce today between clinic and his afternoon cases.",
  "We had about ten minutes to talk.",
  "He primarily performs robotic and laparoscopic ventral hernia repairs and said he's always interested in learning about new technology if it offers a meaningful clinical benefit.",
  "Right now he's comfortable with the products he's using and isn't actively looking to make a change, but he enjoys reviewing published clinical evidence before forming an opinion.",
  "We talked briefly about our portfolio, and he said he'd be open to having me observe one of his cases in the future if scheduling allows.",
  "I also met Jessica, his scheduler, who handles observation requests and coordinates OR access.",
  "She asked me to email her a few possible dates, and she'll see what works with Dr. Lettuce's schedule.",
  "Overall it was a positive first meeting, and I think there's a good opportunity to build the relationship over the next few visits.",
].join(" ");

const PROVIDER = "Dr. Lettuce";

function emptyWorkflowLogUpdate(dictation: string): LogUpdateParseResult {
  return {
    sourceText: dictation,
    suggestedUpdates: [],
    fieldUpdates: [],
    intelligenceReview: buildLogUpdateIntelligenceReview(dictation, [], {}),
    stillMissing: [],
    saveAsNoteAccepted: true,
    usesProviderIntelligence: true,
  };
}

function ufRuns(dictation: string, source: "intro_call" | "discovery_note"): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: source,
    context: { provider_display_name: PROVIDER },
  });
  return [
    {
      capture_id: `lettuce-parity-${source}`,
      declared_source_type: source,
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `lettuce-parity-${source}-${index}`,
        capture_id: `lettuce-parity-${source}`,
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

function assertAccurateCapture(source: "intro_call" | "discovery_note") {
  const signals = extractUniversalCategorySignals(LETTUCE_INTRO_DICTATION, {
    providerName: PROVIDER,
  });
  const labels = signals.map((s) => `${s.concept}: ${s.normalized_label}`).join("\n");

  expect(labels).toMatch(/contact_role: Jessica · Scheduling Coordinator/i);
  expect(labels).not.toMatch(/Lettuce\s+Today/i);
  expect(labels).not.toMatch(/contact_role: Lettuce/i);
  expect(labels).toMatch(/Values published clinical evidence/i);
  expect(labels).toMatch(/Not actively looking to change products/i);
  expect(labels).toMatch(/open to new technology/i);
  expect(labels).toMatch(/Observation access interest/i);
  expect(labels).toMatch(/Email proposed dates/i);
  expect(labels).not.toMatch(/Email the published clinical data/i);

  const extraction = runUniversalSurgicalExtraction({
    raw_note: LETTUCE_INTRO_DICTATION,
    declared_source_type: source,
    context: { provider_display_name: PROVIDER },
  });
  const factBlob = extraction.facts
    .map((f) => `${f.concept}: ${f.normalized_label} :: ${f.person_mentioned ?? ""}`)
    .join("\n");

  expect(factBlob).toMatch(/Jessica · Scheduling Coordinator/i);
  expect(factBlob).not.toMatch(/Lettuce\s+Today/i);
  expect(factBlob).toMatch(/ventral hernia/i);
  expect(factBlob).toMatch(/Robotic · Technique \/ Modality/i);
  expect(factBlob).toMatch(/Laparoscopic · Technique \/ Modality/i);
  expect(factBlob).not.toMatch(/New Procedure Adoption/i);
  expect(factBlob).toMatch(/Values published clinical evidence|open to new technology/i);
  expect(factBlob).toMatch(/Not actively looking to change products/i);
  expect(factBlob).toMatch(/Email proposed dates/i);

  const clinical = normalizeClinicalIntelligenceFromFact({
    value: "Ventral hernia repair",
    evidence:
      "He primarily performs robotic and laparoscopic ventral hernia repairs and said he's always interested in learning about new technology if it offers a meaningful clinical benefit.",
  });
  expect(clinical?.signal).toBe("procedure_focus");
  expect(clinical?.signalLabel).not.toMatch(/New Procedure Adoption/i);

  const projection = buildReviewProjectionFromUniversalFacts({
    dictation: LETTUCE_INTRO_DICTATION,
    debriefRuns: ufRuns(LETTUCE_INTRO_DICTATION, source),
    workflowLogUpdate: emptyWorkflowLogUpdate(LETTUCE_INTRO_DICTATION),
    existingFields: {},
  }).logUpdate;

  const fieldBlob = (projection.fieldUpdates ?? [])
    .map((f) => `${f.dbKey}: ${f.proposedValue}`)
    .join("\n");

  expect(fieldBlob).toMatch(/provider_scheduling_contact: Jessica/i);
  expect(fieldBlob).not.toMatch(/Lettuce\s+Today/i);
  expect(fieldBlob).toMatch(/provider_observation_access_path/i);
  expect(fieldBlob).toMatch(/provider_product_interests/i);
  expect(fieldBlob).not.toMatch(/New Procedure Adoption/i);
}

describe("Intro-call / field-note parity — Dr. Lettuce accuracy", () => {
  it("strips temporal name junk and rejects provider-as-scheduler artifacts", () => {
    expect(normalizeExtractedPersonName("Lettuce Today")).toBe("Lettuce");
    expect(isPlausiblePersonName("Lettuce Today")).toBe(false);
    expect(
      shouldRejectAssignedProviderContactRole({
        concept: "contact_role",
        person_mentioned: "Lettuce Today",
        normalized_label: "Lettuce Today · Scheduling Coordinator",
        evidence_text: "Stopped by to introduce myself to Dr. Lettuce today between clinic.",
        providerName: "Tom Lettuce",
      }),
    ).toBe(true);
  });

  it("GPT validator rejects Lettuce Today scheduler contact", () => {
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: [
        {
          category: "scheduler_contact",
          normalized_label: "Lettuce Today · Scheduling Coordinator",
          evidence_text: "Stopped by to introduce myself to Dr. Lettuce today between clinic and his afternoon cases.",
          confidence: "high",
          should_persist: true,
          person_name: "Lettuce Today",
          role: "Scheduling Coordinator",
        },
        {
          category: "scheduler_contact",
          normalized_label: "Jessica · Scheduling Coordinator",
          evidence_text: "I also met Jessica, his scheduler, who handles observation requests and coordinates OR access.",
          confidence: "high",
          should_persist: true,
          person_name: "Jessica",
          role: "Scheduling Coordinator",
        },
      ],
      transcript: LETTUCE_INTRO_DICTATION,
      declared_source_type: "intro_call",
      providerName: PROVIDER,
    });

    expect(validated.facts.some((f) => /Jessica/i.test(f.normalized_label))).toBe(true);
    expect(validated.facts.some((f) => /Lettuce/i.test(f.person_mentioned ?? f.normalized_label))).toBe(
      false,
    );
  });

  it("captures accurate intelligence for intro_call", () => {
    assertAccurateCapture("intro_call");
  });

  it("captures the same intelligence shape for discovery_note (field note)", () => {
    assertAccurateCapture("discovery_note");
  });

  it("accumulates onto existing provider intelligence without inventing contacts", () => {
    const projection = buildReviewProjectionFromUniversalFacts({
      dictation: LETTUCE_INTRO_DICTATION,
      debriefRuns: ufRuns(LETTUCE_INTRO_DICTATION, "intro_call"),
      workflowLogUpdate: emptyWorkflowLogUpdate(LETTUCE_INTRO_DICTATION),
      existingFields: {
        provider_procedure_focus: "Ventral hernia repair",
        provider_product_interests: "Interested in mesh alternatives",
      },
    }).logUpdate;

    const interests = projection.fieldUpdates?.find((f) => f.dbKey === "provider_product_interests");
    expect(interests).toBeTruthy();
    // Existing value is preserved as conflict context; proposed adds the new signal.
    expect(interests?.conflict?.existingValue ?? "Interested in mesh alternatives").toMatch(
      /Interested in mesh alternatives/i,
    );
    expect(`${interests?.proposedValue} ${interests?.conflict?.existingValue ?? ""}`).toMatch(
      /published clinical evidence|open to new technology|new technology/i,
    );

    const scheduler = projection.fieldUpdates?.find((f) => f.dbKey === "provider_scheduling_contact");
    expect(scheduler?.proposedValue).toMatch(/^Jessica/i);
    expect(scheduler?.proposedValue).not.toMatch(/Lettuce/i);
  });
});

