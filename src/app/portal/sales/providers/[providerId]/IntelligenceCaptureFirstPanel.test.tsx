import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("@/hooks/useSpeechDictation", () => ({
  isBrowserSpeechRecognitionSupported: () => false,
  isVoiceCaptureAvailable: () => false,
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

import { IntelligenceCaptureFirstPanel } from "./IntelligenceCaptureFirstPanel";
import type { IntelligenceCaptureCategoryCard } from "@/lib/surgical-sales/buildIntelligenceCaptureCategoryDashboard";

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";

function card(
  id: IntelligenceCaptureCategoryCard["id"],
  name: string,
): IntelligenceCaptureCategoryCard {
  return {
    id,
    name,
    description: "",
    findingsCount: 0,
    openCount: 1,
    confirmedCount: 0,
    status: "empty",
    findingsLabel: "0 findings",
    openItemsLabel: "1 to explore",
    lastUpdatedIso: null,
    lastUpdatedLabel: "Not captured yet",
    hasActivity: false,
  };
}

const DISCOVERY_CARDS: IntelligenceCaptureCategoryCard[] = [
  card("observation_access", "Observation Access"),
  card("access_pathway", "Access Pathway"),
  card("credentialing_facility", "Credentialing & Facility Requirements"),
  card("key_people_influence", "Key People & Influence"),
  card("clinical_focus", "Clinical Focus"),
  card("opportunity_signals", "Commercial Landscape"),
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function typeAndReview(text: string) {
  fireEvent.change(screen.getByLabelText("What did you learn?"), { target: { value: text } });
  fireEvent.click(screen.getByText("Review findings"));
}

describe("IntelligenceCaptureFirstPanel", () => {
  it("classifies multi-line capture into proposal cards with suggested areas", () => {
    render(
      <IntelligenceCaptureFirstPanel
        providerId={PROVIDER_ID}
        categoryCards={DISCOVERY_CARDS}
        onFindingSaved={vi.fn()}
      />,
    );

    typeAndReview(
      [
        "- Karen the surgery coordinator controls his OR schedule",
        "- Facility uses Vendormate for credentialing and badge pickup",
      ].join("\n"),
    );

    expect(screen.getByText("Confirm where these go")).toBeInTheDocument();
    const selects = screen.getAllByLabelText("Area") as HTMLSelectElement[];
    expect(selects).toHaveLength(2);
    expect(selects[0]?.value).toBe("access_pathway");
    expect(selects[1]?.value).toBe("credentialing_facility");
  });

  it("puts unroutable text in the needs-a-home group and blocks saving it without an area", () => {
    render(
      <IntelligenceCaptureFirstPanel
        providerId={PROVIDER_ID}
        categoryCards={DISCOVERY_CARDS}
        onFindingSaved={vi.fn()}
      />,
    );

    typeAndReview("Grabbed lunch at the cafe across the street afterwards.");

    expect(screen.getByText("Couldn't place these")).toBeInTheDocument();
    expect(screen.getByText("Save 0 findings")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Area"), { target: { value: "clinical_focus" } });
    expect(screen.getByText("Save 1 finding")).toBeEnabled();
  });

  it("saves accepted findings through the reviewed finding route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, provider: { id: PROVIDER_ID } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onFindingSaved = vi.fn();

    render(
      <IntelligenceCaptureFirstPanel
        providerId={PROVIDER_ID}
        categoryCards={DISCOVERY_CARDS}
        onFindingSaved={onFindingSaved}
      />,
    );

    typeAndReview("Karen the surgery coordinator controls his OR schedule and block time.");
    fireEvent.click(screen.getByText("Save 1 finding"));

    await waitFor(() => {
      expect(screen.getByText("1 finding saved across 1 area.")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/providers/${PROVIDER_ID}/intelligence-capture/finding`);
    expect(JSON.parse(String(init.body))).toEqual({
      categoryId: "access_pathway",
      finding: "Karen the surgery coordinator controls his OR schedule and block time.",
    });
    expect(onFindingSaved).toHaveBeenCalledWith({ id: PROVIDER_ID });
  });

  it("commits observation approval through the structured observation-approval route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, provider: { id: PROVIDER_ID } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntelligenceCaptureFirstPanel
        providerId={PROVIDER_ID}
        categoryCards={DISCOVERY_CARDS}
        onFindingSaved={vi.fn()}
      />,
    );

    typeAndReview("Dr. Apple approved the observation for the first week of July.");

    expect(
      screen.getByText("Reads as observation approval — access will be marked approved."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Approved — permission confirmed")).toBeChecked();

    fireEvent.click(screen.getByText("Save 1 finding"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/providers/${PROVIDER_ID}/observation-approval`);
    expect(JSON.parse(String(init.body))).toEqual({
      status: "permission_confirmed",
      approval_note: "Dr. Apple approved the observation for the first week of July.",
    });
  });

  it("lets the rep downgrade detected approval to interest before saving", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, provider: { id: PROVIDER_ID } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntelligenceCaptureFirstPanel
        providerId={PROVIDER_ID}
        categoryCards={DISCOVERY_CARDS}
        onFindingSaved={vi.fn()}
      />,
    );

    typeAndReview("Dr. Apple approved the observation for July.");
    fireEvent.click(screen.getByLabelText("Interested — approval not confirmed yet"));
    fireEvent.click(screen.getByText("Save 1 finding"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).status).toBe("interested");
  });

  it("keeps failed findings on screen for retry and reports partial success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, provider: { id: PROVIDER_ID } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: "Provider not found." }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntelligenceCaptureFirstPanel
        providerId={PROVIDER_ID}
        categoryCards={DISCOVERY_CARDS}
        onFindingSaved={vi.fn()}
      />,
    );

    typeAndReview(
      [
        "- Karen the surgery coordinator controls his OR schedule",
        "- Facility uses Vendormate for credentialing and badge pickup",
      ].join("\n"),
    );
    fireEvent.click(screen.getByText("Save 2 findings"));

    await waitFor(() => {
      expect(screen.getByText("Provider not found.")).toBeInTheDocument();
    });
    expect(screen.getByText("1 finding saved across 1 area.")).toBeInTheDocument();
    expect(screen.getByText("Save 1 finding")).toBeInTheDocument();
  });

  it("discarding a finding excludes it from the save", () => {
    render(
      <IntelligenceCaptureFirstPanel
        providerId={PROVIDER_ID}
        categoryCards={DISCOVERY_CARDS}
        onFindingSaved={vi.fn()}
      />,
    );

    typeAndReview("Karen the surgery coordinator controls his OR schedule and block time.");
    fireEvent.click(screen.getByText("Discard"));

    expect(screen.getByText("Save 0 findings")).toBeDisabled();
    fireEvent.click(screen.getByText("Keep"));
    expect(screen.getByText("Save 1 finding")).toBeEnabled();
  });
});
