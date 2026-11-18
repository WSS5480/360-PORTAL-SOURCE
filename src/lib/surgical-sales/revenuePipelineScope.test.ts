import { describe, expect, it } from "vitest";
import {
  canViewRevenuePipelineTeam,
  parseRevenuePipelineScope,
  revenuePipelineRepIdsForScope,
} from "./revenuePipelineScope";

describe("revenuePipelineScope", () => {
  const managerId = "11111111-1111-1111-1111-111111111111";
  const repId = "22222222-2222-2222-2222-222222222222";

  it("only territory managers get a team pipeline", () => {
    expect(canViewRevenuePipelineTeam({ isTerritoryManager: true })).toBe(true);
    expect(canViewRevenuePipelineTeam({ isTerritoryManager: false })).toBe(false);
    expect(canViewRevenuePipelineTeam({})).toBe(false);
  });

  it("defaults managers to team and everyone else to mine", () => {
    expect(parseRevenuePipelineScope(null, true)).toBe("team");
    expect(parseRevenuePipelineScope("team", true)).toBe("team");
    expect(parseRevenuePipelineScope("mine", true)).toBe("mine");
    expect(parseRevenuePipelineScope("team", false)).toBe("mine");
    expect(parseRevenuePipelineScope(null, false)).toBe("mine");
  });

  it("includes the manager and assigned reps in team scope, without duplicates", () => {
    expect(
      revenuePipelineRepIdsForScope({
        viewerId: managerId,
        scope: "mine",
        assignedRepIds: [repId],
      }),
    ).toEqual([managerId]);

    expect(
      revenuePipelineRepIdsForScope({
        viewerId: managerId,
        scope: "team",
        assignedRepIds: [repId, managerId, "", repId],
      }),
    ).toEqual([managerId, repId]);
  });
});
