import { describe, expect, it } from "vitest";
import {
  buildEvaluationPathScheduleHref,
  isCaseBasedEvaluationPath,
} from "@/lib/surgical-sales/missionBoardEvaluationEngagement";

describe("buildEvaluationPathScheduleHref", () => {
  it("routes Product Trial to new product_support case", () => {
    const href = buildEvaluationPathScheduleHref({
      path: "Product Trial",
      providerId: "prov-1",
      accountId: "org-1",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=prov-1",
    });
    expect(href).toContain("/portal/sales/cases/new");
    expect(href).toContain("surgeon_contact_id=prov-1");
    expect(href).toContain("account_id=org-1");
    expect(href).toContain("case_type=product_support");
  });

  it("routes 360 Experience to office visit engagement", () => {
    const href = buildEvaluationPathScheduleHref({
      path: "360 Experience",
      providerId: "prov-1",
      accountId: null,
      newEngagementHref: "/portal/sales/engagements/new?provider_id=prov-1",
    });
    expect(href).toContain("engagement_type=office_visit_360");
  });

  it("identifies case-based evaluation paths", () => {
    expect(isCaseBasedEvaluationPath("Product Trial")).toBe(true);
    expect(isCaseBasedEvaluationPath("Additional Observation")).toBe(true);
    expect(isCaseBasedEvaluationPath("360 Experience")).toBe(false);
  });
});
