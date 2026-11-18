import { describe, expect, it } from "vitest";
import { buildProviderDiscoveryProgressView } from "./buildProviderDiscoveryProgressView";
import { discoveryAccessReadyContact } from "./salesPathwayTestFixtures";

describe("buildProviderDiscoveryProgressView", () => {
  it("shows Observation Not Approved when approval is missing", () => {
    const view = buildProviderDiscoveryProgressView({ contact: {} });

    expect(view.approved).toBe(false);
    expect(view.statusLabel).toBe("Permission Not Yet Confirmed");
    expect(view.summaryLabel).toBe("Permission Not Yet Confirmed");
  });

  it("shows Observation Approved when approval is validated", () => {
    const view = buildProviderDiscoveryProgressView({
      contact: discoveryAccessReadyContact(),
    });

    expect(view.approved).toBe(true);
    expect(view.statusLabel).toBe("Permission Confirmed");
    expect(view.summaryLabel).toBe("Permission Confirmed");
  });
});
