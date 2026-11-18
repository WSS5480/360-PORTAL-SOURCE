import { describe, expect, it } from "vitest";

import { buildIntelligenceItemDetailView } from "./buildIntelligenceItemDetailView";

describe("buildIntelligenceItemDetailView", () => {
  it("builds vendor clearance detail without legacy report language", () => {
    const view = buildIntelligenceItemDetailView({
      itemId: "vendor_clearance",
      contact: {},
      organizationName: "Test Hospital",
      providerName: "Dr. Smith",
      statusOverride: "Needs validation",
    });

    expect(view).not.toBeNull();
    expect(view!.title).toBe("Vendor clearance");
    expect(view!.scopeLine).toMatch(/Facility intelligence · Needs validation/);
    expect(view!.whatWeKnow.emptyMessage).toMatch(/No confirmed clearance/i);
    expect(view!.fieldQuestions).toHaveLength(3);
    expect(view!.stillToValidate.length).toBeGreaterThan(3);
    expect(JSON.stringify(view)).not.toMatch(/not viable|primary blocker|commercialization/i);
  });
});
