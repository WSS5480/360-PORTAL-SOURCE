import { describe, expect, it } from "vitest";
import {
  OverviewConceptRegistry,
  conceptBucketForDbKey,
  textsShareOperationalConcept,
} from "./providerOverviewConceptDedup";

describe("providerOverviewConceptDedup", () => {
  it("maps observation access fields to or_access bucket", () => {
    expect(conceptBucketForDbKey("provider_observation_access_path")).toBe("or_access");
    expect(conceptBucketForDbKey("provider_observation_coordinator_contact")).toBe("scheduling");
  });

  it("detects shared concepts across phrasing", () => {
    expect(
      textsShareOperationalConcept(
        "OR access gates not confirmed",
        "Map OR scheduling pathway before field allocation",
      ),
    ).toBe(false);
    expect(
      textsShareOperationalConcept(
        "No validated OR scheduling owner",
        "OR scheduling authority not confirmed",
      ),
    ).toBe(true);
  });

  it("registry rejects duplicate buckets", () => {
    const reg = new OverviewConceptRegistry();
    expect(reg.claimDbKey("provider_observation_coordinator_contact")).toBe(true);
    expect(reg.claimHeadline("Confirm who owns OR scheduling")).toBe(false);
  });
});
