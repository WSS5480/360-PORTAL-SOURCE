import { describe, expect, it } from "vitest";
import {
  buildTeamActivityFeed,
  collapseNoisyCaseUpdates,
  filterTeamActivityFeed,
  groupTeamActivityByDay,
  type TeamActivityFeedItem,
} from "./buildTeamActivityFeed";

function item(partial: Partial<TeamActivityFeedItem> & Pick<TeamActivityFeedItem, "id" | "created_at">): TeamActivityFeedItem {
  return {
    feed_kind: "case",
    activity_type: "case_updated",
    summary: "Case updated",
    body: null,
    actor_user_id: "rep-1",
    actor_display_name: "Alex",
    case_id: "case-1",
    case_number: "C-1",
    organization_id: "org-1",
    organization_name: "Mercy",
    metadata_json: null,
    ...partial,
  };
}

describe("buildTeamActivityFeed", () => {
  it("attaches org and case context, and includes organization notes", () => {
    const items = buildTeamActivityFeed({
      caseActivities: [
        {
          id: "act-1",
          case_id: "case-1",
          activity_type: "note",
          body: "Left a recap with the scheduler",
          metadata_json: null,
          created_at: "2026-09-17T14:00:00.000Z",
          user_id: "rep-1",
        },
      ],
      caseById: new Map([
        ["case-1", { case_number: "C-100", organization_id: "org-1", organization_name: "Mercy Hospital" }],
      ]),
      organizationNotes: [
        {
          id: "note-1",
          body: "Waiting on value analysis.",
          created_at: "2026-09-17T15:00:00.000Z",
          created_by_user_id: "rep-2",
          entity_id: "org-2",
        },
      ],
      organizationNameById: new Map([["org-2", "City ASC"]]),
      profileBy: new Map([
        ["rep-1", "Alex Rep"],
        ["rep-2", "Jordan Rep"],
      ]),
    });

    expect(items[0]).toMatchObject({
      feed_kind: "note",
      summary: "Organization note",
      actor_display_name: "Jordan Rep",
      organization_name: "City ASC",
      case_id: null,
    });
    expect(items[1]).toMatchObject({
      feed_kind: "note",
      actor_display_name: "Alex Rep",
      case_number: "C-100",
      organization_name: "Mercy Hospital",
      body: "Left a recap with the scheduler",
    });
  });

  it("collapses repeated case updates from the same rep on the same case", () => {
    const collapsed = collapseNoisyCaseUpdates([
      item({ id: "1", created_at: "2026-09-17T14:20:00.000Z" }),
      item({ id: "2", created_at: "2026-09-17T14:10:00.000Z" }),
      item({ id: "3", created_at: "2026-09-17T14:05:00.000Z" }),
      item({ id: "4", created_at: "2026-09-17T12:00:00.000Z", activity_type: "note", feed_kind: "note", summary: "Note" }),
    ]);
    expect(collapsed).toHaveLength(2);
    expect(collapsed[0].summary).toBe("Case updated · 3 times");
    expect(collapsed[1].summary).toBe("Note");
  });

  it("groups by local day and combines type, person, org, time, and search filters", () => {
    const now = new Date(2026, 8, 17, 16, 0, 0);
    const items: TeamActivityFeedItem[] = [
      item({
        id: "today",
        created_at: new Date(2026, 8, 17, 10, 0, 0).toISOString(),
        feed_kind: "note",
        activity_type: "note",
        body: "Talked with scheduler",
      }),
      item({
        id: "older",
        created_at: new Date(2026, 8, 16, 10, 0, 0).toISOString(),
        actor_user_id: "rep-2",
        actor_display_name: "Jordan",
        organization_id: "org-2",
        organization_name: "City ASC",
      }),
    ];
    const groups = groupTeamActivityByDay(items, now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday"]);
    expect(filterTeamActivityFeed(items, { actorUserId: "rep-2" })).toHaveLength(1);
    expect(filterTeamActivityFeed(items, { kind: "note" })).toHaveLength(1);
    expect(filterTeamActivityFeed(items, { organizationId: "org-2" })).toHaveLength(1);
    expect(filterTeamActivityFeed(items, { when: "today", now })).toHaveLength(1);
    expect(filterTeamActivityFeed(items, { query: "scheduler" })).toHaveLength(1);
    expect(filterTeamActivityFeed(items, { kind: "note", when: "yesterday", now })).toHaveLength(0);
  });
});
