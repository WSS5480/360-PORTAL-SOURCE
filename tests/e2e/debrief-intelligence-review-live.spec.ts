import { test, expect } from "@playwright/test";
import { MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION } from "../../src/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { signIn } from "./helpers/signIn";

test.describe("Debrief intelligence review live analyze", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("live analyze returns actionable intelligence for Mark Onion debrief", async ({ page }) => {
    const engagementId = process.env.E2E_ENGAGEMENT_ID;
    if (!engagementId) {
      test.skip(true, "Set E2E_ENGAGEMENT_ID to a completed intro-call engagement");
    }

    const analyzeResponses: Array<{
      status: number;
      ok?: boolean;
      hasAnalysis: boolean;
      hasLogUpdate: boolean;
      atomicFactCount: number;
      ufRunCount: number;
      fieldUpdateCount: number;
      universalConcepts: string[];
      error?: string;
    }> = [];

    page.on("response", async (response) => {
      if (!response.url().includes(`/api/portal/sales/engagements/${engagementId}/prepare/debrief/analyze`)) {
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            analysis?: {
              log_update?: {
                atomicFacts?: unknown[];
                debriefUniversalFactsRuns?: Array<{
                  facts?: Array<{ concept?: string; normalized_label?: string }>;
                }>;
                fieldUpdates?: unknown[];
              } | null;
            } | null;
          }
        | null;

      analyzeResponses.push({
        status: response.status(),
        ok: body?.ok,
        hasAnalysis: Boolean(body?.analysis),
        hasLogUpdate: Boolean(body?.analysis?.log_update),
        atomicFactCount: body?.analysis?.log_update?.atomicFacts?.length ?? 0,
        ufRunCount: body?.analysis?.log_update?.debriefUniversalFactsRuns?.length ?? 0,
        fieldUpdateCount: body?.analysis?.log_update?.fieldUpdates?.length ?? 0,
        universalConcepts:
          body?.analysis?.log_update?.debriefUniversalFactsRuns?.flatMap((run) =>
            (run.facts ?? []).map((fact) => `${fact.concept ?? "unknown"}:${fact.normalized_label ?? ""}`),
          ) ?? [],
        error: body?.error,
      });
    });

    await page.goto(`/portal/sales/engagements/${engagementId}/debrief`);
    await expect(page.locator(".pfm-debrief-sheet")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("textbox", { name: /visit debrief/i }).fill(MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION);
    await page.screenshot({ path: "test-results/live-debrief-before-analyze.png", fullPage: true });

    const analyzeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/portal/sales/engagements/${engagementId}/prepare/debrief/analyze`) &&
        response.request().method() === "POST",
      { timeout: 120_000 },
    );
    await page.getByRole("button", { name: /^analyze$/i }).click();
    await analyzeResponsePromise;
    await expect(page.getByText(/Processing field intelligence/i)).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId("ai-intelligence-brief")).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: "test-results/live-debrief-after-analyze.png", fullPage: true });

    console.log("[live-debrief-analyze]", JSON.stringify(analyzeResponses, null, 2));

    await expect(page.getByText("No actionable intelligence from this debrief.")).toHaveCount(0);
    expect(analyzeResponses.at(-1)?.hasLogUpdate).toBe(true);
    await expect(page.getByText(/Scheduling coordinator identified/i)).toBeVisible();
    await expect(page.getByText(/Ventral hernia repair/i).first()).toBeVisible();
    await expect(page.getByText(/Positive provider sentiment/i)).toBeVisible();
    await expect(page.getByText(/Next step identified/i)).toBeVisible();

    await page.locator(".pfm-debrief-body").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByText(/Abdominal wall reconstruction/i).first()).toBeVisible();
    await page.screenshot({ path: "test-results/live-debrief-after-review-bottom.png", fullPage: true });
  });

  test("reopened debrief review still shows every Mark Onion signal", async ({ page }) => {
    const engagementId = process.env.E2E_ENGAGEMENT_ID;
    if (!engagementId) {
      test.skip(true, "Set E2E_ENGAGEMENT_ID to a completed intro-call engagement");
    }

    await page.goto(`/portal/sales/engagements/${engagementId}/debrief`);
    const initialState = await Promise.race([
      page.getByText("Suggested Updates").waitFor({ state: "visible", timeout: 60_000 }).then(() => "review" as const),
      page.getByRole("textbox", { name: /visit debrief/i }).waitFor({ state: "visible", timeout: 60_000 }).then(() => "capture" as const),
    ]);
    if (initialState === "capture") {
      test.skip(true, "This engagement is currently in capture mode, not saved-review mode");
    }
    await expect(page.getByText("Suggested Updates")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("No actionable intelligence from this debrief.")).toHaveCount(0);
    await page.screenshot({ path: "test-results/live-debrief-reopened-top.png", fullPage: true });

    await expect(page.getByText(/Observation access/i).first()).toBeVisible();
    await expect(page.getByText(/Jennifer Reynolds|Scheduling coordinator identified/i).first()).toBeVisible();
    await expect(page.getByText(/Ventral hernia repair/i).first()).toBeVisible();
    await expect(page.getByText(/Abdominal wall reconstruction/i).first()).toBeVisible();
    await expect(page.getByText(/Positive provider sentiment|Relationship-building stage/i).first()).toBeVisible();

    await page.locator(".pfm-debrief-body").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByText(/Connect with Jennifer|Next step identified/i).first()).toBeVisible();
    await page.screenshot({ path: "test-results/live-debrief-reopened-bottom.png", fullPage: true });
  });
});
