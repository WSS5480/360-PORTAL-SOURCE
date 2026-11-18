import { describe, expect, it } from "vitest";
import {
  orgProductApprovalStatusSideEffects,
  summarizeOrgProductApprovals,
} from "@/lib/surgical-sales/organizationProductApprovals";

describe("organizationProductApprovals", () => {
  it("summarizes approval counts", () => {
    const summary = summarizeOrgProductApprovals([
      {
        id: "1",
        organization_id: "org",
        product_id: "p1",
        status: "approved",
        champion_contact_id: null,
        submitted_at: null,
        approved_at: null,
        notes: null,
        created_by_user_id: "u1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        product_name: "A",
        product_category: null,
        champion_name: null,
      },
      {
        id: "2",
        organization_id: "org",
        product_id: "p2",
        status: "under_review",
        champion_contact_id: null,
        submitted_at: null,
        approved_at: null,
        notes: null,
        created_by_user_id: "u1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        product_name: "B",
        product_category: null,
        champion_name: null,
      },
      {
        id: "3",
        organization_id: "org",
        product_id: "p3",
        status: "denied",
        champion_contact_id: null,
        submitted_at: null,
        approved_at: null,
        notes: null,
        created_by_user_id: "u1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        product_name: "C",
        product_category: null,
        champion_name: null,
      },
    ]);
    expect(summary).toEqual({ total: 3, approved: 1, pending: 1, denied: 1 });
  });

  it("sets submitted and approved timestamps on status transitions", () => {
    const now = "2026-08-11T12:00:00.000Z";
    const submitted = orgProductApprovalStatusSideEffects(
      "submitted",
      { status: "in_progress", submitted_at: null, approved_at: null },
      now,
    );
    expect(submitted.submitted_at).toBe(now);
    expect(submitted.approved_at).toBeNull();

    const approved = orgProductApprovalStatusSideEffects(
      "approved",
      { status: "under_review", submitted_at: now, approved_at: null },
      "2026-09-01T12:00:00.000Z",
    );
    expect(approved.submitted_at).toBe(now);
    expect(approved.approved_at).toBe("2026-09-01T12:00:00.000Z");
  });
});
