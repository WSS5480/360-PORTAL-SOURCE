import { describe, expect, it } from "vitest";
import {
  PROVIDER_INTELLIGENCE_ACTION_LABEL,
  resolveProviderIntelligenceAction,
} from "./resolveProviderIntelligenceAction";

describe("resolveProviderIntelligenceAction", () => {
  it("returns Start Discovery when there is no field evidence", () => {
    const action = resolveProviderIntelligenceAction({ contact: {}, cases: [], engagements: [] });
    expect(action.label).toBe(PROVIDER_INTELLIGENCE_ACTION_LABEL.start_discovery);
  });

  it("returns Build Intelligence when field evidence exists without active observations", () => {
    const action = resolveProviderIntelligenceAction({
      contact: {},
      engagements: [
        {
          id: "eng-1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 5,
          pre_call_complete: false,
          outcome_label: "Completed",
        },
      ],
    });
    expect(action.label).toBe(PROVIDER_INTELLIGENCE_ACTION_LABEL.build_intelligence);
  });

  it("returns Capture Field Insights for active observation cases without captured intel", () => {
    const action = resolveProviderIntelligenceAction({
      contact: {},
      cases: [{ case_type: "observation", status: "scheduled" }],
    });
    expect(action.label).toBe(PROVIDER_INTELLIGENCE_ACTION_LABEL.capture_field_insights);
  });

  it("returns Review Findings when observation intelligence exists", () => {
    const action = resolveProviderIntelligenceAction({
      contact: {},
      cases: [
        {
          case_type: "observation",
          status: "completed",
          live_observation_product_fit: "Strong fit for lap cases",
        },
      ],
    });
    expect(action.label).toBe(PROVIDER_INTELLIGENCE_ACTION_LABEL.review_findings);
  });
});
