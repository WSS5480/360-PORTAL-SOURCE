import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ObservationFactExtraction } from "@/lib/surgical-sales/observationIntelligence/observationFactTypes";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockExtractV2 = vi.fn();
vi.mock("@/lib/surgical-sales/observationIntelligence/extractObservationFactsV2", () => ({
  extractObservationFactsV2: (...args: unknown[]) => mockExtractV2(...args),
}));

const mockExtractHybrid = vi.fn();
vi.mock("@/lib/surgical-sales/observationIntelligence/extractObservationFactsHybrid", () => ({
  extractObservationFactsHybrid: (...args: unknown[]) => mockExtractHybrid(...args),
}));

import { processObservationNoteCapture } from "./processObservationNoteCapture";

type UpdateRecord = { table: string; payload: Record<string, unknown> };

function buildSupabaseMock(options: {
  providerRow?: Record<string, unknown> | null;
  activityRow?: Record<string, unknown> | null;
  updates: UpdateRecord[];
}) {
  mockFrom.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    Object.assign(chain, {
      select: vi.fn(self),
      order: vi.fn(self),
      eq: vi.fn(self),
      limit: vi.fn(async () => ({ data: [], error: null })),
      maybeSingle: vi.fn(async () => {
        if (table === "surgical_sales_contacts") {
          return { data: options.providerRow ?? null, error: null };
        }
        if (table === "surgical_sales_case_activities") {
          return { data: options.activityRow ?? { metadata_json: {} }, error: null };
        }
        return { data: null, error: null };
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        options.updates.push({ table, payload });
        return chain;
      }),
      then: (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null }),
    });
    return chain;
  });
}

const NOTE_BODY =
  "Pretty routine case overall. They're still using Bard Mesh. Staff was good. Everyone seemed to know what they were doing. There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major.";

function v2Envelope(): ObservationFactExtraction {
  return {
    facts: [
      {
        type: "current_product",
        value: "Bard Mesh",
        evidence: "They're still using Bard Mesh.",
        polarity: "neutral",
        confirmation_state: "witnessed",
        validation: { status: "accepted" },
      },
      {
        type: "staff_efficiency",
        value: "coordinated team",
        evidence: "Everyone seemed to know what they were doing.",
        polarity: "positive",
        confirmation_state: "witnessed",
        validation: { status: "accepted" },
      },
      {
        type: "workflow_delay",
        value: "delay caused by readiness issue",
        evidence: "There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major.",
        polarity: "negative",
        confirmation_state: "witnessed",
        validation: { status: "suppressed", reason: "minimized" },
      },
    ],
    extractedAt: "2026-06-09T00:00:00.000Z",
    model: "facts-v2-ai",
    validation_version: 1,
    extraction_ms: 900,
    legacy_facts: [],
  };
}

const BASE_INPUT = {
  caseId: "case-1",
  noteId: "note-1",
  noteBody: NOTE_BODY,
  legacyCaseActivityId: "activity-1",
};

describe("processObservationNoteCapture — v2 choke point", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockExtractV2.mockReset();
    mockExtractHybrid.mockReset();
    process.env.OBSERVATION_AI_FIRST_EXTRACTION = "1";
  });

  it("persists the full audited envelope but feeds adapters accepted facts only", async () => {
    const updates: UpdateRecord[] = [];
    buildSupabaseMock({ providerRow: { id: "provider-1" }, updates });
    mockExtractV2.mockResolvedValue(v2Envelope());

    const result = await processObservationNoteCapture({
      ...BASE_INPUT,
      caseRow: { case_type: "observation", surgeon_contact_id: "provider-1" },
    });

    expect(mockExtractV2).toHaveBeenCalledWith(NOTE_BODY);
    expect(mockExtractHybrid).not.toHaveBeenCalled();

    // Stored note envelope: all 3 facts (suppressed included) + validation_version.
    const noteUpdate = updates.find((row) => row.table === "sales_operational_notes");
    const storedNote = noteUpdate?.payload.ai_extraction_json as Record<string, unknown>;
    expect(storedNote.validation_version).toBe(1);
    expect(storedNote.extraction_ms).toBe(900);
    expect((storedNote.facts as unknown[]).length).toBe(3);

    // Suppressed delay never reaches case live fields or the snapshot.
    const caseUpdate = updates.find((row) => row.table === "surgical_sales_cases");
    const caseText = JSON.stringify(caseUpdate?.payload ?? {});
    expect(caseText).not.toContain("delay caused by readiness issue");
    expect(caseText).not.toContain("readiness");

    // Activity metadata mirrors the audited envelope.
    const activityUpdate = updates.find((row) => row.table === "surgical_sales_case_activities");
    const activityExtraction = (activityUpdate?.payload.metadata_json as Record<string, unknown>)
      ?.ai_extraction as Record<string, unknown>;
    expect(activityExtraction.validation_version).toBe(1);
    expect((activityExtraction.facts as unknown[]).length).toBe(3);
    expect((activityUpdate?.payload.metadata_json as Record<string, unknown>)?.intelligence_processing).toBe(false);

    // Downstream result extraction has no suppressed-delay entity.
    expect(JSON.stringify(result?.extraction)).not.toContain("delay caused by readiness issue");
  });

  it("does not promote positive staff facts to provider_staff_frustrations (§5)", async () => {
    const updates: UpdateRecord[] = [];
    buildSupabaseMock({ providerRow: { id: "provider-1" }, updates });
    mockExtractV2.mockResolvedValue(v2Envelope());

    await processObservationNoteCapture({
      ...BASE_INPUT,
      caseRow: { case_type: "observation", surgeon_contact_id: "provider-1" },
    });

    const providerUpdates = updates.filter((row) => row.table === "surgical_sales_contacts");
    expect(providerUpdates.length).toBe(1);
    const providerPatch = providerUpdates[0]!.payload;
    expect(providerPatch.provider_staff_frustrations).toBeUndefined();
    // Product intelligence still promotes.
    expect(String(providerPatch.provider_current_vendors ?? "")).toContain("Bard Mesh");
  });

  it("logs promotion skips on the envelope when first-writer-wins blocks a patch (§5b)", async () => {
    const updates: UpdateRecord[] = [];
    buildSupabaseMock({
      providerRow: {
        id: "provider-1",
        provider_current_vendors: "Already documented vendor intelligence from intro call.",
      },
      updates,
    });
    mockExtractV2.mockResolvedValue(v2Envelope());

    await processObservationNoteCapture({
      ...BASE_INPUT,
      caseRow: { case_type: "observation", surgeon_contact_id: "provider-1" },
    });

    const noteUpdates = updates.filter((row) => row.table === "sales_operational_notes");
    const lastNotePayload = noteUpdates.at(-1)?.payload.ai_extraction_json as Record<string, unknown>;
    const skips = lastNotePayload.promotion_skips as Array<Record<string, string>>;
    expect(skips?.length).toBeGreaterThan(0);
    expect(skips[0]?.db_key).toBe("provider_current_vendors");
    expect(skips[0]?.existing_preview).toContain("Already documented");
  });

  it("flag off — uses the legacy hybrid extractor and stores no validation_version", async () => {
    process.env.OBSERVATION_AI_FIRST_EXTRACTION = "0";
    const updates: UpdateRecord[] = [];
    buildSupabaseMock({ providerRow: { id: "provider-1" }, updates });
    mockExtractHybrid.mockResolvedValue({
      facts: [
        { type: "current_product", value: "Bard Mesh", evidence: "They're still using Bard Mesh." },
      ],
      extractedAt: "2026-06-09T00:00:00.000Z",
      model: "facts-v1",
    });

    await processObservationNoteCapture({
      ...BASE_INPUT,
      caseRow: { case_type: "observation", surgeon_contact_id: "provider-1" },
    });

    expect(mockExtractV2).not.toHaveBeenCalled();
    const noteUpdate = updates.find((row) => row.table === "sales_operational_notes");
    const storedNote = noteUpdate?.payload.ai_extraction_json as Record<string, unknown>;
    expect(storedNote.validation_version).toBeUndefined();
    expect(storedNote.model).toBe("facts-v1");
  });
});
