import { describe, expect, it } from "vitest";
import {
  buildOrganizationActivityFeed,
  mapOrganizationStatusNotes,
} from "@/lib/surgical-sales/buildOrganizationActivityFeed";

describe("mapOrganizationStatusNotes", () => {
  it("resolves actor names from the profile map", () => {
    const notes = mapOrganizationStatusNotes(
      [
        {
          id: "note-1",
          body: "  PO submitted to materials  ",
          note_type: "general",
          created_at: "2026-09-01T12:00:00.000Z",
          created_by_user_id: "user-1",
        },
      ],
      new Map([["user-1", "Alex Rep"]]),
    );
    expect(notes).toEqual([
      {
        id: "note-1",
        body: "PO submitted to materials",
        created_at: "2026-09-01T12:00:00.000Z",
        created_by_user_id: "user-1",
        actor_display_name: "Alex Rep",
        note_type: "general",
      },
    ]);
  });
});

describe("buildOrganizationActivityFeed", () => {
  it("includes organization status notes as note items without attaching a case", () => {
    const items = buildOrganizationActivityFeed({
      caseActivities: [
        {
          id: "act-1",
          case_id: "case-1",
          activity_type: "note",
          body: "Saw the surgeon after the case",
          metadata_json: null,
          created_at: "2026-09-01T11:00:00.000Z",
          user_id: "user-1",
        },
      ],
      caseNumberById: new Map([["case-1", "C-100"]]),
      contacts: [],
      relationships: [],
      organizationNotes: [
        {
          id: "note-1",
          body: "Waiting on value analysis committee.",
          created_at: "2026-09-01T12:00:00.000Z",
          created_by_user_id: "user-1",
          actor_display_name: "Alex Rep",
          note_type: "general",
        },
      ],
      profileBy: new Map([["user-1", "Alex Rep"]]),
    });

    expect(items[0]).toMatchObject({
      id: "org-note-note-1",
      feed_kind: "note",
      summary: "Organization note",
      body: "Waiting on value analysis committee.",
      case_id: null,
    });
    expect(items[1]).toMatchObject({
      id: "ca-act-1",
      feed_kind: "note",
      case_id: "case-1",
    });
  });

  it("skips empty organization notes", () => {
    const items = buildOrganizationActivityFeed({
      caseActivities: [],
      caseNumberById: new Map(),
      contacts: [],
      relationships: [],
      organizationNotes: [
        {
          id: "blank",
          body: "",
          created_at: "2026-09-01T12:00:00.000Z",
          created_by_user_id: "user-1",
          actor_display_name: "Alex Rep",
          note_type: "general",
        },
      ],
      profileBy: new Map(),
    });
    expect(items).toEqual([]);
  });
});
