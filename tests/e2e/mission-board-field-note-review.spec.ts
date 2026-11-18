import { test, expect } from "@playwright/test";
import { buildLogUpdateIntelligenceReview } from "../../src/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "../../src/lib/surgical-sales/logUpdateParseFreeform";
import { runUniversalSurgicalExtraction } from "../../src/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "../../src/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { buildReviewProjectionFromUniversalFacts } from "../../src/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { signIn } from "./helpers/signIn";

const LETTUCE_FIELD_NOTE = [
  "Spoke with Dr. Lettuce today for an introductory conversation. Overall he was friendly and open to learning more about what we're doing.",
  "He mentioned they're continuing to do a high volume of ventral hernia and abdominal wall reconstruction procedures.",
  "We didn't get into specific product discussions today, but he seemed willing to continue the conversation.",
  "Observation access wasn't approved today, but he didn't express any concerns about it either.",
  "He suggested I coordinate through his office to better understand the process.",
  "Jennifer appears to be involved in scheduling and may be a good contact for future coordination.",
  "My next step is to connect with the office staff, learn more about the observation process, and continue building the relationship with Dr. Onion.",
].join("\n\n");

function emptyWorkflowLogUpdate(dictation: string): LogUpdateParseResult {
  return {
    sourceText: dictation,
    suggestedUpdates: [],
    fieldUpdates: [],
    intelligenceReview: buildLogUpdateIntelligenceReview(dictation, [], {}),
    stillMissing: [],
    saveAsNoteAccepted: true,
    usesProviderIntelligence: true,
  };
}

function ufRunsFromFieldNote(dictation: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "discovery_note",
    context: {
      provider_display_name: "Dr. Lettuce",
    },
  });
  return [
    {
      capture_id: "mission-board-lettuce-field-note",
      declared_source_type: "discovery_note",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `mission-board-lettuce-${index}`,
        capture_id: "mission-board-lettuce-field-note",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

function reviewParseFromFieldNote(dictation: string): LogUpdateParseResult {
  const debriefRuns = ufRunsFromFieldNote(dictation);
  return buildReviewProjectionFromUniversalFacts({
    dictation,
    debriefRuns,
    workflowLogUpdate: emptyWorkflowLogUpdate(dictation),
    existingFields: {},
  }).logUpdate;
}

test.describe("Mission Board field note intelligence review", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("pulls complete Lettuce field-note intelligence with clean wording", async ({ page }) => {
    const parse = reviewParseFromFieldNote(LETTUCE_FIELD_NOTE);

    await page.route("**/api/portal/sales/log-update/map", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          parse,
          mapping_source: "universal-rules",
          discovery_context: null,
          provider_contact_snapshot: null,
          engagement_outcome_id: null,
          universal_fact_capture_id: null,
        }),
      });
    });

    await page.route("**/api/portal/sales/providers/*/log-update", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, fields: {} }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/portal/sales/providers");
    const dictate =
      page.getByTestId("mission-board-dictate").first()
        .or(page.getByRole("button", { name: /field note|dictate/i }).first());
    await expect(dictate).toBeVisible({ timeout: 30_000 });
    await dictate.click();

    await expect(page.getByRole("dialog", { name: /dictate update/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("textbox", { name: /field intelligence note/i }).fill(LETTUCE_FIELD_NOTE);
    await page.getByRole("checkbox", { name: /contains no PHI/i }).check();
    await page.getByRole("button", { name: /review updates/i }).click();

    await expect(page.getByText(/Suggested Updates|Review Extracted Intelligence/i).first()).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByText(/Observation access/i).first()).toBeVisible();
    await expect(page.getByText(/not yet approved|not approved/i).first()).toBeVisible();
    await expect(page.getByText(/Jennifer/i).first()).toBeVisible();
    await expect(page.getByText(/Ventral hernia/i).first()).toBeVisible();
    await expect(page.getByText(/Abdominal wall reconstruction/i).first()).toBeVisible();
    await expect(page.getByText(/Relationship-building stage|open to continued discussion|positive provider sentiment/i).first()).toBeVisible();
    await expect(page.getByText(/connect with the office staff|learn more about the observation process/i).first()).toBeVisible();
    await expect(page.getByText(/Dr\. Onion/i).first()).toBeHidden();
    await expect(page.getByText(/Credentialing Not Discussed/i)).toHaveCount(0);
  });
});
