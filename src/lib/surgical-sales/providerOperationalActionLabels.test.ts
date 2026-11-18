import { describe, expect, it } from "vitest";
import {
  operationalFieldActionLabel,
  operationalInProgressEngagementLabel,
  operationalOpenEngagementLabel,
  topOpenFieldDbKey,
} from "./providerOperationalActionLabels";

describe("providerOperationalActionLabels", () => {
  it("uses field-specific operational verbs", () => {
    expect(operationalFieldActionLabel("provider_observation_coordinator_contact")).toBe(
      "Confirm OR scheduling owner",
    );
    expect(operationalFieldActionLabel("provider_credentialing_status")).toBe(
      "Validate vendor clearance",
    );
  });

  it("uses engagement workflow label for in-progress touch, not intelligence blockers", () => {
    const contact = {
      provider_observation_coordinator_contact: "",
    };
    const label = operationalInProgressEngagementLabel(
      {
        id: "e1",
        engagement_type: "intro_call",
        engagement_type_label: "Intro call",
        status: "in_progress",
        status_label: "In progress",
        pre_call_filled: 0,
        pre_call_total: 0,
        pre_call_complete: false,
        outcome_label: "",
      },
      contact,
    );
    expect(label).toBe("Debrief");
    expect(label).not.toMatch(/scheduling owner/i);
  });

  it("uses observation outreach for planned observation types", () => {
    const label = operationalOpenEngagementLabel({
      id: "e1",
      engagement_type: "observation_request",
      engagement_type_label: "Observation request",
      status: "planned",
      status_label: "Planned",
      pre_call_filled: 0,
      pre_call_total: 0,
      pre_call_complete: false,
      outcome_label: "",
    });
    expect(label).toBe("Prepare observation outreach");
  });

  it("finds coordinator gap as top open field", () => {
    expect(
      topOpenFieldDbKey({
        provider_observation_coordinator_contact: "",
      }),
    ).toBe("provider_observation_coordinator_contact");
  });
});
