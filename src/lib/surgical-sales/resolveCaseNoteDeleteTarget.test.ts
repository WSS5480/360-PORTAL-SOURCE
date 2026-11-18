import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { resolveCaseNoteDeleteTarget } from "./resolveCaseNoteDeleteTarget";

function chain(result: unknown) {
  const chainable = {
    select: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    maybeSingle: vi.fn(async () => result),
    order: vi.fn(() => chainable),
  };
  return chainable;
}

describe("resolveCaseNoteDeleteTarget", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("resolves operational notes by id", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "sales_operational_notes") {
        return chain({
          data: {
            id: "note-1",
            body: "Still using Bard Mesh.",
            case_id: "case-1",
            legacy_case_activity_id: "activity-1",
          },
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });

    await expect(
      resolveCaseNoteDeleteTarget({ caseId: "case-1", noteId: "note-1" }),
    ).resolves.toEqual({
      operationalNoteId: "note-1",
      activityId: "activity-1",
      noteBody: "Still using Bard Mesh.",
      noteAiExtraction: null,
    });
  });

  it("falls back to legacy activity rows when operational note is missing", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "sales_operational_notes") {
        return chain({ data: null, error: null });
      }
      if (table === "surgical_sales_case_activities") {
        return chain({
          data: {
            id: "activity-1",
            body: "Legacy note body",
            activity_type: "note",
            metadata_json: {},
          },
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });

    await expect(
      resolveCaseNoteDeleteTarget({ caseId: "case-1", noteId: "activity-1" }),
    ).resolves.toEqual({
      operationalNoteId: null,
      activityId: "activity-1",
      noteBody: "Legacy note body",
      noteAiExtraction: null,
    });
  });

  it("resolves activities linked by metadata note_id", async () => {
    let activityQueryCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "sales_operational_notes") {
        return chain({ data: null, error: null });
      }
      if (table === "surgical_sales_case_activities") {
        activityQueryCount += 1;
        if (activityQueryCount === 1) {
          return chain({ data: null, error: null });
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: [
                {
                  id: "activity-9",
                  body: "Orphan linked note",
                  activity_type: "note",
                  metadata_json: { note_id: "missing-note-id" },
                },
              ],
              error: null,
            })),
          })),
        };
      }
      return chain({ data: null, error: null });
    });

    await expect(
      resolveCaseNoteDeleteTarget({ caseId: "case-1", noteId: "missing-note-id" }),
    ).resolves.toEqual({
      operationalNoteId: "missing-note-id",
      activityId: "activity-9",
      noteBody: "Orphan linked note",
      noteAiExtraction: null,
    });
  });
});
