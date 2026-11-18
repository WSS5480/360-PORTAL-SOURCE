import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import {
  discoveryBriefingPageBlockers,
  discoveryDomainBlockers,
  discoveryDomainPrimaryAction,
  discoveryDomainPrimaryCtaLabel,
} from "./discoveryIntelligenceBriefingPresentation";

describe("discoveryIntelligenceBriefingPresentation", () => {
  it("surfaces priority unknowns as page blockers", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: {},
      planning: null,
    });
    const blockers = discoveryBriefingPageBlockers(view);
    expect(Array.isArray(blockers)).toBe(true);
  });

  it("picks highest-priority unresolved action for domain CTA", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: {},
      planning: null,
    });
    const access = view.groups.find((g) => g.id === "access_readiness");
    expect(access).toBeDefined();
    if (!access) return;

    const domainBlockers = discoveryDomainBlockers(access);
    expect(domainBlockers.length).toBeGreaterThan(0);

    const primary = discoveryDomainPrimaryAction(access);
    expect(primary?.action.label).toBeTruthy();
    expect(primary?.row.priority).toBe(1);
    expect(discoveryDomainPrimaryCtaLabel("access_readiness")).toBe("Resolve access pathway");
  });
});
