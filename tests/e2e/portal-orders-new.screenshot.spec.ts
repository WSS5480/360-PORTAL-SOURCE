import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("portal new order screenshot", async ({ page }) => {
  test.setTimeout(60_000);
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "Missing E2E_USER_EMAIL or E2E_USER_PASSWORD");
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("Your password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/portal(\/|$)/, { timeout: 20000 });

  await page.goto("/portal/orders/new");
  await page.waitForLoadState("networkidle");

  await page.setViewportSize({ width: 1440, height: 900 });
  const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, "portal-orders-new.png"), fullPage: true });
});
