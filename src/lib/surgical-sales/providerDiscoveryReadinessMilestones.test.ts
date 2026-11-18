import { describe, expect, it } from "vitest";
import {
  buildDiscoveryMilestoneRequirements,
  resolveDiscoveryMilestoneMet,
} from "./providerDiscoveryReadinessMilestones";
import { discoveryAccessReadyContact } from "./salesPathwayTestFixtures";

describe("providerDiscoveryReadinessMilestones", () => {
  it("tracks only observation approval as the discovery gate", () => {
    const requirements = buildDiscoveryMilestoneRequirements({
      contact: {},
      engagements: [],
    });
    expect(requirements.map((item) => item.label)).toEqual(["Observation approved"]);
    expect(requirements.every((item) => item.met === false)).toBe(true);
  });

  it("marks observation approved when validated on file", () => {
    const contact = discoveryAccessReadyContact();
    expect(resolveDiscoveryMilestoneMet("observation_approved", { contact })).toBe(true);
  });
});
