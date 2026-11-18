import { describe, expect, it } from "vitest";
import {
  parseProviderTab,
  providerTabsForViewport,
} from "./providerProfileTypes";

describe("providerProfileTypes", () => {
  it("keeps provider Activity visible in desktop and mobile tabs", () => {
    expect(providerTabsForViewport(false).map((tab) => tab.id)).toContain("activity");
    expect(providerTabsForViewport(true).map((tab) => tab.id)).toContain("activity");
  });

  it("routes note deep links to Activity", () => {
    expect(parseProviderTab("overview", "1")).toBe("activity");
    expect(parseProviderTab("activity", null)).toBe("activity");
  });
});
