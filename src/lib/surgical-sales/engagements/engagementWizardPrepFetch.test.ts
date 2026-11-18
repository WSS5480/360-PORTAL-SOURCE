import { describe, expect, it } from "vitest";
import {
  buildEngagementWizardPrepFetchParams,
  engagementWizardPrepFetchIdentityKey,
} from "@/lib/surgical-sales/engagements/engagementWizardPrepFetch";

const base = {
  provider_id: "p1",
  engagement_type: "intro_call",
  organization_id: "o1",
  opportunity_id: "",
  engagement_date: "2026-05-26",
  case_id: "",
  product_line: "",
  prep_mode: "",
};

describe("engagementWizardPrepFetchIdentityKey", () => {
  it("ignores product_line changes for intro call", () => {
    const a = engagementWizardPrepFetchIdentityKey({ ...base, product_line: "" });
    const b = engagementWizardPrepFetchIdentityKey({ ...base, product_line: "ACSIS" });
    expect(a).toBe(b);
  });

  it("includes prep_mode for non-intro strategic types", () => {
    const observation = {
      ...base,
      engagement_type: "observation",
      prep_mode: "workflow",
    };
    const other = { ...observation, prep_mode: "access" };
    expect(engagementWizardPrepFetchIdentityKey(observation)).not.toBe(
      engagementWizardPrepFetchIdentityKey(other),
    );
  });
});

describe("buildEngagementWizardPrepFetchParams", () => {
  it("still sends product_line on intro call requests", () => {
    const params = buildEngagementWizardPrepFetchParams({ ...base, product_line: "ACSIS" });
    expect(params?.get("product_line")).toBe("ACSIS");
  });
});
