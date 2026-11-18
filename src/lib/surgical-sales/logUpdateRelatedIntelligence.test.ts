import { describe, expect, it } from "vitest";
import { buildLogUpdateIntelligenceReview } from "./logUpdateRelatedIntelligence";
import { routeLogUpdateToProviderFields } from "./logUpdateProviderRouting";

const EXAMPLE =
  "OR access goes through vendor credentialing and the scheduler approves observation requests.";

describe("buildLogUpdateIntelligenceReview", () => {
  it("marks related gaps partially confirmed instead of still missing for OR access note", () => {
    const fieldUpdates = routeLogUpdateToProviderFields(EXAMPLE, {});
    const review = buildLogUpdateIntelligenceReview(EXAMPLE, fieldUpdates, {});

    expect(review.partiallyConfirmed.map((p) => p.label)).toContain("Credentialing turnaround time");
    expect(review.stillWorthConfirming).not.toContain("Credentialing turnaround time");
    expect(review.stillWorthConfirming).not.toContain("Vendor credentialing status confirmed");
    expect(review.stillWorthConfirming).not.toContain("Scheduling owner / coordinator named");
    expect(review.confirmedUpdates.length).toBeGreaterThan(0);
    expect(review.relatedOperationalAreas.length).toBeGreaterThan(0);
  });

  it("partially confirms scheduling when coordinator role mentioned without name", () => {
    const text = "The office usually responds same day if I text the coordinator.";
    const fieldUpdates = routeLogUpdateToProviderFields(text, {});
    const review = buildLogUpdateIntelligenceReview(text, fieldUpdates, {});

    expect(review.partiallyConfirmed.map((p) => p.label)).toContain(
      "Scheduling owner / coordinator named",
    );
    expect(review.stillWorthConfirming).not.toContain("Scheduling owner / coordinator named");
  });

  it("routes credentialing from conditional observation and partials turnaround only", () => {
    const text = "Observation is allowed, but only after credentialing is complete.";
    const fieldUpdates = routeLogUpdateToProviderFields(text, {});
    const review = buildLogUpdateIntelligenceReview(text, fieldUpdates, {});

    expect(fieldUpdates.map((u) => u.dbKey)).toContain("provider_credentialing_status");
    expect(review.stillWorthConfirming).not.toContain("Vendor credentialing status confirmed");
    expect(review.partiallyConfirmed.map((p) => p.label)).toContain("Credentialing turnaround time");
  });
});
