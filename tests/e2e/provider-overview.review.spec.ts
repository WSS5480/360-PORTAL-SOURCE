import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signIn } from "./helpers/signIn";

test.describe("Provider overview — visual review", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("main panel hierarchy: mission, metrics, gap/move, knowledge grid", async ({ page }) => {
    const providerId = process.env.E2E_PROVIDER_ID;
    if (providerId) {
      await page.goto(`/portal/sales/providers/${encodeURIComponent(providerId)}`);
    } else {
      await page.goto("/portal/sales/providers");
      await page.waitForLoadState("networkidle");
      const firstProvider = page.locator('a[href*="/portal/sales/providers/"]').first();
      const count = await firstProvider.count();
      if (count === 0) {
        test.skip(true, "No providers in directory — set E2E_PROVIDER_ID");
      }
      await firstProvider.click();
    }

    await page.waitForURL(/\/portal\/sales\/providers\/[^/]+/, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    const overview = page.getByTestId("provider-overview-body");
    await expect(overview).toBeVisible({ timeout: 15_000 });

    const mainPanel = page.getByTestId("pov-main-panel");
    await expect(mainPanel).toBeVisible();

    await expect(page.getByTestId("pov-command-header")).toBeVisible();
    await expect(page.getByTestId("pov-pathway-header")).toBeVisible();
    await expect(page.getByTestId("pov-pathway-track")).toBeVisible();
    await expect(page.getByTestId("pov-stage-requirements")).toBeVisible();
    await expect(page.getByTestId("pov-know-grid")).toBeVisible();
    await expect(page.getByTestId("pov-blocker-band")).toBeVisible();

    const pathwaySteps = page.locator(".pov-pathway-track__step");
    await expect(pathwaySteps).toHaveCount(6);

    const rail = page.getByTestId("pov-rail");
    await expect(rail).toBeVisible();
    await expect(page.getByTestId("pov-rail-upcoming")).toBeVisible();

    const commandBox = await page.getByTestId("pov-command-header").boundingBox();
    const opsMain = page.locator(".pov-zone-ops-main");
    const knowBox = await page.getByTestId("pov-know-grid").boundingBox();
    const railBox = await rail.boundingBox();
    const opsMainBox = await opsMain.boundingBox();
    expect(commandBox).toBeTruthy();
    expect(knowBox).toBeTruthy();
    expect(railBox).toBeTruthy();
    expect(opsMainBox).toBeTruthy();
    if (commandBox && knowBox && opsMainBox) {
      expect(opsMainBox.y).toBeGreaterThan(commandBox.y);
      expect(knowBox.y).toBeGreaterThan(opsMainBox.y);
    }

    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1101 && opsMainBox && railBox) {
      expect(railBox.x).toBeGreaterThan(opsMainBox.x);
    }

    const primaryGap = page.getByTestId("pov-primary-gap");
    if ((await primaryGap.count()) > 0) {
      await expect(primaryGap).toBeVisible();
    }

    const bodyWidth = await overview.evaluate((el) => el.getBoundingClientRect().width);
    const profileBody = page.locator(".provider-profile-body");
    const profileWidth = await profileBody.evaluate((el) => el.getBoundingClientRect().width);
    if (profileWidth > 0) {
      expect(bodyWidth / profileWidth).toBeGreaterThan(0.85);
    }

    const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, "provider-overview-review.png"),
      fullPage: true,
    });
    await mainPanel.screenshot({
      path: path.join(screenshotDir, "provider-overview-main-panel.png"),
    });
  });

  test("mobile layout stacks rail and uses single-column metrics", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const providerId = process.env.E2E_PROVIDER_ID;
    if (providerId) {
      await page.goto(`/portal/sales/providers/${encodeURIComponent(providerId)}`);
    } else {
      await page.goto("/portal/sales/providers");
      await page.waitForLoadState("networkidle");
      const firstProvider = page.locator('a[href*="/portal/sales/providers/"]').first();
      if ((await firstProvider.count()) === 0) {
        test.skip(true, "No providers in directory — set E2E_PROVIDER_ID");
      }
      await firstProvider.click();
    }

    await page.waitForURL(/\/portal\/sales\/providers\/[^/]+/, { timeout: 20_000 });
    await expect(page.getByTestId("provider-overview-body")).toBeVisible({ timeout: 15_000 });

    const layout = page.locator(".pov-briefing-layout");
    const layoutCols = await layout.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    expect(layoutCols.split(" ").length).toBe(1);

    const track = page.getByTestId("pov-pathway-track");
    await expect(track).toBeVisible();

    const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, "provider-overview-mobile.png"),
      fullPage: true,
    });
  });
});
