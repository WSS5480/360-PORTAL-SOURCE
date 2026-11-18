import { describe, expect, it } from "vitest";
import {
  INTELLIGENCE_OPERATIONAL_TRUST_LABELS,
  operationalTrustFromFreshnessTier,
  resolveIntelligenceOperationalTrust,
} from "./providerIntelligenceOperationalTrust";

describe("providerIntelligenceOperationalTrust", () => {
  it("maps freshness tiers to operational trust", () => {
    expect(operationalTrustFromFreshnessTier("recent")).toBe("validated");
    expect(operationalTrustFromFreshnessTier("current")).toBe("validated");
    expect(operationalTrustFromFreshnessTier("unverified")).toBe("emerging");
    expect(operationalTrustFromFreshnessTier("needs_refresh")).toBe("emerging");
  });

  it("treats validated_at signals as operationally trusted", () => {
    const trust = resolveIntelligenceOperationalTrust({
      dbKey: "provider_workflow_pain_points",
      raw: "turnover|notes:Long turnover",
      meta: {
        validated_at: new Date().toISOString(),
        lifecycle_state: "validated",
        updated_at: new Date().toISOString(),
      },
    });
    expect(trust.tier).toBe("validated");
    expect(trust.label).toBe(INTELLIGENCE_OPERATIONAL_TRUST_LABELS.validated);
  });

  it("treats captured-but-unvalidated signals as emerging", () => {
    const trust = resolveIntelligenceOperationalTrust({
      dbKey: "provider_workflow_pain_points",
      raw: "turnover|notes:Long turnover",
      meta: { updated_at: new Date().toISOString(), lifecycle_state: "captured" },
    });
    expect(trust.tier).toBe("emerging");
  });

  it("treats empty fields as open assumptions", () => {
    const trust = resolveIntelligenceOperationalTrust({
      dbKey: "influence_level",
      raw: null,
      gapState: "unknown",
    });
    expect(trust.tier).toBe("unknown");
  });
});
