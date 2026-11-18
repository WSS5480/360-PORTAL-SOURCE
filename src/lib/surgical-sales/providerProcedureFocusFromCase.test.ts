import { describe, expect, it } from "vitest";
import { mergeRepEnteredProcedureFocus } from "@/lib/surgical-sales/providerProcedureFocusFromCase";

describe("mergeRepEnteredProcedureFocus", () => {
  it("appends a new rep-entered procedure", () => {
    expect(mergeRepEnteredProcedureFocus("Hernia repair", "Lap chole")).toBe(
      "Hernia repair | Lap chole",
    );
  });

  it("dedupes case-insensitively", () => {
    expect(mergeRepEnteredProcedureFocus("Hernia repair", "hernia repair")).toBe("Hernia repair");
  });

  it("preserves parsed clinical storage segments", () => {
    expect(
      mergeRepEnteredProcedureFocus(
        "Revisional bariatric surgery|generalRevisional bariatric cases · Increasing volume",
        "Robotic ventral hernia",
      ),
    ).toBe("Revisional bariatric surgery | Robotic ventral hernia");
  });
});
