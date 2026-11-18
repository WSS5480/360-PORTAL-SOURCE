import { test, expect } from "@playwright/test";
import { runDebriefExtractionPipeline } from "../../src/lib/surgical-sales/debriefExtractionRegressionRunner";
import { MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION } from "../../src/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildTacticalDebriefAnalysisFromLogUpdate } from "../../src/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import { runUniversalSurgicalExtraction } from "../../src/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "../../src/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { signIn } from "./helpers/signIn";

function ufRunsFromDictation(dictation: string, captureId: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
  });
  return [
    {
      capture_id: captureId,
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `${captureId}-${index}`,
        capture_id: captureId,
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

test.describe("Debrief intelligence review", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/debrief-after-signin.png", fullPage: true });
  });

  test("shows Suggested Updates intelligence brief after analyze (not legacy approval UI)", async ({
    page,
  }) => {
    const engagementId = process.env.E2E_ENGAGEMENT_ID;
    if (!engagementId) {
      test.skip(true, "Set E2E_ENGAGEMENT_ID to a completed intro-call engagement");
    }

    const dictation = MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION;
    const pipeline = runDebriefExtractionPipeline({ dictation });
    const debriefUniversalFactsRuns = ufRunsFromDictation(dictation, "capture-mark-onion-e2e");
    const logUpdate = {
      ...pipeline.parse,
      usesProviderIntelligence: true,
      debriefUniversalFactsRuns,
    };
    const analysis = buildTacticalDebriefAnalysisFromLogUpdate(dictation, logUpdate, {
      providerId: "provider-e2e",
    });

    await page.route(
      `**/api/portal/sales/engagements/${engagementId}/prepare/debrief/analyze`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            analysis,
            facts: pipeline.parse.atomicFacts ?? [],
            mapping_source: "openai",
            propagation_targets: [],
            discovery_context: null,
            provider_contact_snapshot: null,
            engagement_outcome_id: null,
            is_post_observation_provider_debrief: false,
            debrief_validation_results: [],
            debrief_next_step: null,
          }),
        });
      },
    );

    await page.goto(`/portal/sales/engagements/${engagementId}/debrief`);
    await page.screenshot({ path: "test-results/debrief-after-route.png", fullPage: true });

    const sheet = page.locator(".pfm-debrief-sheet");
    await expect(sheet).toBeVisible({ timeout: 20_000 });

    const textarea = page.getByRole("textbox", { name: /visit debrief/i });
    await textarea.fill(dictation);

    await page.getByRole("button", { name: /analyze|save.*analyze|continue/i }).click();
    await page.screenshot({ path: "test-results/debrief-after-analyze-click.png", fullPage: true });

    await expect(page.getByTestId("ai-intelligence-brief")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: "test-results/debrief-after-intelligence-brief.png", fullPage: true });
    await expect(page.getByTestId("ai-debrief-review-suggestions")).toBeVisible();
    await expect(page.getByText("Still to confirm")).toHaveCount(0);
    await expect(page.getByText("Save Selected Updates")).toHaveCount(0);

    const jennifer = page.getByText(/jennifer/i);
    await expect(jennifer.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Did Not\s+—\s+Scheduling Coordinator/i)).toHaveCount(0);
    await expect(page.getByText(/Ventral hernia repair/i).first()).toBeVisible();
    await expect(page.getByText(/Abdominal wall reconstruction/i).first()).toBeVisible();
    await expect(page.getByText(/Positive provider sentiment|Relationship momentum|open to continued discussion/i).first()).toBeVisible();
    await expect(page.getByText(/Connect with Jennifer|confirm the observation process|continue the relationship/i).first()).toBeVisible();

    const footerPrimary = page.locator(".pfm-debrief-footer-primary");
    await expect(footerPrimary).toBeVisible();
    const primaryBox = await footerPrimary.boundingBox();
    const editButton = page.getByRole("button", { name: /edit debrief/i });
    if ((await editButton.count()) > 0) {
      const editBox = await editButton.boundingBox();
      expect(primaryBox).toBeTruthy();
      expect(editBox).toBeTruthy();
      if (primaryBox && editBox) {
        expect(editBox.y).toBeGreaterThan(primaryBox.y + primaryBox.height - 4);
      }
    }

    await page.locator(".pfm-debrief-body").evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await page.screenshot({ path: "test-results/debrief-after-review-bottom.png", fullPage: true });
  });
});
