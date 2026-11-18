import { describe, expect, it } from "vitest";
import { localPolishPreCallPlanFieldWording } from "@/lib/surgical-sales/engagements/improvePreCallPlanFieldWording";

describe("localPolishPreCallPlanFieldWording", () => {
  it("normalizes whitespace and capitalizes lines", () => {
    expect(localPolishPreCallPlanFieldWording("  map   access path\n\nconfirm or date  ")).toBe(
      "Map access path\nConfirm or date",
    );
  });
});
