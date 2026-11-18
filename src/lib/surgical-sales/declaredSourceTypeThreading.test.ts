import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DECLARED_SOURCE_TYPES,
  isDeclaredSourceType,
  parseDeclaredSourceType,
} from "@/lib/surgical-sales/declaredSourceType";

function src(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf8");
}

describe("Phase B — declared source type", () => {
  it("defines the five capture sources", () => {
    expect([...DECLARED_SOURCE_TYPES]).toEqual([
      "field_note",
      "observation_case",
      "debrief",
      "evaluation",
      "outcome",
    ]);
    expect(isDeclaredSourceType("field_note")).toBe(true);
    expect(isDeclaredSourceType("dictation")).toBe(false);
    expect(parseDeclaredSourceType("debrief")).toBe("debrief");
    expect(parseDeclaredSourceType("nope")).toBeUndefined();
  });
});

describe("Phase B — capture surfaces declare their source (threading tripwires)", () => {
  it("quick capture declares field_note for every launch branch", () => {
    const body = src("src/lib/surgical-sales/quickCaptureFieldIntelligence.ts");
    const matches = body.match(/declared_source_type: "field_note"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("mission board debrief apply declares debrief", () => {
    expect(src("src/lib/surgical-sales/missionBoardDebriefIntelligenceApply.ts")).toContain(
      'declared_source_type: "debrief"',
    );
  });

  it("tactical debrief sheet declares debrief on commit", () => {
    expect(
      src("src/app/portal/sales/engagements/[engagementId]/prepare/PrepareTacticalDebriefSheet.tsx"),
    ).toContain('declared_source_type: "debrief"');
  });

  it("AI note capture commit defaults to field_note and forwards the surface declaration", () => {
    const body = src("src/components/sales/aiNoteCapture/AiNoteCaptureWorkflow.tsx");
    expect(body).toContain('context.declaredSourceType ?? ("field_note" as const)');
  });

  it("observation promotion declares observation_case when stamping metadata", () => {
    expect(src("src/lib/surgical-sales/processObservationNoteCapture.ts")).toContain(
      'declared_source_type: "observation_case"',
    );
  });

  it("log-update route accepts declared_source_type in captureContext", () => {
    expect(src("src/app/api/portal/sales/providers/[providerId]/log-update/route.ts")).toContain(
      "declared_source_type",
    );
  });

  it("RIE apply never writes case tables (structural ownership)", () => {
    const body = src("src/lib/surgical-sales/logUpdateApplyProvider.ts");
    expect(body).not.toContain('from("surgical_sales_cases")');
    expect(body).not.toContain("observation_workflow_intelligence_snapshot");
  });
});
