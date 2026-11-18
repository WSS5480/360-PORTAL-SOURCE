import { beforeEach, describe, expect, it, vi } from "vitest";
import { quickCaptureFieldIntelligence } from "@/lib/surgical-sales/quickCaptureFieldIntelligence";

const mocks = vi.hoisted(() => ({
  applyLogUpdate: vi.fn(),
  loadMappingContext: vi.fn(),
  runExtraction: vi.fn(),
  buildParse: vi.fn(),
  appendPending: vi.fn(),
  persistCandidates: vi.fn(),
  buildContacts: vi.fn(),
  captureUniversal: vi.fn(),
  resolveEngagementType: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mocks.resolveEngagementType,
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/surgical-sales/universalExtractor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/surgical-sales/universalExtractor")>();
  return {
    ...actual,
    captureUniversalSurgicalIntelligence: mocks.captureUniversal,
  };
});

vi.mock("@/lib/surgical-sales/logUpdateApplyProvider", () => ({
  applyLogUpdateToProvider: mocks.applyLogUpdate,
}));

vi.mock("@/lib/surgical-sales/loadLogUpdateMappingContext", () => ({
  loadLogUpdateMappingContext: mocks.loadMappingContext,
}));

vi.mock("@/lib/surgical-sales/debriefIntelligencePipeline", () => ({
  runOpenAiDebriefFactExtraction: mocks.runExtraction,
  buildParseResultFromDebriefFacts: mocks.buildParse,
}));

vi.mock("@/lib/surgical-sales/pendingIntelligenceCapture", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/surgical-sales/pendingIntelligenceCapture")>();
  return {
    ...actual,
    appendPendingIntelligenceCapture: mocks.appendPending,
    countIntelligenceSuggestionsFromParse: vi.fn(() => ({
      count: 0,
      labels: [],
    })),
  };
});

vi.mock("@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview", () => ({
  buildInitialProposedContacts: mocks.buildContacts,
}));

vi.mock("@/lib/surgical-sales/candidateContactIntelligence", () => ({
  persistProviderCandidateContacts: mocks.persistCandidates,
}));

describe("quickCaptureFieldIntelligence", () => {
  beforeEach(() => {
    mocks.applyLogUpdate.mockReset();
    mocks.loadMappingContext.mockReset();
    mocks.runExtraction.mockReset();
    mocks.buildParse.mockReset();
    mocks.appendPending.mockReset();
    mocks.persistCandidates.mockReset();
    mocks.buildContacts.mockReset();
    mocks.captureUniversal.mockReset();
    mocks.resolveEngagementType.mockReset();

    mocks.captureUniversal.mockResolvedValue(null);
    mocks.resolveEngagementType.mockResolvedValue({ data: null });

    mocks.applyLogUpdate.mockResolvedValue({ ok: true, saved: 1 });
    mocks.loadMappingContext.mockResolvedValue({
      existingKnownFields: {},
      discoveryContext: null,
    });
    mocks.runExtraction.mockResolvedValue({ facts: [] });
    mocks.buildContacts.mockReturnValue([]);
    mocks.buildParse.mockReturnValue({
      sourceText: "Amy handles scheduling. Karen is front desk.",
      suggestedUpdates: [],
      fieldUpdates: [],
      intelligenceReview: {
        confirmedUpdates: [],
        partiallyConfirmed: [],
        stillWorthConfirming: [],
        relatedOperationalAreas: [],
      },
      stillMissing: [],
      saveAsNoteAccepted: false,
      usesProviderIntelligence: true,
      aiMapping: null,
    });
    mocks.appendPending.mockResolvedValue({ ok: true });
    mocks.persistCandidates.mockResolvedValue(undefined);
  });

  it("saves the raw field note immediately without intelligence field patches", async () => {
    mocks.buildContacts.mockReturnValue([]);

    const result = await quickCaptureFieldIntelligence({
      providerId: "prov-1",
      userId: "rep-1",
      actorName: "Rep",
      rawNote: "Left voicemail.",
      launchSurface: "mission_board",
    });

    expect(result.ok).toBe(true);
    expect(mocks.applyLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAsNote: true,
        fieldPatches: [],
        sourceText: "Left voicemail.",
      }),
    );
    expect(mocks.appendPending).not.toHaveBeenCalled();
  });

  it("keeps the field note saved when mapping context is unavailable", async () => {
    mocks.loadMappingContext.mockResolvedValue(null);

    const result = await quickCaptureFieldIntelligence({
      providerId: "prov-1",
      userId: "rep-1",
      actorName: "Rep",
      rawNote: "Karen asked us to coordinate observation through the front desk.",
      launchSurface: "mission_board",
      context: { providerId: "prov-1", providerLabel: "Dr. Apple" },
    });

    expect(result).toEqual({
      ok: true,
      suggestionCount: 0,
      suggestionLabels: [],
      captureId: "",
      mappingWarning: "AI mapping unavailable — field note saved.",
    });
    expect(mocks.captureUniversal).toHaveBeenCalledWith(
      expect.objectContaining({
        raw_note: "Karen asked us to coordinate observation through the front desk.",
        context: expect.objectContaining({
          provider_display_name: "Dr. Apple",
        }),
      }),
    );
    expect(mocks.appendPending).not.toHaveBeenCalled();
  });

  it("stores mentioned contacts as candidate contacts without pending review or CRM creation", async () => {
    mocks.buildContacts.mockReturnValue([
      {
        id: "c-amy",
        displayName: "Amy",
        roleLabel: "Scheduling Coordinator",
        disposition: "accepted",
        linkedContactId: "should-clear",
      },
      {
        id: "c-karen",
        displayName: "Karen",
        roleLabel: "Front Desk",
        disposition: "pending",
      },
      {
        id: "c-mike",
        displayName: "Mike",
        roleLabel: "Credentialing Contact",
        disposition: "link",
        linkedContactId: "should-clear",
      },
    ]);

    const result = await quickCaptureFieldIntelligence({
      providerId: "prov-1",
      userId: "rep-1",
      actorName: "Rep",
      rawNote: "Amy handles scheduling. Karen is front desk. Mike does credentialing.",
      launchSurface: "mission_board",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestionCount).toBe(3);
    expect(mocks.appendPending).not.toHaveBeenCalled();
    expect(mocks.persistCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "prov-1",
        contacts: expect.arrayContaining([
          expect.objectContaining({ displayName: "Amy" }),
          expect.objectContaining({ displayName: "Karen" }),
          expect.objectContaining({ displayName: "Mike" }),
        ]),
      }),
    );
  });

  it("awaits universal extraction before completing background capture", async () => {
    mocks.buildContacts.mockReturnValue([]);

    const result = await quickCaptureFieldIntelligence({
      providerId: "prov-1",
      userId: "rep-1",
      actorName: "Rep",
      rawNote: "Amy handles scheduling.",
      launchSurface: "provider",
    });

    expect(result.ok).toBe(true);
    expect(mocks.captureUniversal).toHaveBeenCalledWith(
      expect.objectContaining({
        raw_note: "Amy handles scheduling.",
        declared_source_type: "discovery_note",
        context: expect.objectContaining({
          provider_id: "prov-1",
        }),
        created_by_user_id: "rep-1",
      }),
    );
  });

  it("auto-applies safe field updates without creating a pending review", async () => {
    mocks.buildContacts.mockReturnValue([]);
    mocks.buildParse.mockReturnValue({
      sourceText: "Asked whether ACSIS works with existing suction setup.",
      suggestedUpdates: [],
      fieldUpdates: [
        {
          id: "product-interest",
          label: "Product interests",
          dbKey: "provider_product_interests",
          proposedValue: "ACSIS interest: suction setup compatibility",
          accepted: false,
          conflict: null,
        },
      ],
      intelligenceReview: {
        confirmedUpdates: [],
        partiallyConfirmed: [],
        stillWorthConfirming: [],
        relatedOperationalAreas: [],
      },
      stillMissing: [],
      saveAsNoteAccepted: false,
      usesProviderIntelligence: true,
      aiMapping: null,
    });

    const result = await quickCaptureFieldIntelligence({
      providerId: "prov-1",
      userId: "rep-1",
      actorName: "Rep",
      rawNote: "Asked whether ACSIS works with existing suction setup.",
      launchSurface: "provider",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestionCount).toBe(1);
    expect(mocks.appendPending).not.toHaveBeenCalled();
    expect(mocks.applyLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAsNote: false,
        fieldPatches: [
          {
            dbKey: "provider_product_interests",
            value: "ACSIS interest: suction setup compatibility",
            mergeStrategy: "append",
          },
        ],
      }),
    );
  });

  it("runs shadow universal extraction as intro_call when engagement is intro call", async () => {
    mocks.buildContacts.mockReturnValue([]);
    mocks.resolveEngagementType.mockResolvedValue({ data: { engagement_type: "intro_call" } });

    const result = await quickCaptureFieldIntelligence({
      providerId: "prov-1",
      userId: "rep-1",
      actorName: "Rep",
      rawNote: "Discussed mesh portfolio and sizing concerns.",
      launchSurface: "mission_board",
      engagementId: "eng-1",
    });

    expect(result.ok).toBe(true);
    expect(mocks.captureUniversal).toHaveBeenCalledWith(
      expect.objectContaining({
        declared_source_type: "intro_call",
        context: expect.objectContaining({
          encounter_id: "eng-1",
        }),
      }),
    );
  });
});
