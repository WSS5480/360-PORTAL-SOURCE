import { test, expect } from "@playwright/test";

test("login page responds", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/login/);
});
