import { describe, expect, it } from "vitest";
import { mockAiNoteCaptureExtract } from "./mockExtract";

const TEST_NOTE = `Stark JH
ventral
TG mostly
fix slow
LP maybe if data good
post app large defects
OR wants $
slow trays
eval June?
committee first
comp rep there
Fri call OR mgr
demo smaller fix
pref card??`;

const ctx = {
  providerId: "00000000-0000-4000-8000-000000000001",
  providerLabel: "Dr. Stark",
  caseId: "00000000-0000-4000-8000-000000000002",
  caseLabel: "Ventral case",
  opportunityId: "00000000-0000-4000-8000-000000000003",
  opportunityLabel: "Ventral Adoption",
  organizationId: "00000000-0000-4000-8000-000000000004",
  organizationLabel: "JH",
};

describe("mockAiNoteCaptureExtract", () => {
  it("splits messy shorthand into atomic classified fragments", async () => {
    const result = await mockAiNoteCaptureExtract({
      rawText: TEST_NOTE,
      inputMode: "type",
      context: ctx,
    });

    const all = [...result.suggestions, ...result.unclassified];
    expect(all.length).toBeGreaterThanOrEqual(10);

    const workflow = all.filter((s) => s.category === "workflow_field_suggestion");
    expect(workflow.length).toBeGreaterThanOrEqual(5);

    const ventral = all.find((s) => /^ventral/i.test(s.originalText));
    expect(ventral?.workflowTarget?.field).toBe("common_procedures");
    expect(ventral?.workflowTarget?.section).toBe("procedural_intelligence");

    const tg = all.find((s) => /tg/i.test(s.originalText));
    expect(tg?.workflowTarget?.field).toBe("current_vendors_products");

    const fixSlow = all.find((s) => /fix slow/i.test(s.originalText));
    expect(fixSlow?.workflowTarget?.field).toBe("preference_card_signals");

    const comp = all.find((s) => /comp rep/i.test(s.originalText));
    expect(comp?.workflowTarget?.field).toBe("competitive_products_used");

    const fri = all.find((s) => /fri call/i.test(s.originalText));
    expect(fri?.category).toBe("follow_up_task");
    expect(fri?.destination).toBe("task");

    const evalJune = all.find((s) => /eval june/i.test(s.originalText));
    expect(evalJune?.category).toBe("opportunity_signal");

    const pref = all.find((s) => /pref card/i.test(s.originalText));
    expect(pref?.category === "opportunity_signal" || pref?.category === "unclassified").toBe(true);
  });

  it("flags existing planning field values for review", async () => {
    const result = await mockAiNoteCaptureExtract({
      rawText: "TG mostly",
      inputMode: "type",
      context: ctx,
      existingPlanningFields: { current_vendors_products: "Existing vendor line" },
    });

    const item = result.suggestions[0];
    expect(item.existingFieldValue).toBe("Existing vendor line");
    expect(item.needsUserReview).toBe(true);
  });
});
