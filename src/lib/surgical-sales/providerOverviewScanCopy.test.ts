import { describe, expect, it } from "vitest";
import { scanLine, scanWords } from "./providerOverviewScanCopy";

describe("providerOverviewScanCopy", () => {
  it("scanLine keeps first sentence within max length", () => {
    const out = scanLine(
      "Validate OR access. Schedule observation only after coordinator confirms.",
      40,
    );
    expect(out).toBe("Validate OR access.");
  });

  it("scanWords truncates long unlock copy", () => {
    const out = scanWords("one two three four five six seven eight nine ten eleven", 6);
    expect(out).toMatch(/ten…$/);
  });
});
