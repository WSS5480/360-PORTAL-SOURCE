import { describe, expect, it } from "vitest";

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  SCHEDULER_CONTACT_POLICY,
  fragmentLooksLikeSchedulerContact,
  normalizeSchedulerPersonName,
  shouldEmitDipWorkflowContact,
  shouldEmitUfStaffWorkflowQuote,
} from "@/lib/surgical-sales/sharedIntelligence/schedulerContactExtractionPolicy";

describe("schedulerContactExtractionPolicy", () => {
  it("documents DIP ownership of review contacts and blocks UF CRM write", () => {
    expect(SCHEDULER_CONTACT_POLICY.reviewContactsOwner).toBe("dip");
    expect(SCHEDULER_CONTACT_POLICY.ufCrmWrite).toBe(false);
  });

  it("allows DIP workflow contact for Jennifer scheduling coordinator", () => {
    const fact: DebriefAtomicFact = {
      fact_type: "workflow_contact",
      entity: "Jennifer",
      attribute: "scheduling_coordinator",
      value: "handles scheduling coordination",
      confidence: "medium",
      evidence: "Jennifer in his office usually handles a lot of the scheduling coordination",
    };
    expect(shouldEmitDipWorkflowContact(fact)).toBe(true);
    expect(normalizeSchedulerPersonName("Jennifer Now")).toBe("Jennifer");
  });

  it("allows UF staff workflow quote without creating a second Jennifer CRM contact path", () => {
    const fragment =
      "Jennifer in his office usually handles a lot of the scheduling coordination and works closely with the hospital OR scheduling team.";
    expect(shouldEmitUfStaffWorkflowQuote(fragment)).toBe(true);
    expect(fragmentLooksLikeSchedulerContact(fragment)).toBe(true);
    expect(SCHEDULER_CONTACT_POLICY.ufCrmWrite).toBe(false);
  });

  it("Karen evidence reference does not imply UF CRM scheduler write", () => {
    const karenFragment = "Karen from the office will help schedule.";
    expect(shouldEmitUfStaffWorkflowQuote(karenFragment)).toBe(false);
    expect(SCHEDULER_CONTACT_POLICY.ufCrmWrite).toBe(false);
  });
});
