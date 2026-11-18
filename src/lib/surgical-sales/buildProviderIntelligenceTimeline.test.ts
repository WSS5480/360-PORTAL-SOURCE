import { describe, expect, it } from "vitest";
import {
  buildProviderIntelligenceTimeline,
  formatIntelligenceTimelineWhen,
} from "./buildProviderIntelligenceTimeline";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

function engagement(partial: Partial<ProviderEngagementSummary>): ProviderEngagementSummary {
  return {
    id: "eng-1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "completed",
    status_label: "Completed",
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "Completed",
    updated_at: "2026-06-01T14:00:00Z",
    ...partial,
  };
}

describe("buildProviderIntelligenceTimeline", () => {
  it("returns empty timeline for brand-new providers", () => {
    const view = buildProviderIntelligenceTimeline({
      providerId: "prov-1",
      contact: {},
    });

    expect(view.events).toEqual([]);
    expect(view.emptyLabel).toBe("No activity yet.");
  });

  it("creates intro call completed event with engagement link", () => {
    const view = buildProviderIntelligenceTimeline({
      providerId: "prov-1",
      contact: {},
      engagements: [engagement({ id: "eng-intro", engagement_type: "intro_call", status: "completed" })],
    });

    expect(view.events.some((event) => event.kind === "intro_call_completed")).toBe(true);
    const intro = view.events.find((event) => event.kind === "intro_call_completed");
    expect(intro?.title).toBe("Intro Call Completed");
    expect(intro?.href).toContain("/engagements/eng-intro/prepare");
  });

  it("creates observation lifecycle events from cases", () => {
    const view = buildProviderIntelligenceTimeline({
      providerId: "prov-1",
      contact: {},
      cases: [
        {
          id: "case-obs-1",
          case_type: "observation",
          case_number: "OBS-1001",
          status: "completed",
          created_at: "2026-06-01T10:00:00Z",
          updated_at: "2026-06-02T16:00:00Z",
          live_observation_clinical_pain_points: "Long turnover between cases",
          live_observation_competitors: "Competitor X on preference card",
        },
      ],
    });

    const kinds = view.events.map((event) => event.kind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "observation_requested",
        "observation_completed",
        "pain_point_captured",
        "competitor_identified",
      ]),
    );
    expect(view.events.every((event) => event.href.includes("/cases/case-obs-1"))).toBe(true);
  });

  it("creates debrief completed event from engagement debrief", () => {
    const view = buildProviderIntelligenceTimeline({
      providerId: "prov-1",
      contact: {},
      engagements: [
        engagement({
          id: "eng-debrief",
          debrief_completed: true,
          debrief_completed_at: "2026-06-03T09:00:00Z",
        }),
      ],
    });

    const debrief = view.events.find((event) => event.kind === "debrief_completed");
    expect(debrief?.title).toBe("Debrief Completed");
    expect(debrief?.href).toContain("/debrief");
  });

  it("uses evidence-based titles for field captures, not milestone conclusions", () => {
    const view = buildProviderIntelligenceTimeline({
      providerId: "prov-1",
      contact: {
        provider_observation_feasibility: "interested",
        provider_preference_card_signals: "Asked about ACSIS visualization",
        provider_observation_coordinator_contact: "Jennifer handles scheduling",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro call debrief",
            updated_at: "2026-06-01T12:00:00Z",
            evidence_text: "Provider open to observing next month",
          },
          provider_preference_card_signals: {
            source_type: "engagement",
            source_label: "Intro call debrief",
            updated_at: "2026-06-01T12:00:00Z",
            evidence_text: "Asked about ACSIS visualization",
          },
          provider_observation_coordinator_contact: {
            source_type: "engagement",
            source_label: "Intro call debrief",
            updated_at: "2026-06-01T12:00:00Z",
            evidence_text: "Jennifer handles scheduling",
          },
        },
      },
    });

    const titles = view.events.map((event) => event.title);
    expect(titles).toContain("Observation Interest Captured");
    expect(titles).toContain("Clinical Interest Identified");
    expect(titles).toContain("Scheduler Referenced");
    expect(titles).not.toContain("Observation Approved");
    expect(titles).not.toContain("Product Fit Confirmed");
    expect(titles).not.toContain("Product Opportunity Confirmed");
    expect(titles).not.toContain("Scheduler Confirmed");
  });

  it("sorts events newest first", () => {
    const view = buildProviderIntelligenceTimeline({
      providerId: "prov-1",
      contact: {},
      cases: [
        {
          id: "case-old",
          case_type: "observation",
          created_at: "2026-05-01T10:00:00Z",
        },
        {
          id: "case-new",
          case_type: "observation",
          created_at: "2026-06-01T10:00:00Z",
        },
      ],
    });

    expect(view.events[0]?.sourceId).toBe("case-new");
  });
});

describe("formatIntelligenceTimelineWhen", () => {
  it("formats recent dates relative to now", () => {
    const now = new Date("2026-06-03T12:00:00Z");
    expect(formatIntelligenceTimelineWhen("2026-06-03T10:00:00Z", now)).toBe("Today");
  });
});
