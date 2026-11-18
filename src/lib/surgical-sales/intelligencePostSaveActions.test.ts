import { describe, expect, it } from "vitest";
import { buildIntelligencePostSaveActions } from "./intelligencePostSaveActions";

describe("buildIntelligencePostSaveActions", () => {
  it("includes view intelligence, follow-up, and case when applicable", () => {
    const actions = buildIntelligencePostSaveActions({
      providerId: "prov-1",
      accountId: "acct-1",
      caseId: "case-9",
    });

    expect(actions.map((a) => a.id)).toEqual([
      "view_intelligence",
      "create_follow_up",
      "open_related_case",
    ]);
    expect(actions.find((a) => a.id === "open_related_case")?.href).toContain("/cases/case-9");
    expect(actions.find((a) => a.id === "create_follow_up")?.href).toContain("follow_up");
  });
});
