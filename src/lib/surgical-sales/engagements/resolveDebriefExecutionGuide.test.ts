import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDebriefExecutionGuide } from "./resolveDebriefExecutionGuide";
import { buildSampleWorkspaceFixture } from "./resolveDebriefExecutionGuide.fixture";

vi.mock("./resolveDebriefPrepareWorkspace", () => ({
  resolveDebriefPrepareWorkspaceForEngagement: vi.fn(),
}));

import { resolveDebriefPrepareWorkspaceForEngagement } from "./resolveDebriefPrepareWorkspace";

const mockedResolveWorkspace = vi.mocked(resolveDebriefPrepareWorkspaceForEngagement);

describe("resolveDebriefExecutionGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generated guide when Prepare workspace was not saved", async () => {
    mockedResolveWorkspace.mockResolvedValueOnce({
      ok: true,
      workspace: buildSampleWorkspaceFixture(null),
    });

    const result = await resolveDebriefExecutionGuide({
      engagement: {
        engagement_type: "provider_debrief",
        debrief_intelligence_snapshot: null,
      },
      engagementId: "eng-1",
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.guide.source).toBe("generated_from_observation_patterns");
    expect(result.guide.whatWeObserved.length).toBeGreaterThan(0);
  });

  it("returns saved Prepare workspace content when rep edits exist", async () => {
    const savedSnapshot = {
      meetingObjective: "",
      hypothesis: "",
      learnItems: [{ id: "learn-custom", text: "Saved Prepare validation item", checked: false }],
      questionCards: [{ id: "question-custom", text: "Saved Prepare question?", used: false }],
      desiredOutcome: "follow_up" as const,
      desiredOutcomeOther: "",
      meetingNotes: "",
      updatedAt: "2026-06-12T12:00:00.000Z",
    };

    mockedResolveWorkspace.mockResolvedValueOnce({
      ok: true,
      workspace: buildSampleWorkspaceFixture(savedSnapshot),
    });

    const result = await resolveDebriefExecutionGuide({
      engagement: {
        engagement_type: "provider_debrief",
        debrief_intelligence_snapshot: {
          debrief_prepare_workspace: savedSnapshot,
        },
      },
      engagementId: "eng-1",
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.guide.source).toBe("saved_prepare_workspace");
    expect(result.guide.whatToValidate).toContain("Saved Prepare validation item");
    expect(result.guide.conversationStarters).toContain("Saved Prepare question?");
  });

  it("rejects non-debrief engagement types", async () => {
    const result = await resolveDebriefExecutionGuide({
      engagement: { engagement_type: "intro_call" },
      engagementId: "eng-1",
      userId: "user-1",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(mockedResolveWorkspace).not.toHaveBeenCalled();
  });
});
