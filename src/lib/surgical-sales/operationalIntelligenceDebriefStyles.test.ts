import { describe, expect, it } from "vitest";
import {
  inferSchedulingControlFromDebrief,
  noteMatchesSchedulingOwnershipDebrief,
} from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import {
  buildOperationalSignalsFromDebriefText,
  mapDebriefNarrativeToOperationalSignals,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";

const CLEAR_SCHEDULING = "Karen handles scheduling and works with OR scheduling.";
const VAGUE_SCHEDULING = "Karen came up a few times and seems to help with timing.";
const NO_SCHEDULING =
  "Good intro call, surgeon open to observation, robotic hernia volume increasing.";

describe("debrief scheduling style scenarios", () => {
  it("clear scheduling maps likely/shared workflow with Karen soft contact", () => {
    expect(noteMatchesSchedulingOwnershipDebrief(CLEAR_SCHEDULING)).toBe(true);
    expect(inferSchedulingControlFromDebrief(CLEAR_SCHEDULING)).toBe("shared_workflow");

    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: CLEAR_SCHEDULING,
    });
    const ownership = signals.find(
      (s) => s.domain === "scheduling_ownership" && s.signalType === "evidence",
    );
    expect(ownership?.status).toBe("likely");
    expect(ownership?.suggestedAnswer).toBe("shared_scheduling_workflow");
    expect(signals.some((s) => s.signalType === "soft_contact" && s.softContactName === "Karen")).toBe(
      true,
    );

    const { parse } = buildOperationalSignalsFromDebriefText({
      providerId: "p1",
      narrative: CLEAR_SCHEDULING,
    });
    const control = parse.fieldUpdates.find(
      (f) => f.dbKey === "provider_observation_scheduling_control",
    );
    expect(control?.proposedValue).toBe("shared_workflow");
  });

  it("vague scheduling maps early/partial without shared workflow confirmation", () => {
    expect(noteMatchesSchedulingOwnershipDebrief(VAGUE_SCHEDULING)).toBe(true);

    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });
    const ownership = signals.find(
      (s) => s.domain === "scheduling_ownership" && s.signalType === "evidence",
    );
    expect(ownership?.status).toBe("partial");
    expect(ownership?.confidence).toBe("early_signal");
    expect(ownership?.suggestedAnswer).toBeUndefined();
    expect(inferSchedulingControlFromDebrief(VAGUE_SCHEDULING)).toBeNull();

    const soft = signals.find((s) => s.signalType === "soft_contact");
    expect(soft?.softContactName).toBe("Karen");
    expect(soft?.status).toBe("partial");

    const { parse } = buildOperationalSignalsFromDebriefText({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });
    const control = parse.fieldUpdates.find(
      (f) => f.dbKey === "provider_observation_scheduling_control",
    );
    expect(control).toBeUndefined();
    const contact = parse.fieldUpdates.find((f) => f.dbKey === "provider_scheduling_contact");
    expect(contact?.proposedValue).toMatch(/\[Partial lead\][\s\S]*Karen/i);
  });

  it("no scheduling mention does not fabricate scheduling owner but maps access and clinical fit", () => {
    expect(noteMatchesSchedulingOwnershipDebrief(NO_SCHEDULING)).toBe(false);

    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: NO_SCHEDULING,
    });
    expect(signals.filter((s) => s.domain === "scheduling_ownership")).toHaveLength(0);

    expect(
      signals.some(
        (s) => s.domain === "access_readiness" && /Observation approval: No/i.test(s.summary),
      ),
    ).toBe(true);
    expect(
      signals.some((s) => s.domain === "clinical_fit" && /hernia|robotic/i.test(s.summary)),
    ).toBe(true);

    const { parse } = buildOperationalSignalsFromDebriefText({
      providerId: "p1",
      narrative: NO_SCHEDULING,
    });
    expect(
      parse.fieldUpdates.some((f) => f.dbKey?.includes("scheduling")),
    ).toBe(false);
    expect(
      parse.fieldUpdates.some((f) => f.dbKey === "provider_observation_feasibility"),
    ).toBe(true);
    expect(parse.fieldUpdates.some((f) => f.dbKey === "provider_procedure_focus")).toBe(true);
  });
});
