import { describe, expect, it, vi } from "vitest";
import { buildOrganizationAttentionItems } from "@/lib/surgical-sales/organizationDirectoryAttention";
import {
  buildOrganizationDirectoryContactMemberships,
  rollupOrganizationDirectoryMetrics,
  unwrapLinkedContact,
} from "@/lib/surgical-sales/organizationDirectoryRollups";

describe("rollupOrganizationDirectoryMetrics", () => {
  it("does not count completed future-dated cases as upcoming", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T12:00:00.000Z"));

    const rollup = rollupOrganizationDirectoryMetrics([], [
      {
        id: "case-completed",
        account_id: "org-1",
        case_date: "2026-07-01",
        status: "completed",
        expected_revenue: 1000,
      },
      {
        id: "case-complete",
        account_id: "org-1",
        case_date: "2026-07-01",
        status: "complete",
        expected_revenue: 1500,
      },
      {
        id: "case-draft",
        account_id: "org-1",
        case_date: "2026-07-01",
        status: "draft",
        expected_revenue: 3000,
      },
      {
        id: "case-scheduled",
        account_id: "org-1",
        case_date: "2026-07-02",
        status: "scheduled",
        expected_revenue: 2000,
      },
    ]);

    expect(rollup.get("org-1")?.upcoming_case_count).toBe(1);
    expect(rollup.get("org-1")?.upcoming_pipeline_revenue).toBe(2000);

    vi.useRealTimers();
  });

  it("counts physician assistants as clinicians on file", () => {
    const rollup = rollupOrganizationDirectoryMetrics(
      [{ id: "pa-1", account_id: "org-1", archived_at: null, role_type: "physician_assistant" }],
      [],
    );
    expect(rollup.get("org-1")?.surgeon_count).toBe(1);
    expect(rollup.get("org-1")?.contact_count).toBe(1);
  });

  it("does not double-count the same contact on an organization", () => {
    const rollup = rollupOrganizationDirectoryMetrics(
      [
        { id: "s-1", account_id: "org-1", archived_at: null, role_type: "surgeon" },
        { id: "s-1", account_id: "org-1", archived_at: null, role_type: "surgeon" },
      ],
      [],
    );
    expect(rollup.get("org-1")?.surgeon_count).toBe(1);
    expect(rollup.get("org-1")?.contact_count).toBe(1);
  });
});

describe("buildOrganizationDirectoryContactMemberships", () => {
  const surgeon = {
    id: "surgeon-1",
    account_id: "org-primary",
    organization_id: "org-primary",
    archived_at: null,
    role_type: "surgeon",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  it("counts a surgeon linked only via the organization relationship table", () => {
    const memberships = buildOrganizationDirectoryContactMemberships(
      [surgeon],
      [
        {
          contact_id: "surgeon-1",
          account_id: "org-secondary",
          is_active: true,
          role_type: "surgeon",
          created_at: "2026-03-01T00:00:00.000Z",
        },
      ],
    );
    const rollup = rollupOrganizationDirectoryMetrics(memberships, []);

    expect(rollup.get("org-secondary")?.surgeon_count).toBe(1);
    expect(rollup.get("org-secondary")?.contact_count).toBe(1);
    expect(rollup.get("org-primary")?.surgeon_count).toBe(1);
    expect(
      buildOrganizationAttentionItems({
        accountId: "org-secondary",
        doctorCount: rollup.get("org-secondary")?.surgeon_count ?? 0,
        contactCount: rollup.get("org-secondary")?.contact_count ?? 0,
        lastActivityAt: "2026-03-01T00:00:00.000Z",
        casesMissingPo: 0,
        casesMissingInvoice: 0,
        upcomingWithin7d: 0,
      }).some((item) => item.code === "no_doctor"),
    ).toBe(false);
  });

  it("does not count inactive or archived memberships", () => {
    const memberships = buildOrganizationDirectoryContactMemberships(
      [
        surgeon,
        { ...surgeon, id: "archived-1", archived_at: "2026-02-01T00:00:00.000Z" },
      ],
      [
        { contact_id: "surgeon-1", account_id: "org-inactive", is_active: false, role_type: "surgeon" },
        { contact_id: "archived-1", account_id: "org-archived", is_active: true, role_type: "surgeon" },
      ],
    );
    const rollup = rollupOrganizationDirectoryMetrics(memberships, []);
    expect(rollup.get("org-inactive")?.surgeon_count ?? 0).toBe(0);
    expect(rollup.get("org-archived")?.surgeon_count ?? 0).toBe(0);
  });

  it("treats a clinician role on either the contact or the org link as on file", () => {
    const memberships = buildOrganizationDirectoryContactMemberships(
      [{ ...surgeon, role_type: "other" }],
      [{ contact_id: "surgeon-1", account_id: "org-secondary", is_active: true, role_type: "surgeon" }],
    );
    expect(rollupOrganizationDirectoryMetrics(memberships, []).get("org-secondary")?.surgeon_count).toBe(1);
  });
});

describe("unwrapLinkedContact", () => {
  it("accepts a nested object or one-row array", () => {
    const row = { id: "c1", account_id: "org-1", archived_at: null, role_type: "surgeon" };
    expect(unwrapLinkedContact(row)?.id).toBe("c1");
    expect(unwrapLinkedContact([row])?.id).toBe("c1");
    expect(unwrapLinkedContact(null)).toBeNull();
  });
});
