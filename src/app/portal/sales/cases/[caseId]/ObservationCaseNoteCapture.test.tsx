import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("@/hooks/useSpeechDictation", () => ({
  salesDictationOptions: (extra?: object) => ({
    serverTranscribe: true,
    preferBrowser: false,
    allowServerFallback: true,
    ...extra,
  }),
  useSpeechDictation: () => ({
    dictationUiState: "idle",
    dictating: false,
    transcribing: false,
    dictationError: null,
    browserSupported: false,
    startDictation: vi.fn(),
    stopDictationAsync: vi.fn(),
    teardownDictation: vi.fn(),
  }),
}));

import { ObservationCaseNoteCapture } from "./ObservationCaseNoteCapture";

describe("ObservationCaseNoteCapture post-save feedback", () => {
  it("renders captured finding chips when onSaveNote resolves with feedback items", async () => {
    const onSaveNote = vi.fn().mockResolvedValue({
      status: "chips" as const,
      items: [
        { id: "current-product_in_use:bard-mesh", text: "Bard Mesh was used during the procedure" },
        {
          id: "current-workflow_visualization_before_fixation",
          text: "Extra time was spent improving visualization before fixation",
        },
      ],
    });

    render(<ObservationCaseNoteCapture onSaveNote={onSaveNote} />);

    fireEvent.change(screen.getByLabelText("Quick note"), {
      target: { value: "They were using Bard Mesh again." },
    });
    fireEvent.click(screen.getByText("Save note"));

    await waitFor(() => {
      expect(screen.getByTestId("case-obs-note-saved")).toBeInTheDocument();
    });
    expect(screen.getByTestId("case-obs-capture-feedback")).toBeInTheDocument();
    expect(screen.getByText("Note saved.")).toBeInTheDocument();
    expect(screen.getByText("Captured from this note")).toBeInTheDocument();
    expect(screen.getByText("Bard Mesh was used during the procedure")).toBeInTheDocument();
    expect(
      screen.getByText("Extra time was spent improving visualization before fixation"),
    ).toBeInTheDocument();
  });

  it("shows mark-complete nudge after save when enabled", async () => {
    const onSaveNote = vi.fn().mockResolvedValue({
      status: "chips" as const,
      items: [{ id: "f1", text: "Bard Mesh was used during the procedure" }],
    });
    const onMarkComplete = vi.fn().mockResolvedValue(undefined);

    render(
      <ObservationCaseNoteCapture
        onSaveNote={onSaveNote}
        onMarkComplete={onMarkComplete}
        showMarkCompleteNudge
      />,
    );

    fireEvent.change(screen.getByLabelText("Quick note"), { target: { value: "Note body." } });
    fireEvent.click(screen.getByText("Save note"));

    await waitFor(() => {
      expect(screen.getByTestId("case-obs-mark-complete-nudge")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark case complete"));
    await waitFor(() => {
      expect(onMarkComplete).toHaveBeenCalled();
    });
  });

  it("shows no feedback block when onSaveNote resolves without items", async () => {
    const onSaveNote = vi.fn().mockResolvedValue(undefined);

    render(<ObservationCaseNoteCapture onSaveNote={onSaveNote} />);

    fireEvent.change(screen.getByLabelText("Quick note"), { target: { value: "Quick note." } });
    fireEvent.click(screen.getByText("Save note"));

    await waitFor(() => {
      expect(onSaveNote).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("case-obs-capture-feedback")).not.toBeInTheDocument();
  });
});
