import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Opens the dev-only packing slip PDF (same renderer as admin) and saves a screenshot.
 * Headless Chrome often cannot paint `<embed type="application/pdf">`; navigating to the PDF URL uses the built-in PDF viewer.
 *
 * Requires `npm run dev` on port 3000 (no second `next dev` — see playwright.config).
 */
test("packing slip preview — header layout screenshot", async ({ page, request }) => {
  test.setTimeout(90_000);

  const pdfRes = await request.get("/api/dev/packing-slip-preview");
  expect(pdfRes.ok(), `PDF API should return 200 (got ${pdfRes.status()})`).toBeTruthy();
  expect(pdfRes.headers()["content-type"] || "").toContain("application/pdf");

  const pdfBuf = await pdfRes.body();
  expect(pdfBuf.slice(0, 4).toString()).toBe("%PDF");

  // Headless Chrome often downloads PDF URLs; open bytes as a blob URL so the PDF viewer renders.
  const b64 = Buffer.from(pdfBuf).toString("base64");
  await page.goto("about:blank");
  await page.evaluate((encoded) => {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.location.assign(url);
  }, b64);
  await page.waitForTimeout(3000);

  await page.setViewportSize({ width: 900, height: 1000 });

  const screenshotDir = path.resolve(process.cwd(), "playwright-screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  const outPath = path.join(screenshotDir, "packing-slip-preview.png");

  await page.screenshot({ path: outPath, fullPage: true });

  // eslint-disable-next-line no-console -- helps CI/logs point to the artifact
  console.log(`Packing slip preview screenshot: ${outPath}`);
});
