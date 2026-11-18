import { describe, expect, it } from "vitest";
import { shortenOverviewSignalLine } from "./providerOverviewSignalCopy";

describe("shortenOverviewSignalLine", () => {
  it("replaces corporate synthesis with observational copy", () => {
    expect(
      shortenOverviewSignalLine(
        "Procedure priorities are taking shape for observation and trials.",
      ),
    ).toBe("Procedure mix not confirmed");
  });

  it("keeps lines concise", () => {
    const line = shortenOverviewSignalLine(
      "Observation access appears possible with scheduling coordination and extra detail.",
      52,
    );
    expect(line.length).toBeLessThanOrEqual(56);
  });
});
