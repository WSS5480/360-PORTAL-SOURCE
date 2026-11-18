import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signIn } from "./helpers/signIn";

const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots", "admin-documents");
const RUN_ID = Date.now();
const FOLDER_NAME = `E2E Docs ${RUN_ID}`;
const SUBFOLDER_NAME = `E2E Sub ${RUN_ID}`;
const RENAMED_FOLDER = `E2E Renamed ${RUN_ID}`;
const LINK_TITLE = `E2E Link ${RUN_ID}`;
const FILE_TITLE = `E2E File ${RUN_ID}`;

test.describe("Admin documents library", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(screenshotDir, { recursive: true });
    await signIn(page);
  });

  test("documents step supports full library management workflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 920 });
    await page.goto("/admin/setup?step=documents", { waitUntil: "domcontentloaded" });

    if (await page.getByText(/forbidden|not authorized|access denied/i).isVisible().catch(() => false)) {
      test.skip(true, "E2E user lacks admin access for /admin/setup");
    }

    const root = page.getByTestId("admin-docs-root");
    await expect(root).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("admin-docs-browser")).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "01-initial.png"), fullPage: true });

    // Create top-level folder
    await page.getByTestId("admin-docs-new-folder-input").fill(FOLDER_NAME);
    await page.getByTestId("admin-docs-create-folder-btn").click();
    await expect(page.getByTestId("admin-docs-location-title")).toHaveText(FOLDER_NAME, { timeout: 15_000 });

    // Folder settings: rename, access, description
    await page.getByTestId("admin-docs-settings-btn").click();
    const drawer = page.getByTestId("admin-docs-settings-drawer");
    await expect(drawer).toBeVisible();
    await page.getByTestId("admin-docs-settings-name").fill(RENAMED_FOLDER);
    await page.getByTestId("admin-docs-settings-access").selectOption("territory_managers");
    await page.getByTestId("admin-docs-settings-description").fill("Territory manager training pack");
    await page.getByTestId("admin-docs-save-folder-btn").click();
    await expect(drawer).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("admin-docs-location-title")).toHaveText(RENAMED_FOLDER);

    await page.screenshot({ path: path.join(screenshotDir, "02-folder-settings.png"), fullPage: true });

    // Rep preview
    await page.getByTestId("admin-docs-preview-btn").click();
    await expect(page.getByTestId("admin-docs-rep-preview")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("admin-docs-rep-preview")).toBeHidden();

    // Subfolder
    await page.getByTestId("admin-docs-new-subfolder-btn").click();
    await page.getByTestId("admin-docs-subfolder-input").fill(SUBFOLDER_NAME);
    await page.getByTestId("admin-docs-subfolder-create").click();
    await expect(page.getByTestId("admin-docs-location-title")).toHaveText(SUBFOLDER_NAME, { timeout: 10_000 });

    // Add external link
    await page.getByTestId("admin-docs-link-title").fill(LINK_TITLE);
    await page.getByTestId("admin-docs-link-url").fill("https://example.com/training");
    await page.getByTestId("admin-docs-add-link-btn").click();
    await expect(page.locator('[data-testid^="admin-docs-file-row-"]').filter({ hasText: LINK_TITLE })).toBeVisible({ timeout: 15_000 });

    // Upload file
    await page.getByTestId("admin-docs-file-input").setInputFiles({
      name: "sell-sheet.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Sample sell sheet content for e2e."),
    });
    const uploadedRow = page.locator('[data-testid^="admin-docs-file-row-"]').filter({ hasText: /sell sheet/i });
    await uploadedRow.scrollIntoViewIfNeeded();
    await expect(uploadedRow).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: path.join(screenshotDir, "03-folder-with-content.png"), fullPage: true });

    // Rename uploaded file
    await uploadedRow.getByRole("button", { name: "Rename" }).click();
    await page.getByTestId("admin-docs-file-rename-input").fill(FILE_TITLE);
    await page.getByTestId("admin-docs-file-rename-input").press("Enter");
    await expect(page.locator('[data-testid^="admin-docs-file-row-"]').filter({ hasText: FILE_TITLE })).toBeVisible({ timeout: 10_000 });

    // Search
    await page.getByTestId("admin-docs-search").fill(FILE_TITLE);
    await expect(page.locator('[data-testid^="admin-docs-file-row-"]').filter({ hasText: FILE_TITLE })).toHaveCount(1);
    await page.getByTestId("admin-docs-search").fill("");

    // Access filter chips (folder is TM-only)
    await page.getByTestId("admin-docs-filter-territory_managers").click();
    await expect(page.getByTestId("admin-docs-location-title")).toHaveText(SUBFOLDER_NAME);
    await page.getByTestId("admin-docs-filter-all").click();

    // Grid / list toggle
    await page.getByTestId("admin-docs-view-grid").click();
    await expect(page.locator('[data-testid^="admin-docs-grid-file-"]').first()).toBeVisible();
    await page.getByTestId("admin-docs-view-list").click();

    // Breadcrumb back to parent
    await page.getByTestId("admin-docs-breadcrumb").getByRole("button", { name: RENAMED_FOLDER }).click();
    await expect(page.getByTestId("admin-docs-location-title")).toHaveText(RENAMED_FOLDER);

    // Open subfolder again and remove link
    await page.locator(`[data-folder-name="${SUBFOLDER_NAME}"]`).first().click();
    await expect(page.getByTestId("admin-docs-location-title")).toHaveText(SUBFOLDER_NAME);
    page.once("dialog", (d) => d.accept());
    const linkRow = page.locator('[data-testid^="admin-docs-file-row-"]').filter({ hasText: LINK_TITLE });
    await linkRow.locator('input[type="checkbox"]').check();
    await page.getByTestId("admin-docs-bulk-delete").click();
    await expect(page.getByTestId("admin-docs-file-title").filter({ hasText: LINK_TITLE })).toHaveCount(0, { timeout: 10_000 });

    await page.screenshot({ path: path.join(screenshotDir, "04-after-edits.png"), fullPage: true });

    // Delete subfolder via settings
    page.once("dialog", (d) => d.accept());
    await page.getByTestId("admin-docs-settings-btn").click();
    await page.getByTestId("admin-docs-delete-folder-btn").click();
    await expect(page.getByTestId("admin-docs-location-title")).toHaveText(RENAMED_FOLDER, { timeout: 10_000 });

    // Delete parent folder from root list
    await page.getByTestId("admin-docs-nav-root").click();
    page.once("dialog", (d) => d.accept());
    const parentRow = page.locator('[data-testid^="admin-docs-folder-row-"]').filter({ hasText: RENAMED_FOLDER });
    await parentRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator('[data-testid^="admin-docs-folder-row-"]').filter({ hasText: RENAMED_FOLDER })).toHaveCount(0, { timeout: 10_000 });

    await page.screenshot({ path: path.join(screenshotDir, "05-cleaned-up.png"), fullPage: true });
  });
});
