import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signIn } from "./helpers/signIn";

const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots", "provider-intelligence");

async function openProviderIntelligenceTab(page: import("@playwright/test").Page) {
  const providerId = process.env.E2E_PROVIDER_ID;
  if (providerId) {
    await page.goto(`/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`);
  } else {
    await page.goto("/portal/sales/providers");
    await page.waitForLoadState("networkidle");
    const providerLink = page.locator('a[href*="/portal/sales/providers/"]').filter({
      hasNot: page.locator('[href*="/portal/sales/providers/new"]'),
    });
    const href = await providerLink.evaluateAll((links) => {
      const uuidRe =
        /\/portal\/sales\/providers\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;
      for (const link of links) {
        if (!(link instanceof HTMLAnchorElement)) continue;
        const match = link.pathname.match(uuidRe);
        if (match?.[1]) return link.pathname;
      }
      return null;
    });
    if (!href) {
      test.skip(true, "No provider profiles in directory — set E2E_PROVIDER_ID");
    }
    await page.goto(`${href}?tab=intelligence`);
  }

  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("provider-intelligence-workspace")).toBeVisible({ timeout: 30_000 });
  await page
    .waitForResponse(
      (response) =>
        response.url().includes("/engagements") &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 30_000 },
    )
    .catch(() => undefined);
}

test.describe("Provider intelligence tab", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(screenshotDir, { recursive: true });
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("renders dossier, follow-ups, and relationship sections without duplicate junk", async ({ page }) => {
    await openProviderIntelligenceTab(page);

    await page.screenshot({
      path: path.join(screenshotDir, "intelligence-tab-full.png"),
      fullPage: true,
    });

    const dossier = page.getByTestId("provider-what-we-know-dossier");
    if ((await dossier.count()) > 0) {
      await expect(dossier.getByRole("heading", { name: "What We Know" })).toBeVisible();

      const dossierText = await dossier.innerText();
      expect(dossierText).not.toMatch(/\bGeneral\.?\b/i);
      expect(dossierText).not.toMatch(/Product preference centers on Observation interest/i);
      expect(dossierText).not.toMatch(/Product preference centers on Interested in observation/i);
      expect(dossierText).not.toMatch(/\bundefined\b/i);

      const factLines = dossier.locator(".pib-case-intel__signal");
      const texts = (await factLines.allTextContents()).map((line) => line.replace(/\s+/g, " ").trim());
      const normalized = texts.map((line) => line.toLowerCase());
      const dupes = normalized.filter((line, index) => normalized.indexOf(line) !== index);
      expect(dupes, `Duplicate dossier facts: ${dupes.join(", ")}`).toEqual([]);
    }

    const followUps = page.getByTestId("provider-follow-up-items");
    if ((await followUps.count()) > 0) {
      await expect(followUps.getByRole("heading", { name: "Follow-up Items" })).toBeVisible();
      const taskLines = followUps.locator(".pib-follow-up-item__text");
      const taskTexts = await taskLines.allTextContents();
      expect(taskTexts.every((line) => line.trim().length >= 8)).toBe(true);
      expect(taskTexts.some((line) => /I told him|Asked me to email her/i.test(line))).toBe(false);
    }

    const hamProviderId = "f9c5c791-52e6-47b4-8b31-ceda23ea8bc8";
    if (process.env.E2E_PROVIDER_ID === hamProviderId) {
      await expect(dossier).toContainText(/robotic ventral and inguinal hernia/i, { timeout: 30_000 });
      const dossierText = await dossier.innerText();
      expect(dossierText).toMatch(/bard soft mesh/i);
      expect(dossierText).not.toMatch(/\bGeneral\.?\b/i);
      expect(dossierText).not.toMatch(/him for long because/i);
      expect(dossierText).not.toMatch(/tuesdays and thursdays are\./i);
      expect(dossierText).not.toMatch(/Product preference centers on Wants/i);
      expect(dossierText).toMatch(/published outcomes before product change/i);

      if ((await followUps.count()) > 0) {
        const taskLines = followUps.locator(".pib-follow-up-item__text");
        const taskTexts = (await taskLines.allTextContents()).map((line) => line.replace(/\s+/g, " ").trim());
        expect(taskTexts).toHaveLength(2);
        expect(taskTexts).toEqual(
          expect.arrayContaining([
            "Share comparative clinical data and schedule observation case",
            "Email proposed observation dates",
          ]),
        );
        expect(taskTexts.some((line) => /\bshe said\b/i.test(line))).toBe(false);
        expect(taskTexts.some((line) => /easiest to schedule/i.test(line))).toBe(false);
      }
    }

    await dossier.screenshot({ path: path.join(screenshotDir, "intelligence-dossier.png") }).catch(() => undefined);
    await followUps.screenshot({ path: path.join(screenshotDir, "intelligence-follow-ups.png") }).catch(() => undefined);
  });

  test("section order: summary, dossier, follow-ups, access, people", async ({ page }) => {
    await openProviderIntelligenceTab(page);

    const sectionOrder = await page.evaluate(() => {
      const ids = [
        "provider-ai-summary",
        "provider-what-we-know-dossier",
        "provider-follow-up-items",
        "provider-access-pathway",
        "provider-key-people",
      ];
      return ids
        .map((id) => {
          const el = document.querySelector(`[data-testid="${id}"]`);
          return el ? { id, top: el.getBoundingClientRect().top } : null;
        })
        .filter(Boolean) as Array<{ id: string; top: number }>;
    });

    for (let i = 1; i < sectionOrder.length; i += 1) {
      expect(sectionOrder[i]!.top).toBeGreaterThanOrEqual(sectionOrder[i - 1]!.top);
    }
  });
});
