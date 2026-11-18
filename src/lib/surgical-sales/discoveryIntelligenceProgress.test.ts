import { describe, expect, it } from "vitest";
import {
  computeDiscoveryGroupProgress,
  computeDiscoveryIntelligenceOverallProgress,
  DISCOVERY_PARTIAL_PROGRESS_CREDIT,
  resolveDiscoverySignalProgressCredit,
} from "./discoveryIntelligenceProgress";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

describe("discoveryIntelligenceProgress", () => {
  it("maps shared statuses to progress credit", () => {
    expect(resolveDiscoverySignalProgressCredit(F.unknown).credit).toBe(0);
    expect(resolveDiscoverySignalProgressCredit(F.captured).credit).toBe(
      DISCOVERY_PARTIAL_PROGRESS_CREDIT,
    );
    expect(resolveDiscoverySignalProgressCredit(F.validated).credit).toBe(1);
    expect(resolveDiscoverySignalProgressCredit(F.blocked)).toEqual({
      credit: 0,
      constrained: true,
    });
  });

  it("weights access readiness on observation approval only", () => {
    const progress = computeDiscoveryGroupProgress({
      groupId: "access_readiness",
      signals: [
        { signalId: "observation_approval", statusLabel: F.captured },
        { signalId: "scheduling_owner", statusLabel: F.unknown },
        { signalId: "facility_vendor_pathway", statusLabel: F.unknown },
        { signalId: "observation_logistics", statusLabel: F.unknown },
      ],
    });

    expect(progress.percent).toBe(50);
    expect(progress.evidenceCounts).toEqual({
      confirmed: 0,
      learning: 1,
      open: 3,
      total: 4,
    });
    expect(progress.constrained).toBe(false);
  });

  it("flags blocked observation approval as a constraint with no credit", () => {
    const progress = computeDiscoveryGroupProgress({
      groupId: "access_readiness",
      signals: [
        { signalId: "observation_approval", statusLabel: F.blocked },
        { signalId: "scheduling_owner", statusLabel: F.validated },
        { signalId: "facility_vendor_pathway", statusLabel: F.validated },
        { signalId: "observation_logistics", statusLabel: F.validated },
      ],
    });

    expect(progress.percent).toBe(0);
    expect(progress.constrained).toBe(true);
  });

  it("averages group percents for overall intelligence progress", () => {
    const overall = computeDiscoveryIntelligenceOverallProgress([
      { percent: 20 },
      { percent: 50 },
      { percent: 80 },
    ]);
    expect(overall).toBe(50);
  });
});
