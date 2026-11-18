import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { MissionBoardDebriefStatusModal } from "./MissionBoardDebriefStatusModal";
import {
  DEBRIEF_COMPLETE_LABEL,
  DEBRIEF_RESUME_LABEL,
  DEBRIEF_START_LABEL,
} from "@/lib/surgical-sales/debriefEngagementLifecycle";
import { MISSION_BOARD_DEBRIEF_LOG_OUTCOME_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";
const ENGAGEMENT_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("@/hooks/useSpeechDictation", () => ({
  isBrowserSpeechRecognitionSupported: () => true,
  isVoiceCaptureAvailable: () => true,
  salesDictationOptions: (extra?: object) => ({
    serverTranscribe: true,
    preferBrowser: false,
    allowServerFallback: true,
    ...extra,
  }),
  useSpeechDictation: () => ({
    dictating: false,
    dictationPaused: false,
    transcribing: false,
    dictationError: null,
    startDictation: vi.fn(),
    stopDictation: vi.fn(),
    pauseDictation: vi.fn(),
    resumeDictation: vi.fn(),
  }),
}));

vi.mock("@/lib/surgical-sales/missionBoardDebriefLauncherClient", () => ({
  logMissionBoardDebriefPathwayOutcomeFromLauncher: vi.fn(),
  advancePathwayFromCompletedDebriefClient: vi.fn(),
}));

function baseProvider(extra: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: PROVIDER_ID,
    specialty: "Orthopedics",
    primary_organization_name: "Metro General",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    relationship_pathway_stage_id: "debrief",
    ...extra,
  };
}

function expectLogOutcomePanel() {
  expect(screen.getByTestId("mission-board-debrief-complete-panel")).toBeInTheDocument();
  expect(screen.getByTestId("mission-board-debrief-dictate")).toHaveTextContent("Dictate");
  expect(screen.getByTestId("mission-board-debrief-save-complete")).toHaveTextContent(
    MISSION_BOARD_DEBRIEF_LOG_OUTCOME_LABEL,
  );
  expect(screen.queryByText("Schedule Debrief")).not.toBeInTheDocument();
  expect(screen.queryByText(DEBRIEF_COMPLETE_LABEL)).not.toBeInTheDocument();
  expect(screen.queryByText(DEBRIEF_START_LABEL)).not.toBeInTheDocument();
  expect(screen.queryByText(DEBRIEF_RESUME_LABEL)).not.toBeInTheDocument();
}

afterEach(() => {
  cleanup();
});

describe("MissionBoardDebriefStatusModal", () => {
  it("shows inline log outcome form when debrief is not scheduled", () => {
    render(<MissionBoardDebriefStatusModal provider={baseProvider()} onClose={() => {}} />);

    expect(screen.getByTestId("mission-board-debrief-status-modal")).toBeInTheDocument();
    expect(screen.getByText("Debrief Not Scheduled")).toBeInTheDocument();
    expectLogOutcomePanel();
  });

  it("shows the same log outcome form when a debrief is scheduled", () => {
    render(
      <MissionBoardDebriefStatusModal
        provider={baseProvider({
          provider_debrief_engagement: {
            id: ENGAGEMENT_ID,
            status: "planned",
            debrief_completed: false,
          },
        })}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Debrief Scheduled")).toBeInTheDocument();
    expectLogOutcomePanel();
  });

  it("shows the same log outcome form for active debrief", () => {
    render(
      <MissionBoardDebriefStatusModal
        provider={baseProvider({
          provider_debrief_engagement: {
            id: ENGAGEMENT_ID,
            status: "in_progress",
            debrief_completed: false,
          },
        })}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Debrief Active")).toBeInTheDocument();
    expectLogOutcomePanel();
  });

  it("shows the same log outcome form when debrief notes are pending", () => {
    render(
      <MissionBoardDebriefStatusModal
        provider={baseProvider({
          provider_debrief_engagement: {
            id: ENGAGEMENT_ID,
            status: "completed",
            debrief_completed: false,
          },
        })}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Debrief Needed")).toBeInTheDocument();
    expectLogOutcomePanel();
  });

  it("shows Advance to Evaluation when debrief is complete but product fit is not validated", () => {
    render(
      <MissionBoardDebriefStatusModal
        provider={baseProvider({
          provider_debrief_engagement: {
            id: ENGAGEMENT_ID,
            status: "completed",
            debrief_completed: true,
          },
        })}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Debrief Complete")).toBeInTheDocument();
    expect(screen.getByTestId("mission-board-debrief-advance-pathway")).toHaveTextContent(
      "Advance to Evaluation",
    );
    expect(screen.getByTestId("mission-board-debrief-advance-evaluation-path")).toBeInTheDocument();
    expect(screen.queryByTestId("mission-board-debrief-complete-panel")).not.toBeInTheDocument();
  });
});
