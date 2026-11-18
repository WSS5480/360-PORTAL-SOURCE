import { describe, expect, it } from "vitest";
import {
  buildIntelligenceSectionCardWorkspace,
  buildProviderFollowUpEngagementHref,
  fieldsEligibleForValidation,
} from "./providerIntelligenceCardWorkspace";
import { markIntelligenceFieldsValidated } from "./providerIntelligenceFieldMetadata";

describe("providerIntelligenceCardWorkspace", () => {
  it("picks capture target from section gaps", () => {
    const ws = buildIntelligenceSectionCardWorkspace("observation_readiness", {
      provider_observation_feasibility: "easy",
    });
    expect(ws.captureDbKey).toBeTruthy();
    expect(ws.sectionId).toBe("observation_readiness");
  });

  it("lists fields eligible for validation", () => {
    const keys = fieldsEligibleForValidation("clinical_workflow", {
      provider_procedure_focus: "hernia|High volume",
    });
    expect(keys).toContain("provider_procedure_focus");
  });

  it("builds follow-up engagement href", () => {
    expect(buildProviderFollowUpEngagementHref("pid", "acct")).toMatch(
      /engagement_type=follow_up/,
    );
  });
});

describe("markIntelligenceFieldsValidated", () => {
  it("stamps validated_at without clearing signal", () => {
    const meta = markIntelligenceFieldsValidated({
      existing: {},
      dbKeys: ["provider_procedure_focus"],
      fieldValues: { provider_procedure_focus: "hernia|notes" },
      actor: { userId: "u1", userName: "Rep" },
      now: new Date("2026-05-01T12:00:00.000Z"),
    });
    expect(meta.provider_procedure_focus?.validated_at).toBe("2026-05-01T12:00:00.000Z");
  });
});
