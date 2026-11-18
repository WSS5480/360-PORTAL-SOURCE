import { describe, expect, it } from "vitest";
import { normalizeCaptureTextToFindings } from "@/lib/surgical-sales/intelligenceCapture/normalizeCaptureTextToFindings";

describe("normalizeCaptureTextToFindings", () => {
  it("splits bullet lists into separate findings", () => {
    const findings = normalizeCaptureTextToFindings(`
- Observation should not be a problem
- Karen handles all scheduling
- Credentialing goes through symplr
    `);
    expect(findings).toHaveLength(3);
    expect(findings[0]).toMatch(/observation should not/i);
  });

  it("keeps a single paragraph as one finding", () => {
    const findings = normalizeCaptureTextToFindings(
      "Provider said observation should not be a problem for next month.",
    );
    expect(findings).toEqual([
      "Provider said observation should not be a problem for next month.",
    ]);
  });

  it("dedupes repeated lines", () => {
    const findings = normalizeCaptureTextToFindings(`
Observation should not be a problem

Observation should not be a problem
    `);
    expect(findings).toHaveLength(1);
  });

  it("returns empty for blank input", () => {
    expect(normalizeCaptureTextToFindings("   ")).toEqual([]);
  });
});
