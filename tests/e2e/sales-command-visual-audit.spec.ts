import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signIn } from "./helpers/signIn";

const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots", "sales-command-audit");

const staticRoutes = [
  ["/portal/sales", "dashboard"],
  ["/portal/sales/opportunities", "opportunities"],
  ["/portal/sales/board", "board"],
  ["/portal/sales/providers", "providers"],
  ["/portal/sales/accounts", "accounts"],
  ["/portal/sales/contacts", "contacts"],
  ["/portal/sales/cases", "cases"],
  ["/portal/sales/engagements", "engagements"],
  ["/portal/sales/calendar", "calendar"],
  ["/portal/sales/tasks", "tasks"],
  ["/portal/sales/time-off", "time-off"],
  ["/portal/sales/products", "products"],
  ["/portal/sales/analytics", "analytics"],
  ["/portal/sales/leaderboard", "leaderboard"],
] as const;

const detailRoutes = [
  ["/portal/sales/opportunities", "/portal/sales/opportunities/", "opportunity-detail"],
  ["/portal/sales/providers", "/portal/sales/providers/", "provider-detail"],
  ["/portal/sales/accounts", "/portal/sales/accounts/", "account-detail"],
  ["/portal/sales/contacts", "/portal/sales/contacts/", "contact-detail"],
  ["/portal/sales/cases", "/portal/sales/cases/", "case-detail"],
  ["/portal/sales/engagements", "/portal/sales/engagements/", "engagement-detail"],
] as const;

async function capture(page: import("@playwright/test").Page, label: string) {
  await expect(page.locator("body")).toBeVisible();
  const loading = page.getByText(/loading/i).first();
  if ((await loading.count()) > 0) {
    await loading.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(screenshotDir, `${label}.png`),
    fullPage: true,
  });
}

test.describe("Sales Command visual audit", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(screenshotDir, { recursive: true });
    await signIn(page);
  });

  test("desktop command pages render polished surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 920 });

    for (const [route, label] of staticRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await capture(page, `desktop-${label}`);
      await expect(page).not.toHaveURL(/\/login/);
    }

    for (const [sourceRoute, hrefPrefix, label] of detailRoutes) {
      await page.goto(sourceRoute, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      const href = await page
        .locator(`a[href*="${hrefPrefix}"]`)
        .evaluateAll((links, prefix) => {
          const candidates = links
            .map((link) => (link instanceof HTMLAnchorElement ? link.pathname : ""))
            .filter((pathname) => pathname.startsWith(prefix))
            .filter((pathname) => !pathname.endsWith("/new"))
            .filter((pathname) => pathname.split("/").filter(Boolean).length > prefix.split("/").filter(Boolean).length);
          return candidates[0] ?? null;
        }, hrefPrefix);
      if (!href) continue;
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await capture(page, `desktop-${label}`);
    }
  });

  test("mobile command pages keep premium native chrome", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const [route, label] of staticRoutes) {
      await page.goto(route, { waitUntil: "commit" });
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await capture(page, `mobile-${label}`);
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
