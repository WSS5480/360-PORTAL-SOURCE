import { describe, expect, it } from "vitest";
import {
  evaluationActivityStatusFromLabel,
  normalizeEvaluationActivityStatus,
  resolveEvaluationActivityStatusFromContact,
  resolveStoredEvaluationActivityStatus,
} from "./evaluationActivityStatus";
import { resolveEvaluationStatus } from "./buildProviderEvaluationPathView";

describe("evaluationActivityStatus", () => {
  it("normalizes stored status values", () => {
    expect(normalizeEvaluationActivityStatus("active")).toBe("active");
    expect(normalizeEvaluationActivityStatus("Not Scheduled")).toBe("not_scheduled");
    expect(normalizeEvaluationActivityStatus("Complete")).toBe("complete");
  });

  it("maps display labels to status choices", () => {
    expect(evaluationActivityStatusFromLabel("Planned")).toBe("planned");
    expect(evaluationActivityStatusFromLabel("Active")).toBe("active");
  });

  it("prefers stored override over derived engagement status", () => {
    const contact = { provider_evaluation_activity_status: "complete" };
    expect(resolveStoredEvaluationActivityStatus(contact)).toBe("complete");
    expect(
      resolveEvaluationActivityStatusFromContact(contact, "Not Scheduled"),
    ).toBe("complete");
    expect(
      resolveEvaluationStatus({
        pathLabel: "Product Trial",
        contact,
      }),
    ).toBe("Complete");
  });
});
