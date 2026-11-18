import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureObservationCaseInProgressBeforeCapture,
  observationCaseNotesApiPath,
  resolveObservationCasePreviewForDictateComplete,
  runMissionBoardObservationDictateComplete,
  saveObservationCaseNote,
} from "./missionBoardObservationDictateComplete";

const patchMissionBoardObservationCase = vi.fn(async () => undefined);
const markMissionBoardObservationComplete = vi.fn(async () => undefined);

vi.mock("@/lib/surgical-sales/missionBoardObservationCaseActions", () => ({
  patchMissionBoardObservationCase: (...args: unknown[]) => patchMissionBoardObservationCase(...args),
  markMissionBoardObservationComplete: (...args: unknown[]) => markMissionBoardObservationComplete(...args),
}));

function src(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("missionBoardObservationDictateComplete", () => {
  beforeEach(() => {
    patchMissionBoardObservationCase.mockClear();
    markMissionBoardObservationComplete.mockClear();
  });

  it("uses the surgical case notes API path shared with Case Detail", () => {
    expect(observationCaseNotesApiPath("case-abc")).toBe(
      "/api/portal/sales/surgical-cases/case-abc/notes",
    );

    const caseDetail = src("src/app/portal/sales/cases/[caseId]/SurgicalCaseDetailPortalClient.tsx");
    expect(caseDetail).toContain("/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/notes");
    expect(caseDetail).not.toContain("runMissionBoardObservationDictateComplete");
    expect(caseDetail).not.toContain("MissionBoardObservationDictateCompleteModal");
  });

  it("posts note body to the case notes endpoint with optional capture_mode", async () => {
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("/api/portal/sales/surgical-cases/case-1/notes");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        body: "Tray workflow looked smooth.",
        capture_mode: "voice",
      });
      return new Response(JSON.stringify({ ok: true, note: { id: "note-1" }, intelligence: null }), {
        status: 200,
      });
    });

    await saveObservationCaseNote(
      { caseId: "case-1", body: "Tray workflow looked smooth.", captureMode: "voice" },
      fetchFn,
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("runs OIE save then marks only the selected case complete", async () => {
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/portal/sales/surgical-cases/case-selected/notes") {
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            ok: true,
            note: { id: "note-1" },
            intelligence: { ai_extraction: { facts: [] } },
          }),
          { status: 200 },
        );
      }
      if (url === "/api/portal/sales/surgical-cases/case-selected") {
        return new Response(
          JSON.stringify({ ok: true, case: { id: "case-selected", status: "confirmed" } }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await runMissionBoardObservationDictateComplete(
      {
        caseId: "case-selected",
        noteBody: "Competitor tray in room B.",
        captureMode: "voice",
      },
      fetchFn,
    );

    expect(markMissionBoardObservationComplete).toHaveBeenCalledTimes(1);
    expect(markMissionBoardObservationComplete).toHaveBeenCalledWith("case-selected");
    expect(result.toast.title).toBe("Observation completed");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/portal/sales/surgical-cases/case-selected/notes",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not complete a different case when saving another case id", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/notes")) {
        return new Response(JSON.stringify({ ok: true, note: { id: "note-2" } }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ ok: true, case: { id: "case-a", status: "confirmed" } }),
        { status: 200 },
      );
    });

    await runMissionBoardObservationDictateComplete({ caseId: "case-a", noteBody: "Note A" }, fetchFn);
    await runMissionBoardObservationDictateComplete({ caseId: "case-b", noteBody: "Note B" }, fetchFn);

    expect(markMissionBoardObservationComplete).toHaveBeenNthCalledWith(1, "case-a");
    expect(markMissionBoardObservationComplete).toHaveBeenNthCalledWith(2, "case-b");
    expect(markMissionBoardObservationComplete).not.toHaveBeenCalledWith("case-other");
  });

  it("starts scheduled cases before capture like Case Detail", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url === "/api/portal/sales/surgical-cases/case-sched") {
        return new Response(
          JSON.stringify({ ok: true, case: { id: "case-sched", status: "scheduled" } }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await ensureObservationCaseInProgressBeforeCapture("case-sched", fetchFn);

    expect(patchMissionBoardObservationCase).toHaveBeenCalledWith("case-sched", {
      status: "confirmed",
    });
  });

  it("does not mark complete when note save fails", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/notes")) {
        return new Response(JSON.stringify({ ok: false, error: "Save failed" }), { status: 500 });
      }
      return new Response(
        JSON.stringify({ ok: true, case: { id: "case-fail", status: "confirmed" } }),
        { status: 200 },
      );
    });

    await expect(
      runMissionBoardObservationDictateComplete({ caseId: "case-fail", noteBody: "Note" }, fetchFn),
    ).rejects.toThrow(/save/i);

    expect(markMissionBoardObservationComplete).not.toHaveBeenCalled();
  });

  it("resolves scheduled observation preview by case id for Dictate & Complete", () => {
    const preview = resolveObservationCasePreviewForDictateComplete({
      caseId: "case-2",
      scheduledCases: [
        {
          caseId: "case-1",
          procedureLabel: "Knee",
          dateTimeLabel: null,
          caseDate: null,
          caseTime: null,
          facilityLabel: "Main OR",
          statusLabel: "Scheduled",
        },
        {
          caseId: "case-2",
          procedureLabel: "Hip",
          dateTimeLabel: null,
          caseDate: null,
          caseTime: null,
          facilityLabel: "Main OR",
          statusLabel: "Scheduled",
        },
      ],
    });

    expect(preview?.caseId).toBe("case-2");
    expect(preview?.procedureLabel).toBe("Hip");
    expect(
      resolveObservationCasePreviewForDictateComplete({ caseId: "", scheduledCases: [] }),
    ).toBeNull();
  });
});

describe("mission board relationship capture unchanged", () => {
  it("keeps general Mission Board Dictate on capture intelligence (RIE)", () => {
    const board = src("src/app/portal/sales/providers/ProvidersMissionBoard.tsx");
    expect(board).toMatch(/handleDictateCapture[\s\S]*capture\.open/);
    expect(board).toMatch(/buildCaptureIntelligenceOpenContext\("mission_board"/);
    expect(board).not.toMatch(/handleDictateCapture[\s\S]*runMissionBoardObservationDictateComplete/);
  });

  it("routes Dictate and Complete through observation case notes instead of capture intelligence", () => {
    const board = src("src/app/portal/sales/providers/ProvidersMissionBoard.tsx");
    const modal = src("src/app/portal/sales/providers/MissionBoardObservationDictateCompleteModal.tsx");
    const observationHandler = board.slice(
      board.indexOf("const handleDictateCompleteObservation"),
      board.indexOf("const handleDragEnd"),
    );
    expect(board).toContain("MissionBoardObservationDictateCompleteModal");
    expect(observationHandler).not.toContain("capture.open");
    expect(modal).toContain("runMissionBoardObservationDictateComplete");
    expect(modal).toContain("ObservationCaseNoteCapture");
    expect(modal).toContain("data-testid=\"mission-board-dictate-complete-modal\"");
    expect(modal).toMatch(/mission-board-dictate-complete-backdrop[\s\S]*mission-board-dictate-complete-modal/);
  });

  it("does not complete intro call engagements when Dictate & Complete merely opens", () => {
    const board = src("src/app/portal/sales/providers/ProvidersMissionBoard.tsx");
    const overview = src("src/app/portal/sales/providers/[providerId]/ProviderOverviewMissionCard.tsx");
    const boardHandler = board.slice(
      board.indexOf("const handleIntroDictateComplete"),
      board.indexOf("const handleStartEvaluation"),
    );
    const overviewHandler = overview.slice(
      overview.indexOf("const handleIntroDictateComplete"),
      overview.indexOf("const runMissionBoardShortcut"),
    );

    expect(boardHandler).toContain("capture.open");
    expect(overviewHandler).toContain("capture.open");
    expect(boardHandler).not.toContain("prepareMissionBoardIntroCallForDebrief");
    expect(overviewHandler).not.toContain("prepareMissionBoardIntroCallForDebrief");
    expect(boardHandler).toContain("finalizeMissionBoardIntroCallDebriefAfterCapture");
    expect(overviewHandler).toContain("finalizeMissionBoardIntroCallDebriefAfterCapture");
  });

  it("leaves debrief log-update workflow untouched", () => {
    const workflow = src("src/components/sales/aiNoteCapture/AiNoteCaptureWorkflow.tsx");
    expect(workflow).toContain("/api/portal/sales/log-update/map");
    expect(workflow).toContain("/api/portal/sales/providers/${encodeURIComponent(context.providerId)}/log-update");
    expect(workflow).not.toContain("runMissionBoardObservationDictateComplete");
  });

  it("leaves tactical debrief analyze path untouched", () => {
    const debrief = src("src/app/portal/sales/engagements/[engagementId]/prepare/PrepareTacticalDebriefSheet.tsx");
    expect(debrief).toContain("/prepare/debrief/analyze");
    expect(debrief).toContain("/log-update");
    expect(debrief).not.toContain("runMissionBoardObservationDictateComplete");
  });
});

describe("observation intelligence routing guardrails", () => {
  it("routes Provider Overview Dictate & Complete through OIE, not capture intelligence", () => {
    const overview = src("src/app/portal/sales/providers/[providerId]/ProviderOverviewMissionCard.tsx");
    const observationHandler = overview.slice(
      overview.indexOf("const handleObservationMissionAction"),
      overview.indexOf("function renderPrimaryMissionBody"),
    );
    expect(overview).toContain("MissionBoardObservationDictateCompleteModal");
    expect(overview).toContain("resolveObservationCasePreviewForDictateComplete");
    expect(overview).toMatch(/action\.id === "dictate_complete"[\s\S]*setDictateCompleteModal/);
    expect(observationHandler).not.toContain("capture.open");
  });

  it("requires a selected observation case before Provider Overview Dictate & Complete", () => {
    const overview = src("src/app/portal/sales/providers/[providerId]/ProviderOverviewMissionCard.tsx");
    expect(overview).toMatch(/action\.id === "dictate_complete"[\s\S]*!action\.caseId[\s\S]*Select an observation case first/);
    expect(overview).toMatch(/resolveObservationCasePreviewForDictateComplete[\s\S]*!preview[\s\S]*Select an observation case first/);
  });

  it("keeps Case Detail field-note dictation on the surgical case notes API (OIE)", () => {
    const caseDetail = src("src/app/portal/sales/cases/[caseId]/SurgicalCaseDetailPortalClient.tsx");
    const noteCapture = src("src/app/portal/sales/cases/[caseId]/ObservationCaseNoteCapture.tsx");
    expect(caseDetail).toContain("/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/notes");
    expect(noteCapture).toContain("onSaveNote");
    expect(caseDetail).not.toContain("MissionBoardObservationDictateCompleteModal");
    expect(caseDetail).not.toMatch(/isObservationCase[\s\S]*\/log-update/);
  });

  it("hides observation case header Log update so RIE is not the primary OR note path", () => {
    const shell = src("src/app/portal/sales/cases/[caseId]/SurgicalCaseDetailShell.tsx");
    const portal = src("src/app/portal/sales/cases/[caseId]/SurgicalCaseDetailPortalClient.tsx");
    expect(shell).toMatch(/!observationLayout && LOG_UPDATE_UI_ENABLED/);
    expect(portal).toMatch(/\{!isObservationCase && LOG_UPDATE_UI_ENABLED[\s\S]*openCaptureIntelligence/);
    expect(portal).not.toMatch(/\{isObservationCase && LOG_UPDATE_UI_ENABLED[\s\S]*openCaptureIntelligence/);
  });
});
