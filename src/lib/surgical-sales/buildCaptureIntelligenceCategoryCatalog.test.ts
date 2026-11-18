import { describe, expect, it } from "vitest";
import {
  buildCaptureIntelligenceCategoryCatalog,
  captureIntelligenceCategoryCatalogStats,
} from "@/lib/surgical-sales/buildCaptureIntelligenceCategoryCatalog";
import { AI_NOTE_CAPTURE_CLASSIFICATIONS } from "@/lib/surgical-sales/aiNoteCapture/types";
import { DEBRIEF_INTELLIGENCE_CATEGORIES } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import { INTELLIGENCE_CAPTURE_CATEGORY_DEFS } from "@/lib/surgical-sales/intelligenceCaptureCategories";

describe("buildCaptureIntelligenceCategoryCatalog", () => {
  it("includes all major capture intelligence registries", () => {
    const catalog = buildCaptureIntelligenceCategoryCatalog();
    const byId = Object.fromEntries(catalog.map((group) => [group.id, group]));

    expect(byId.ai_routing?.rows).toHaveLength(AI_NOTE_CAPTURE_CLASSIFICATIONS.length);
    expect(byId.debrief_intelligence?.rows).toHaveLength(DEBRIEF_INTELLIGENCE_CATEGORIES.length);
    expect(byId.capture_mission?.rows).toHaveLength(INTELLIGENCE_CAPTURE_CATEGORY_DEFS.length);
    expect(captureIntelligenceCategoryCatalogStats(catalog).totalRows).toBeGreaterThan(40);
  });
});
