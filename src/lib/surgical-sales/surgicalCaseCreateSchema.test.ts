import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { pickPreCallPlanPatchFromPayload } from "@/lib/surgical-sales/engagements/engagementPreCallPlan";
import { SurgicalCaseCreateSchema } from "@/lib/surgical-sales/surgicalCaseCreateSchema";

describe("SurgicalCaseCreateSchema", () => {
  const accountId = randomUUID();
  const surgeonId = randomUUID();
  const productId = randomUUID();
  const skuId = randomUUID();

  it("accepts observation cases without engagement_id", () => {
    const parsed = SurgicalCaseCreateSchema.safeParse({
      case_type: "observation",
      account_id: accountId,
      surgeon_contact_id: surgeonId,
      case_date: "2026-05-27",
      status: "scheduled",
      product_id: null,
      notes: "Observation from provider profile",
      follow_up_needed: false,
      related_opportunity_id: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.engagement_id).toBeUndefined();
      expect(parsed.data.case_type).toBe("observation");
    }
    expect(pickPreCallPlanPatchFromPayload(parsed.success ? (parsed.data as Record<string, unknown>) : {})).toBeNull();
  });

  it("accepts product support cases without engagement_id when line items are present", () => {
    const parsed = SurgicalCaseCreateSchema.safeParse({
      case_type: "product_support",
      account_id: accountId,
      surgeon_contact_id: surgeonId,
      case_date: "2026-05-27",
      status: "scheduled",
      product_id: productId,
      sku_id: skuId,
      expected_quantity: 2,
      notes: null,
      follow_up_needed: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.engagement_id).toBeUndefined();
    }
  });
});
