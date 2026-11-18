import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  OBSERVATION_DICTATION_SCENARIOS,
  ROBOTIC_VENTRAL_HERNIA_DICTATION,
  factLabelsFromDictation,
  whatWeKnowFromObservationDictations,
} from "../../src/lib/surgical-sales/observationDictationIntelligenceFixtures";
import { buildLogUpdateIntelligenceReview } from "../../src/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "../../src/lib/surgical-sales/logUpdateParseFreeform";
import { runUniversalSurgicalExtraction } from "../../src/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "../../src/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { buildReviewProjectionFromUniversalFacts } from "../../src/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { signIn } from "./helpers/signIn";

const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots", "observation-dictation");

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

function ufRunsForMissionBoardReview(dictation: string, scenarioId: string): UniversalFactExtractionRun[] {
  // Mission Board Field Note UI uses discovery_note review projection (not case-note OIE).
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "discovery_note",
    context: { provider_display_name: "Tom Lettuce" },
  });
  return [
    {
      capture_id: `e2e-${scenarioId}`,
      declared_source_type: "discovery_note",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `${scenarioId}-${index}`,
        capture_id: `e2e-${scenarioId}`,
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

function reviewParseForMissionBoard(dictation: string, scenarioId: string): LogUpdateParseResult {
  return buildReviewProjectionFromUniversalFacts({
    dictation,
    debriefRuns: ufRunsForMissionBoardReview(dictation, scenarioId),
    workflowLogUpdate: emptyWorkflowLogUpdate(dictation),
    existingFields: {},
  }).logUpdate;
}

async function openFieldNoteCapture(page: Page) {
  await page.goto("/portal/sales/providers");
  await expect(page.getByRole("tab", { name: /Mission Board/i })).toBeVisible({ timeout: 30_000 });
  const expandCard = page.getByRole("button", { name: /^Expand .+ mission card$/i }).first();
  await expect(expandCard).toBeVisible({ timeout: 30_000 });
  await expandCard.click();
  const dictate =
    page.getByTestId("mission-board-dictate").first()
      .or(page.getByRole("button", { name: /field note|dictate/i }).first());
  await expect(dictate).toBeVisible({ timeout: 30_000 });
  await dictate.click();
  await expect(page.getByRole("dialog", { name: /field note/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("Observation dictation intelligence", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000);
    fs.mkdirSync(screenshotDir, { recursive: true });
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("rules extraction: robotic ventral hernia note is clean", async () => {
    const labels = factLabelsFromDictation(ROBOTIC_VENTRAL_HERNIA_DICTATION);
    expect(labels).toMatch(/Bard Soft Mesh/i);
    expect(labels).toMatch(/AmchoPlast|Amchoplast/i);
    expect(labels).toMatch(/robotic ventral hernia/i);
    expect(labels).toMatch(/reach out.*(?:three|3)\s+weeks?/i);
    expect(labels).not.toMatch(/(?:Current|Competitor) product:\s*Commented That/i);
    expect(labels).not.toMatch(/Routine or smooth case progression/i);
  });

  for (const scenario of OBSERVATION_DICTATION_SCENARIOS) {
    test(`rules extraction scenario: ${scenario.name}`, async () => {
      const labels = factLabelsFromDictation(scenario.dictation);
      for (const pattern of scenario.expectVisible) {
        expect(labels, `missing ${pattern}`).toMatch(pattern);
      }
      for (const pattern of scenario.expectHidden) {
        expect(labels, `unexpected ${pattern}`).not.toMatch(pattern);
      }
    });
  }

  test("5 observations roll up with instance counts, not product duplicates", async () => {
    const whatWeKnow = whatWeKnowFromObservationDictations();
    fs.writeFileSync(path.join(screenshotDir, "five-observations-what-we-know.txt"), whatWeKnow, "utf8");

    expect(whatWeKnow).toMatch(/Bard Soft Mesh/i);
    expect(whatWeKnow).toMatch(/seen in [2-5] of 5 observations/i);
    expect(whatWeKnow).toMatch(/Sarah/i);
    expect(whatWeKnow).not.toMatch(/(?:Current|Competitor) product:\s*Commented That/i);

    const productLines = whatWeKnow
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter((line) => /bard soft mesh/.test(line));
    const unique = new Set(productLines);
    expect(unique.size).toBe(productLines.length);
    expect(productLines.length).toBeLessThanOrEqual(2);
  });

  test("UI review: alternate observation dictation surfaces clean intelligence", async ({ page }) => {
    const scenario = OBSERVATION_DICTATION_SCENARIOS[2]!;

    await page.route("**/api/portal/sales/log-update/map", async (route) => {
      const body = route.request().postDataJSON() as { rawNote?: string };
      if (body.rawNote !== scenario.dictation) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ ok: false }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          parse: reviewParseForMissionBoard(scenario.dictation, scenario.id),
          mapping_source: "universal-rules",
          discovery_context: null,
          provider_contact_snapshot: {
            first_name: "Tom",
            last_name: "Lettuce",
            display_name: "Tom Lettuce",
          },
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

    await openFieldNoteCapture(page);
    await page.getByRole("textbox", { name: /field note/i }).fill(scenario.dictation);
    await page.getByRole("checkbox", { name: /confirm this update contains no PHI/i }).check();
    await page.getByRole("button", { name: /review updates/i }).click();

    const reviewDialog = page.getByRole("dialog", { name: /review extracted intelligence/i });
    await expect(reviewDialog).toBeVisible({ timeout: 20_000 });
    const reviewText = await reviewDialog.innerText();
    expect(reviewText).toMatch(/Symbotex|Renee|clinical data|mesh/i);
    expect(reviewText).not.toMatch(/Current product:\s*Commented That/i);

    await page.screenshot({
      path: path.join(screenshotDir, "ui-review-lap-chole.png"),
      fullPage: true,
    });
  });

  test("UI review: original robotic ventral dictation has no Commented That", async ({ page }) => {
    await page.route("**/api/portal/sales/log-update/map", async (route) => {
      const body = route.request().postDataJSON() as { rawNote?: string };
      if (body.rawNote !== ROBOTIC_VENTRAL_HERNIA_DICTATION) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ ok: false }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          parse: reviewParseForMissionBoard(ROBOTIC_VENTRAL_HERNIA_DICTATION, "robotic-ventral"),
          mapping_source: "universal-rules",
          discovery_context: null,
          provider_contact_snapshot: {
            first_name: "Tom",
            last_name: "Lettuce",
            display_name: "Tom Lettuce",
          },
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

    await openFieldNoteCapture(page);
    await page.getByRole("textbox", { name: /field note/i }).fill(ROBOTIC_VENTRAL_HERNIA_DICTATION);
    await page.getByRole("checkbox", { name: /confirm this update contains no PHI/i }).check();
    await page.getByRole("button", { name: /review updates/i }).click();

    const reviewDialog = page.getByRole("dialog", { name: /review extracted intelligence/i });
    await expect(reviewDialog).toBeVisible({ timeout: 20_000 });
    const reviewText = await reviewDialog.innerText();
    expect(reviewText).toMatch(/Bard Soft Mesh|AmchoPlast|Amchoplast|ventral hernia|Sarah|clinical data/i);
    expect(reviewText).not.toMatch(/Current product:\s*Commented That/i);
    expect(reviewText).not.toMatch(/Routine or smooth case progression/i);

    await page.screenshot({
      path: path.join(screenshotDir, "ui-review-robotic-ventral.png"),
      fullPage: true,
    });
  });
});
