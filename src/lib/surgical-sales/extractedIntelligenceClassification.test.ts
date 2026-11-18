import { describe, expect, it } from "vitest";
import {
  classifyExtractedIntelligenceMaturity,
  classifyClassifiedFactMaturity,
  classifyProposedContactMaturity,
  extractedIntelligenceMeetsPlanningThreshold,
  maturityPriorityBoost,
} from "@/lib/surgical-sales/extractedIntelligenceClassification";
import type { DebriefClassifiedFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

describe("classifyExtractedIntelligenceMaturity", () => {
  it('classifies "Scheduler exists" as Referenced', () => {
    expect(
      classifyExtractedIntelligenceMaturity({ text: "Scheduler exists" }),
    ).toBe("referenced");
  });

  it('classifies "Scheduling coordinator identified" as Learning', () => {
    expect(
      classifyExtractedIntelligenceMaturity({
        text: "Scheduling coordinator identified",
      }),
    ).toBe("learning");
  });

  it('classifies "Scheduling coordinator identified and linked" as Confirmed', () => {
    expect(
      classifyExtractedIntelligenceMaturity({
        text: "Scheduling coordinator identified and linked",
      }),
    ).toBe("confirmed");
  });

  it("prioritizes Confirmed for planning threshold", () => {
    expect(extractedIntelligenceMeetsPlanningThreshold("confirmed")).toBe(true);
    expect(extractedIntelligenceMeetsPlanningThreshold("learning")).toBe(false);
    expect(extractedIntelligenceMeetsPlanningThreshold("referenced")).toBe(false);
    expect(maturityPriorityBoost("confirmed")).toBeLessThan(maturityPriorityBoost("learning"));
  });
});

describe("classifyClassifiedFactMaturity", () => {
  function fact(partial: Partial<DebriefClassifiedFact>): DebriefClassifiedFact {
    return {
      id: "f1",
      fact_key: "scheduling_discussed",
      fact_text: "scheduling_discussed",
      evidence_quote: "Scheduler exists for OR cases.",
      subject: null,
      named_people: [],
      confidence: "Medium",
      classification: "scheduling",
      intelligenceCategory: "access_intelligence",
      ...partial,
    };
  }

  it("maps scheduling_discussed to Referenced", () => {
    expect(classifyClassifiedFactMaturity(fact({ fact_key: "scheduling_discussed" }))).toBe(
      "referenced",
    );
  });

  it("maps scheduling_person_named to Learning", () => {
    expect(
      classifyClassifiedFactMaturity(
        fact({
          fact_key: "scheduling_person_named",
          named_people: ["Karen"],
          evidence_quote: "Karen handles scheduling coordination.",
        }),
      ),
    ).toBe("learning");
  });
});

describe("classifyProposedContactMaturity", () => {
  it("returns Confirmed when support contact is linked with details", () => {
    expect(
      classifyProposedContactMaturity({
        mentionLevel: "confirmed_support_contact",
        contactDetailsMissing: false,
        displayName: "Karen",
        roleLabel: "Scheduling coordinator",
        sourceQuote: "Karen handles scheduling.",
        linkedContactId: "contact-1",
        email: "karen@example.com",
        phone: "",
        disposition: "accepted",
      }),
    ).toBe("confirmed");
  });

  it("returns Learning for workflow participant without contact info", () => {
    expect(
      classifyProposedContactMaturity({
        mentionLevel: "workflow_participant",
        contactDetailsMissing: true,
        displayName: "Karen",
        roleLabel: "Scheduling coordinator",
        sourceQuote: "Karen coordinates scheduling.",
        linkedContactId: null,
        email: "",
        phone: "",
        disposition: "pending",
      }),
    ).toBe("learning");
  });
});
