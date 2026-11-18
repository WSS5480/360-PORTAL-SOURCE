import { expect, test } from "@playwright/test";
import { auditViewport } from "./helpers/mobileAudit";

/**
 * Guards the audit engine itself. Without this, a broken detector would report a
 * clean page and the mobile audit would give false confidence.
 */

const fixture = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin: 0; font-family: sans-serif; }
  .too-wide { width: 900px; height: 40px; background: #eee; }
  .tiny-tap { display: inline-flex; width: 20px; height: 20px; }
  .tiny-text { font-size: 8px; }
  .small-input { font-size: 12px; }
  .cover { position: fixed; inset: 0; background: rgba(0,0,0,0.2); }
</style></head>
<body>
  <h1>Fixture</h1>
  <div class="too-wide">wide block</div>
  <button class="tiny-tap">x</button>
  <p class="tiny-text">unreadably small caption</p>
  <input class="small-input" value="a" />
  <p>Total is undefined for this record</p>
  <p>Owner: null</p>
  <p>Value NaN</p>
  <p>TODO: wire this up</p>
  <p>Failed to fetch</p>
  <p>Record 3f2a9c1e-7b4d-4a11-9c02-8de5f1a2b3c4 was saved</p>
  <p>account_manager_id could not be resolved</p>
  <p>process.env.NEXT_PUBLIC_SUPABASE_URL is missing</p>
  <p>Hello \${userName}</p>
  <p>TypeError: cannot read property</p>
  <img src="data:image/gif;base64,notanimage" alt="broken" />
  <button class="under">covered control</button>
  <div class="cover"></div>
</body></html>`;

test("audit engine detects the defects it claims to detect", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(fixture);
  await page.waitForTimeout(300);

  const findings = await auditViewport(page);
  const checks = new Set(findings.map((f) => f.check));

  expect(checks, "horizontal overflow").toContain("page-horizontal-overflow");
  expect(checks, "offending overflow element").toContain("element-overflows-viewport");
  expect(checks, "small tap target").toContain("tap-target-too-small");
  expect(checks, "small text").toContain("text-too-small");
  expect(checks, "input font size").toContain("input-triggers-ios-zoom");
  expect(checks, "covered control").toContain("control-covered");
  expect(checks, "developer copy").toContain("developer-facing-copy");

  // The message quotes the matched fragment; the text field carries the surrounding copy.
  const copy = findings
    .filter((f) => f.check === "developer-facing-copy")
    .map((f) => `${f.message} ${f.text ?? ""}`);
  const expectedPhrases = [
    "undefined",
    "null",
    "NaN",
    "TODO",
    "Failed to fetch",
    "3f2a9c1e-7b4d-4a11-9c02-8de5f1a2b3c4",
    "account_manager_id",
    "NEXT_PUBLIC_SUPABASE_URL",
    "${userName}",
    "TypeError",
  ];
  for (const phrase of expectedPhrases) {
    expect(
      copy.some((message) => message.includes(phrase)),
      `developer-copy scanner should flag "${phrase}"`,
    ).toBe(true);
  }
});

test("audit engine stays quiet on a clean page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{margin:0;font-family:sans-serif;font-size:16px}
a,button{display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px}
input{font-size:16px;min-height:48px;box-sizing:border-box}</style></head>
<body>
  <h1>Provider overview</h1>
  <p>Three upcoming cases are scheduled this week.</p>
  <a href="/next">Open</a>
  <button type="button">Add case</button>
  <input aria-label="Search providers" />
</body></html>`);
  await page.waitForTimeout(300);

  const findings = await auditViewport(page);
  const blocking = findings.filter((f) => f.severity === "critical" || f.severity === "high");
  expect(blocking.map((f) => `${f.check}: ${f.message}`)).toEqual([]);
});
