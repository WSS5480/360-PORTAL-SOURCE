import { describe, expect, it } from "vitest";

import {

  discoveryAnswerQualifiesForScore,

  engagementQualifiesForScore,

  INTELLIGENCE_CONFIDENCE_MULTIPLIERS,

  LEADERBOARD_EXCLUDED_SCORING_BEHAVIORS,

  observationRequestQualifiesForScore,

  promotedFieldQualifiesForScore,

  RepIntelligenceDeduper,

  noteActivityMapsToIntelligence,

  noteActivityQualifies,

  normalizeIntelligenceContent,

  opportunityQualifiesForScore,

  parseIntelligenceConfidence,

  resolveIntelligenceMetricFromNote,

  scoreFieldIntelligenceCapture,

} from "@/lib/surgical-sales/executionLeaderboardSafeguards";



describe("executionLeaderboardSafeguards", () => {

  it("applies confidence multipliers", () => {

    expect(INTELLIGENCE_CONFIDENCE_MULTIPLIERS.low).toBe(0);

    expect(INTELLIGENCE_CONFIDENCE_MULTIPLIERS.medium).toBe(1);

    expect(INTELLIGENCE_CONFIDENCE_MULTIPLIERS.high).toBe(1);

    expect(INTELLIGENCE_CONFIDENCE_MULTIPLIERS.confirmed).toBe(1.25);

    expect(parseIntelligenceConfidence("validated")).toBe("validated");

  });



  it("dedupes repeated intelligence content per rep", () => {

    const deduper = new RepIntelligenceDeduper();

    const first = scoreFieldIntelligenceCapture(deduper, {

      metric: "pain_point_captured",

      content: "Fixation visibility pain point",

      confidence: "high",

    });

    const duplicate = scoreFieldIntelligenceCapture(deduper, {

      metric: "pain_point_captured",

      content: "fixation visibility pain point",

      confidence: "high",

    });

    expect(first).toBe(1);

    expect(duplicate).toBe(0);

  });



  it("scores zero for low-confidence intelligence", () => {

    const deduper = new RepIntelligenceDeduper();

    const weight = scoreFieldIntelligenceCapture(deduper, {

      metric: "pain_point_captured",

      content: "Maybe a pain point",

      confidence: "low",

    });

    expect(weight).toBe(0);

  });



  it("dedupes discovery answers by provider and question key", () => {

    const deduper = new RepIntelligenceDeduper();

    const first = deduper.scoreDiscoveryAnswer({

      providerId: "prov-1",

      questionKey: "clinical_impact",

      content: "Delays cases",

      confidence: "high",

    });

    const repeat = deduper.scoreDiscoveryAnswer({

      providerId: "prov-1",

      questionKey: "clinical_impact",

      content: "Delays cases",

      confidence: "high",

    });

    expect(first).toBe(1);

    expect(repeat).toBe(0);

  });



  it("dedupes within the same observation case", () => {

    const deduper = new RepIntelligenceDeduper();

    const first = deduper.scoreObservationIntelligence({

      caseId: "case-1",

      metric: "workflow_friction_captured",

      content: "Turnover delay",

      confidence: "high",

    });

    const duplicate = deduper.scoreObservationIntelligence({

      caseId: "case-1",

      metric: "workflow_friction_captured",

      content: "Turnover delay",

      confidence: "high",

    });

    expect(first).toBe(1);

    expect(duplicate).toBe(0);

  });



  it("only qualifies structured intelligence notes", () => {

    expect(noteActivityQualifies({ audit_only: true, classification: "provider_intelligence" })).toBe(false);

    expect(noteActivityQualifies({ classification: "provider_intelligence" })).toBe(true);

    expect(noteActivityQualifies({ classification: "follow_up_task" })).toBe(false);

    expect(noteActivityMapsToIntelligence({ workflow: "provider_planning", field: "technique" })).toBe(false);

  });



  it("excludes admin CRM discovery and promoted fields from scoring", () => {

    expect(discoveryAnswerQualifiesForScore("scheduling_owner")).toBe(false);

    expect(discoveryAnswerQualifiesForScore("clinical_impact")).toBe(false);

    expect(promotedFieldQualifiesForScore("Scheduler identified")).toBe(false);

    expect(promotedFieldQualifiesForScore("Vendor access path completed")).toBe(false);

    expect(promotedFieldQualifiesForScore("Credentialing path identified")).toBe(false);

    expect(promotedFieldQualifiesForScore("Access pathway mapped")).toBe(false);

    expect(promotedFieldQualifiesForScore("Primary clinical pain point")).toBe(true);

    expect(LEADERBOARD_EXCLUDED_SCORING_BEHAVIORS).toContain("Discovery checklist completion");

    expect(LEADERBOARD_EXCLUDED_SCORING_BEHAVIORS).toContain("Optional intelligence entry");

  });



  it("scores observation request from scheduled field work, not access metadata", () => {

    expect(

      observationRequestQualifiesForScore({

        case_type: "observation",

        status: "scheduled",

        case_date: "2026-06-05",

        surgeon_contact_id: "provider-1",

      }),

    ).toBe(true);

    expect(

      observationRequestQualifiesForScore({

        case_type: "observation",

        status: "draft",

        case_date: null,

        surgeon_contact_id: "provider-1",

      }),

    ).toBe(false);

    expect(

      observationRequestQualifiesForScore({

        case_type: "product_support",

        status: "scheduled",

        case_date: "2026-06-05",

        surgeon_contact_id: "provider-1",

      }),

    ).toBe(false);

  });



  it("requires linked context for completed engagements", () => {

    expect(

      engagementQualifiesForScore({

        status: "completed",

        engagement_type: "intro_call",

        organization_id: "org-1",

      }),

    ).toBe(false);

    expect(

      engagementQualifiesForScore({

        status: "completed",

        engagement_type: "or_visit",

        organization_id: "org-1",

      }),

    ).toBe(true);

  });



  it("does not map note classifications to leaderboard metrics", () => {
    expect(resolveIntelligenceMetricFromNote({ classification: "competitive_intelligence" })).toBe(null);
    expect(resolveIntelligenceMetricFromNote({ classification: "product_usage" })).toBe(null);
  });



  it("requires provider, product, and source evidence for opportunities", () => {

    expect(

      opportunityQualifiesForScore({

        surgeonContactId: "c-1",

        physicianName: null,

        productLine: "Mesh",

        productId: null,

        sourceCaseId: "case-1",

        sourceEngagementId: null,

      }),

    ).toBe(true);

    expect(

      opportunityQualifiesForScore({

        surgeonContactId: null,

        physicianName: "Dr. Smith",

        productLine: "Mesh",

        productId: null,

        sourceCaseId: null,

        sourceEngagementId: null,

      }),

    ).toBe(false);

  });



  it("normalizes intelligence fingerprints", () => {

    expect(normalizeIntelligenceContent("  Foo\nBar  ")).toBe("foo bar");

  });

});


