import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildActivityEvent } from "@/lib/activity/activityEvent";
import { useUnifiedActivityFeed } from "./useUnifiedActivityFeed";

describe("useUnifiedActivityFeed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps legacy field notes visible when unified events also exist", async () => {
    const providerId = "11111111-1111-4111-8111-111111111111";
    const unifiedEvent = buildActivityEvent({
      id: "unified-provider-update",
      type: "PROVIDER_PLANNING_UPDATED",
      title: "Provider planning updated",
      summary: "Updated workflow readiness.",
      entityType: "provider",
      entityId: providerId,
      createdAt: "2026-06-18T12:00:00.000Z",
      source: "unified_emit",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        events: [unifiedEvent],
      }),
    } as Response);

    const buildLegacyFallback = vi.fn(() => [
      {
        id: "legacy-field-note",
        category: "notes" as const,
        title: "Field note",
        summary: "Jennifer handles scheduling and requested observation details.",
        timestamp: "2026-06-18T12:05:00.000Z",
        userLabel: "Rep",
        isLegacyFallback: true,
        pulseId: "legacy-field-note",
      },
    ]);

    const { result } = renderHook(() =>
      useUnifiedActivityFeed({
        entityType: "provider",
        entityId: providerId,
        buildLegacyFallback,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.source).toBe("unified");
    expect(result.current.items.map((item) => item.title)).toEqual([
      "Field note",
      "Provider planning updated",
    ]);
    expect(result.current.items[0]?.summary).toContain("Jennifer handles scheduling");
  });
});
