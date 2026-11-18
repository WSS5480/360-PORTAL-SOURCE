import { describe, expect, it } from "vitest";

import { buildProviderOverviewPrimaryActions } from "./buildProviderOverviewTacticalLayout";
import { discoveryAccessReadyContact } from "./salesPathwayTestFixtures";
import { DISCOVERY_OVERVIEW_PRIMARY_LABEL } from "./buildDiscoveryProviderOverviewActions";
import {
  PROVIDER_OVERVIEW_CUSTOM_ACTION,
  shouldShowDiscoveryObservationApprovalAction,
} from "./providerOverviewDiscoveryApprovalActions";

describe("providerOverviewDiscoveryApprovalActions", () => {
  it("does not inject one-click approval actions", () => {
    expect(
      shouldShowDiscoveryObservationApprovalAction({
        pathwayStageId: "discovery",
        contact: {},
      }),
    ).toBe(false);
  });

  it("does not show one-click approval after observation is validated", () => {
    expect(
      shouldShowDiscoveryObservationApprovalAction({
        pathwayStageId: "discovery",
        contact: discoveryAccessReadyContact(),
      }),
    ).toBe(false);
  });

  it("buildProviderOverviewPrimaryActions omits one-click observation approval", () => {
    const actions = buildProviderOverviewPrimaryActions({
      engagements: [],
      briefingHref: "/briefing",
      workflow: null,
      newEngagementHref: "/engagements/new",
      nextBestAction: { label: "Schedule intro call", detail: "", href: "/intro" },
      contact: {},
      pathwayStageId: "discovery",
    });

    expect(actions[0]?.label).toBe(DISCOVERY_OVERVIEW_PRIMARY_LABEL.startIntroCall);
    expect(
      actions.some(
        (action) => action.customAction === PROVIDER_OVERVIEW_CUSTOM_ACTION.openObservationApproval,
      ),
    ).toBe(false);
  });
});
