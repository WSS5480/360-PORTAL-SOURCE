import { describe, expect, it } from "vitest";
import {
  buildEngagementEditPatch,
  readEngagementEditDraft,
  readEngagementNotesDraft,
} from "./engagementEditDraft";
import { buildStoredTacticalDebriefNotes } from "./engagementTacticalDebrief";

describe("engagementEditDraft", () => {
  it("builds patch with schedule, org, status, and product focus", () => {
    const engagement = {
      engagement_type: "office_visit_360",
      status: "planned",
      organization_id: "org-1",
      notes: null,
    };
    const patch = buildEngagementEditPatch(
      {
        engagementType: "product_demo",
        status: "in_progress",
        engagementDate: "2026-06-10",
        engagementTime: "14:30",
        locationLabel: "Metro OR",
        organizationId: "org-2",
        notes: "Rep note",
        productFocus: "ACSIS",
        objective: "Demo navigation",
      },
      engagement,
    );
    expect(patch.engagement_type).toBe("product_demo");
    expect(patch.status).toBe("in_progress");
    expect(patch.engagement_date).toBe("2026-06-10");
    expect(patch.scheduled_at).toContain("2026-06-10");
    expect(patch.organization_id).toBe("org-2");
    expect(patch.product_focus).toBe("ACSIS");
    expect(patch.observation_goal).toBe("Demo navigation");
    expect(patch.notes).toBe("Rep note");
  });

  it("preserves tactical debrief wrapper when editing debrief notes", () => {
    const stored = buildStoredTacticalDebriefNotes({ narrative: "Original" });
    const engagement = {
      engagement_type: "intro_call",
      status: "completed",
      notes: stored,
    };
    expect(readEngagementNotesDraft(engagement)).toBe("Original");
    const patch = buildEngagementEditPatch(
      {
        ...readEngagementEditDraft(engagement),
        notes: "Updated narrative",
      },
      engagement,
    );
    expect(patch.notes).toContain("Updated narrative");
    expect(patch.notes).toContain("tactical debrief");
    expect(patch.observation_goal).toBeUndefined();
  });
});
