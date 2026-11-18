import { describe, expect, it } from "vitest";
import {
  isGenericPersonDisplayLabel,
  isPlausiblePersonName,
} from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  buildPreservedNamedEntitySummary,
  buildSchedulingOwnershipEvidenceSummary,
  extractPrimaryNamedPerson,
  extractPrimarySchedulingNamedPerson,
  formatNamedEntityStructuredDisplay,
  shouldUseStructuredNamedEntityDisplay,
} from "@/lib/surgical-sales/namedEntityPreservation";
import { extractContactLeadsFromDebriefText } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { ANDY_KAREN_DEBRIEF_REGRESSION_NOTE } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import { debriefCardBody, debriefCardTitle } from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import type { DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

const MELISSA_NOTE =
  "Melissa handles scheduling but I don't have her contact info yet. Need to follow up before we can book observation.";

const VAGUE_TIMING_NOTE =
  "Melissa came up a few times and seems to help with timing on their side.";

describe("namedEntityPreservation", () => {
  it("preserves Melissa instead of generic scheduling contact language", () => {
    expect(buildSchedulingOwnershipEvidenceSummary(MELISSA_NOTE)).toBe(
      "Melissa handles scheduling.",
    );
    expect(buildPreservedNamedEntitySummary(MELISSA_NOTE)).toBe("Melissa handles scheduling.");
    expect(extractPrimaryNamedPerson(MELISSA_NOTE)?.name).toBe("Melissa");
  });

  it("never emits a named contact handles scheduling fallback", () => {
    expect(buildSchedulingOwnershipEvidenceSummary(MELISSA_NOTE)).not.toMatch(/named contact/i);
    expect(buildPreservedNamedEntitySummary(MELISSA_NOTE)).not.toMatch(/named contact/i);
  });

  it("uses structured display when role confidence is lower than name confidence", () => {
    const entity = extractPrimaryNamedPerson(VAGUE_TIMING_NOTE);
    expect(entity?.name).toBe("Melissa");
    expect(shouldUseStructuredNamedEntityDisplay(entity!)).toBe(true);
    expect(buildPreservedNamedEntitySummary(VAGUE_TIMING_NOTE)).toContain(
      formatNamedEntityStructuredDisplay(entity!, {
        evidenceQuote: VAGUE_TIMING_NOTE,
      }),
    );
    expect(buildPreservedNamedEntitySummary(VAGUE_TIMING_NOTE)).toMatch(/Possible role: Scheduling Coordinator/);
    expect(buildPreservedNamedEntitySummary(VAGUE_TIMING_NOTE)).toMatch(/Evidence:/);
  });

  it("preserves Karen from Andy/Karen regression debrief pronoun scheduling context", () => {
    expect(extractPrimarySchedulingNamedPerson(ANDY_KAREN_DEBRIEF_REGRESSION_NOTE)?.name).toBe("Karen");
    expect(buildSchedulingOwnershipEvidenceSummary(ANDY_KAREN_DEBRIEF_REGRESSION_NOTE)).toMatch(/Karen/i);
  });

  it("does not invent Follow from follow-up scheduling language", () => {
    const note = "Next step is to follow up with Karen, confirm credentialing requirements, and schedule the first observation.";
    const leads = extractContactLeadsFromDebriefText(note).map((lead) => lead.name);
    expect(leads).toContain("Karen");
    expect(leads).not.toContain("Follow");
    expect(buildSchedulingOwnershipEvidenceSummary(note)).not.toMatch(/And Follow|Follow appears involved/i);
  });

  it("references scheduler without inventing Follow when no named contact exists", () => {
    const note = "I need to follow up with the scheduler.";
    expect(extractPrimarySchedulingNamedPerson(note)).toBeNull();
    expect(buildSchedulingOwnershipEvidenceSummary(note)).not.toMatch(/Follow/i);
  });

  it("extracts Karen from office scheduling coordination sentence", () => {
    const note =
      "He mentioned that Karen in his office usually helps coordinate his OR schedule and would probably be the best person to start with for finding a good case date.";
    expect(extractPrimarySchedulingNamedPerson(note)?.name).toBe("Karen");
    expect(buildSchedulingOwnershipEvidenceSummary(note)).toMatch(/Karen/i);
  });

  it("uses named titles and bodies in debrief review cards", () => {
    const item = {
      discoverySignalId: "scheduling_owner",
      field: { dbKey: "provider_scheduling_contact", id: "ai-partial-1", label: "Scheduling" },
      proposedValue: MELISSA_NOTE,
      extractedStatement: "",
      intelligenceFieldLabel: "Scheduling owner",
    } as DebriefIntelligenceUpdateItem;

    expect(
      debriefCardTitle({
        item,
        pathwayClass: "observation_scheduling",
        groupId: "people_contacts",
      }),
    ).toMatch(/Melissa/i);
    expect(debriefCardBody({ item, pathwayClass: "observation_scheduling" })).toMatch(/Melissa/i);
    expect(debriefCardBody({ item, pathwayClass: "observation_scheduling" })).not.toMatch(
      /named contact/i,
    );
  });

  it("preserves Jennifer in review titles and workflow actions", () => {
    const note =
      "Jennifer handles scheduling but I don't have her contact info yet. Need to follow up before observation.";
    expect(extractPrimaryNamedPerson(note)?.name).toBe("Jennifer");
    const item = {
      discoverySignalId: "scheduling_owner",
      field: { dbKey: "provider_scheduling_contact", id: "ai-partial-j", label: "Scheduling" },
      proposedValue: note,
      extractedStatement: "",
      intelligenceFieldLabel: "Scheduling owner",
    } as DebriefIntelligenceUpdateItem;

    expect(
      debriefCardTitle({
        item,
        pathwayClass: "observation_scheduling",
        groupId: "people_contacts",
      }),
    ).toBe("Jennifer");
    expect(debriefCardBody({ item, pathwayClass: "observation_scheduling" })).toMatch(/Jennifer/);
    expect(debriefCardBody({ item, pathwayClass: "observation_scheduling" })).not.toMatch(
      /Identified Partially|Named contact|provider_office|shared_workflow/i,
    );
  });

  it("rejects generic labels as person names", () => {
    expect(isGenericPersonDisplayLabel("Partially Identified")).toBe(true);
    expect(isPlausiblePersonName("Partially Identified")).toBe(false);
    expect(isPlausiblePersonName("Provider Office")).toBe(false);
    expect(isPlausiblePersonName("Jennifer")).toBe(true);
  });
});
