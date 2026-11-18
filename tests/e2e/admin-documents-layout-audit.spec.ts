import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signIn } from "./helpers/signIn";

const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots", "admin-documents-layout-audit");
const reportPath = path.join(screenshotDir, "layout-audit.json");

type Box = { x: number; y: number; width: number; height: number } | null;

async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };
    const text = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? null;
    const count = (sel: string) => document.querySelectorAll(sel).length;

    const root = document.querySelector('[data-testid="admin-docs-root"]');
    const browser = document.querySelector('[data-testid="admin-docs-browser"]');
    const tree = document.querySelector('[data-testid="admin-docs-tree"]');
    const upload = document.querySelector('[data-testid="admin-docs-upload-zone"]');
    const legend = document.querySelector('[data-testid="admin-docs-access-legend"]');
    const visibility = document.querySelector('[data-testid="admin-docs-visibility-control"]');

    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 2;
    const pageScrollHeight = document.documentElement.scrollHeight;

    const competingChrome = {
      adminNav: !!document.querySelector("header, nav, [data-testid*='admin-nav'], a[href='/admin']"),
      pageHeader: !!document.querySelector("h1"),
      libraryBar: !!legend,
      folderTree: !!tree,
      browserHeader: !!browser,
      uploadZone: !!upload,
      visibilityControl: !!visibility,
    };

    const issues: string[] = [];
    if (overflowX) issues.push("horizontal_overflow");
    if (pageScrollHeight > window.innerHeight * 1.6) issues.push("tall_page_before_content");
    if (legend && (legend.getBoundingClientRect().height > 120)) issues.push("legend_tall");
    if (tree && browser) {
      const treeBox = tree.getBoundingClientRect();
      const browserBox = browser.getBoundingClientRect();
      if (treeBox.width > browserBox.width * 0.45) issues.push("tree_too_wide_vs_browser");
    }
    if (!visibility && document.querySelector('[data-testid="admin-docs-location-title"]')) {
      const title = document.querySelector('[data-testid="admin-docs-location-title"]')?.textContent ?? "";
      if (!/library/i.test(title)) issues.push("folder_open_without_visibility_control");
    }

    const firstFolder = document.querySelector('[data-testid^="admin-docs-tree-folder-"]') as HTMLElement | null;

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pageScrollHeight,
      overflowX,
      competingChrome,
      issues,
      boxes: {
        root: box(root),
        tree: box(tree),
        browser: box(browser),
        upload: box(upload),
        legend: box(legend),
        visibility: box(visibility),
        locationTitle: box(document.querySelector('[data-testid="admin-docs-location-title"]')),
      },
      copy: {
        h1: text("h1"),
        locationTitle: text('[data-testid="admin-docs-location-title"]'),
        legend: text('[data-testid="admin-docs-access-legend"]'),
        uploadTitle: document.querySelector('[data-testid="admin-docs-upload-zone"] .uploadTitle, [data-testid="admin-docs-upload-zone"] p')?.textContent?.trim() ?? null,
      },
      counts: {
        treeFolders: count('[data-testid^="admin-docs-tree-folder-"]'),
        folderRows: count('[data-testid^="admin-docs-folder-row-"]'),
        fileRows: count('[data-testid^="admin-docs-file-row-"]'),
        accessPills: count('[class*="pill"]'),
        filterChips: count('[data-testid^="admin-docs-filter-"]'),
      },
      firstFolderLabel: firstFolder?.innerText?.replace(/\s+/g, " ").trim() ?? null,
    };
  });
}

async function captureScene(
  page: import("@playwright/test").Page,
  label: string,
  report: Record<string, unknown>,
) {
  await page.waitForTimeout(400);
  const metrics = await measure(page);
  report[label] = metrics;
  await page.screenshot({
    path: path.join(screenshotDir, `${label}.png`),
    fullPage: true,
  });
  await page.screenshot({
    path: path.join(screenshotDir, `${label}-viewport.png`),
    fullPage: false,
  });
}

test.describe("Admin documents layout audit", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(screenshotDir, { recursive: true });
    await signIn(page);
  });

  test("capture /admin/documents desktop + mobile layout research", async ({ page }) => {
    const report: Record<string, unknown> = { generatedAt: new Date().toISOString() };

    // Desktop — library root
    await page.setViewportSize({ width: 1440, height: 920 });
    await page.goto("/admin/documents", { waitUntil: "domcontentloaded" });

    if (await page.getByText(/forbidden|not authorized|access denied/i).isVisible().catch(() => false)) {
      test.skip(true, "E2E user lacks admin access for /admin/documents");
    }

    const root = page.getByTestId("admin-docs-root");
    await expect(root).toBeVisible({ timeout: 25_000 });
    await page.getByTestId("admin-docs-browser").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(800);

    await captureScene(page, "desktop-root", report);

    // Ensure at least one folder exists so we can audit folder-open UX
    const auditFolderName = `Layout Audit ${Date.now()}`;
    let createdAuditFolder = false;
    let firstFolder = page.locator('[data-testid^="admin-docs-tree-folder-"]').first();
    if ((await firstFolder.count()) === 0) {
      await page.getByTestId("admin-docs-new-folder-input").fill(auditFolderName);
      await page.getByTestId("admin-docs-create-folder-btn").click();
      await expect(page.getByTestId("admin-docs-location-title")).toHaveText(auditFolderName, { timeout: 15_000 });
      createdAuditFolder = true;
      firstFolder = page.locator('[data-testid^="admin-docs-tree-folder-"]').first();
    } else {
      await firstFolder.click();
      await page.waitForTimeout(700);
    }

    await captureScene(page, "desktop-folder", report);

    const settingsBtn = page.getByTestId("admin-docs-settings-btn");
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await expect(page.getByTestId("admin-docs-settings-drawer")).toBeVisible();
      await captureScene(page, "desktop-settings", report);
      await page.locator('[data-testid="admin-docs-settings-drawer"] button[aria-label="Close settings"]').click().catch(async () => {
        await page.getByTestId("admin-docs-settings-drawer").getByRole("button", { name: /^close$/i }).click();
      });
      await page.waitForTimeout(300);
    }

    const upload = page.getByTestId("admin-docs-upload-zone");
    if (await upload.isVisible().catch(() => false)) {
      await upload.scrollIntoViewIfNeeded();
      await captureScene(page, "desktop-upload", report);
    }

    if (createdAuditFolder) {
      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByTestId("admin-docs-settings-btn").click();
      await page.getByTestId("admin-docs-delete-folder-btn").click();
      await page.waitForTimeout(800);
    }

    // Narrow desktop / tablet
    await page.setViewportSize({ width: 1100, height: 820 });
    await page.goto("/admin/documents", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("admin-docs-root")).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(600);
    await captureScene(page, "tablet-root", report);

    const firstFolderTablet = page.locator('[data-testid^="admin-docs-tree-folder-"]').first();
    if ((await firstFolderTablet.count()) > 0) {
      await firstFolderTablet.click();
      await page.waitForTimeout(600);
      await captureScene(page, "tablet-folder", report);
    }

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/documents", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("admin-docs-root")).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(600);
    await captureScene(page, "mobile-root", report);

    const firstFolderMobile = page.locator('[data-testid^="admin-docs-tree-folder-"]').first();
    if ((await firstFolderMobile.count()) > 0) {
      await firstFolderMobile.click();
      await page.waitForTimeout(600);
      await captureScene(page, "mobile-folder", report);
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Layout audit written to ${reportPath}`);
  });
});
