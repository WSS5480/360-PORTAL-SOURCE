import { describe, expect, it } from "vitest";
import { removeResolvedIntelligenceGaps } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceGapReconciliation";

describe("removeResolvedIntelligenceGaps", () => {
  it("removes the scheduling-owner gap when a scheduling contact was identified in the same review", () => {
    const result = removeResolvedIntelligenceGaps(
      ["Scheduling owner / coordinator named", "Credentialing turnaround time"],
      { contactLines: ["Lisa — Office Manager, Scheduling Coordinator"] },
    );
    expect(result).toEqual(["Credentialing turnaround time"]);
  });

  it("removes the scheduling-owner gap when a coordinator field update is proposed", () => {
    const result = removeResolvedIntelligenceGaps(
      ["Scheduling owner / coordinator named"],
      { fieldUpdates: [{ dbKey: "provider_observation_coordinator_contact", proposedValue: "Karen" }] },
    );
    expect(result).toEqual([]);
  });

  it("removes follow-up phrased scheduling gaps too", () => {
    const result = removeResolvedIntelligenceGaps(
      ["Confirm who controls scheduling"],
      { contactLines: ["Karen — Scheduling Coordinator"] },
    );
    expect(result).toEqual([]);
  });

  it("removes credentialing-status gaps when a credentialing update was captured but keeps timing gaps", () => {
    const result = removeResolvedIntelligenceGaps(
      ["Vendor credentialing status confirmed", "Credentialing turnaround time"],
      { fieldUpdates: [{ dbKey: "provider_credentialing_status", proposedValue: "Required — RepTrax" }] },
    );
    expect(result).toEqual(["Credentialing turnaround time"]);
  });

  it("removes observation approval gaps once feasibility is captured as approved", () => {
    const approved = removeResolvedIntelligenceGaps(
      ["Confirm observation approval"],
      { fieldUpdates: [{ dbKey: "provider_observation_feasibility", proposedValue: "Approved" }] },
    );
    expect(approved).toEqual([]);

    const notApproved = removeResolvedIntelligenceGaps(
      ["Confirm observation approval"],
      { fieldUpdates: [{ dbKey: "provider_observation_feasibility", proposedValue: "Interested" }] },
    );
    expect(notApproved).toEqual(["Confirm observation approval"]);
  });

  it("keeps unrelated gaps untouched", () => {
    const gaps = ["Observation cadence", "Best days or case posting window"];
    expect(removeResolvedIntelligenceGaps(gaps, { contactLines: ["Karen — Scheduling Coordinator"] })).toEqual(gaps);
  });
});
