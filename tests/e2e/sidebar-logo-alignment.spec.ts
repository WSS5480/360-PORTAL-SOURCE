import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/signIn";

type BoxMetrics = {
  leftGap: number;
  rightGap: number;
  topGap: number;
  bottomGap: number;
};

async function measureLogoCentering(page: import("@playwright/test").Page): Promise<BoxMetrics> {
  const stage = page.locator('[aria-label="360 Medical"]');
  const logo = stage.locator("img");

  await expect(stage).toBeVisible();
  await expect(logo).toBeVisible();

  return page.evaluate(() => {
    const stageEl = document.querySelector('[aria-label="360 Medical"]');
    const imgEl = stageEl?.querySelector("img");
    if (!stageEl || !imgEl) {
      throw new Error("Sidebar logo elements not found");
    }

    const stage = stageEl.getBoundingClientRect();
    const img = imgEl.getBoundingClientRect();

    return {
      leftGap: img.left - stage.left,
      rightGap: stage.right - img.right,
      topGap: img.top - stage.top,
      bottomGap: stage.bottom - img.bottom,
    };
  });
}

async function measureLogoFill(page: import("@playwright/test").Page): Promise<{ heightFill: number; widthFill: number }> {
  return page.evaluate(() => {
    const stageEl = document.querySelector('[aria-label="360 Medical"]');
    const imgEl = stageEl?.querySelector("img");
    if (!stageEl || !imgEl) {
      throw new Error("Sidebar logo elements not found");
    }

    const stage = stageEl.getBoundingClientRect();
    const img = imgEl.getBoundingClientRect();
    const left = Math.max(stage.left, img.left);
    const right = Math.min(stage.right, img.right);
    const top = Math.max(stage.top, img.top);
    const bottom = Math.min(stage.bottom, img.bottom);

    return {
      heightFill: Math.max(0, bottom - top) / stage.height,
      widthFill: Math.max(0, right - left) / stage.width,
    };
  });
}

async function measureStageHeight(page: import("@playwright/test").Page): Promise<number> {
  return page.locator('[aria-label="360 Medical"]').evaluate((el) => el.getBoundingClientRect().height);
}

test.describe("Sidebar logo alignment", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/portal/sales", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[aria-label="360 Medical"]')).toBeVisible({ timeout: 15_000 });
  });

  test("360 logo is centered in the sidebar brand stage on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 920 });

    const metrics = await measureLogoCentering(page);
    const horizontalDelta = Math.abs(metrics.leftGap - metrics.rightGap);
    const verticalDelta = Math.abs(metrics.topGap - metrics.bottomGap);

    expect(horizontalDelta, `horizontal offset: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(2);
    expect(verticalDelta, `vertical offset: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(2);

    const fill = await measureLogoFill(page);
    expect(fill.heightFill, `logo height fill: ${JSON.stringify(fill)}`).toBeGreaterThanOrEqual(0.98);
    expect(fill.widthFill, `logo width fill: ${JSON.stringify(fill)}`).toBeGreaterThanOrEqual(0.98);

    const stageHeight = await measureStageHeight(page);
    expect(stageHeight, "logo container should stay compact").toBeLessThanOrEqual(48);
  });

  test("360 logo is centered in the sidebar brand stage on mobile drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.querySelector(".portal-sidebar")?.classList.add("portal-sidebar-open");
    });

    const metrics = await measureLogoCentering(page);
    const horizontalDelta = Math.abs(metrics.leftGap - metrics.rightGap);
    const verticalDelta = Math.abs(metrics.topGap - metrics.bottomGap);

    expect(horizontalDelta, `horizontal offset: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(2);
    expect(verticalDelta, `vertical offset: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(2);
  });
});
