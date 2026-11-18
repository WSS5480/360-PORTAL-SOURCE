import { test, expect } from "@playwright/test";

test.describe("Virtual warehouse page", () => {
  test("pie shows mocked committed slice and stays compact", async ({ page }) => {
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
      await page.getByPlaceholder("you@company.com").fill(email!);
      await page.getByPlaceholder("Your password").fill(password!);
      await page.getByRole("button", { name: /^sign in$/i }).click();
      await page.waitForURL(/\/portal(\/|$)/, { timeout: 20_000 });
    }

    await page.route("**/api/portal/virtual-warehouse", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          balances: [],
          sqcm_pool: 192,
          total_sqcm_on_hand: 192,
          sqcm_vw_used: 8,
        }),
      });
    });

    await page.goto("/portal/virtual-warehouse", { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 1280, height: 800 });

    const pie = page.getByTestId("vw-sqcm-pie");
    await expect(pie).toBeVisible();
    await expect(pie.getByText("Committed", { exact: true })).toBeVisible();
    await expect(pie.getByText("On hand", { exact: true })).toBeVisible();
    const pieText = (await pie.innerText()).replace(/\s+/g, " ").trim();
    expect(pieText).toMatch(/On hand.*192/);
    expect(pieText).toMatch(/Committed.*\b8\b/);

    const box = await pie.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThan(170);
    expect(box!.width).toBeLessThan(400);
  });
});
