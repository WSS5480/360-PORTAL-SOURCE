import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("portal orders screenshot", async ({ page }) => {
  test.setTimeout(60_000);
  const magicLink = process.env.E2E_MAGICLINK;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (magicLink) {
    await page.goto(magicLink);
    await page.waitForLoadState("networkidle");
  } else {
    if (!email || !password) {
      test.skip(true, "Missing E2E_MAGICLINK or E2E_USER_EMAIL/E2E_USER_PASSWORD");
    }

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    await page.getByPlaceholder("you@company.com").fill(email);
    await page.getByPlaceholder("Your password").fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await page.waitForURL(/\/portal(\/|$)/, { timeout: 20000 });
  }

  await page.goto("/portal/orders");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.setViewportSize({ width: 1440, height: 900 });

  const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, "portal-orders.png"), fullPage: true });
});
