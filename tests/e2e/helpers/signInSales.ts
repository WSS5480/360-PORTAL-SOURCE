import type { Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { generateSync } from "otplib";

const debugDir = path.resolve(process.cwd(), "audit-reports", "signin-debug");

async function snapshot(page: Page, step: string): Promise<string> {
  fs.mkdirSync(debugDir, { recursive: true });
  const file = path.join(debugDir, `${step}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  const text = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  return `url=${page.url()} | text="${text.replace(/\s+/g, " ").slice(0, 300)}"`;
}

/**
 * Signs in as the E2E sales rep. Every step is time-bounded and reports where it
 * stopped, so a changed login screen surfaces as a clear error instead of a hang.
 */
export async function signInSales(page: Page, log: (message: string) => void): Promise<void> {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const totpSecret = process.env.E2E_TOTP_SECRET;

  if (!email || !password) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in .env.local");
  }

  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(120_000);

  const mfaCodeField = page.getByPlaceholder("000000");
  let outcome: "signed-in" | "mfa" | "rejected" | "unknown" = "unknown";

  /*
   * The login form is a controlled React component, and in dev the page can also be
   * replaced by a Fast Refresh reload mid-submit. Both leave the form empty with no
   * error shown, so the whole fill-and-submit cycle is retried rather than filling once.
   */
  for (let attempt = 1; attempt <= 3 && outcome === "unknown"; attempt += 1) {
    log(`opening /login (attempt ${attempt})`);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);

    const emailField = page.getByPlaceholder("you@company.com");
    const passwordField = page.getByPlaceholder("Your password");
    await emailField.waitFor({ state: "visible", timeout: 30_000 });
    await passwordField.waitFor({ state: "visible", timeout: 15_000 });

    let filled = false;
    for (let fill = 1; fill <= 10 && !filled; fill += 1) {
      await emailField.fill(email);
      await passwordField.fill(password);
      await page.waitForTimeout(400);
      filled = (await emailField.inputValue()) === email && (await passwordField.inputValue()) === password;
      if (!filled) await page.waitForTimeout(600);
    }
    if (!filled) {
      throw new Error(`Login fields would not retain their values. ${await snapshot(page, "fields-not-hydrated")}`);
    }

    // Give React a moment to attach the submit handler after hydration.
    await page.waitForTimeout(500);
    log("submitting credentials");
    await page.getByRole("button", { name: /^sign in$/i }).click({ timeout: 15_000 });

    outcome = await Promise.race([
      page.waitForURL(/\/(portal|admin)(\/|$)/, { timeout: 45_000 }).then(() => "signed-in" as const),
      mfaCodeField.waitFor({ state: "visible", timeout: 45_000 }).then(() => "mfa" as const),
      page
        .getByText(/invalid login credentials|incorrect|too many/i)
        .first()
        .waitFor({ state: "visible", timeout: 45_000 })
        .then(() => "rejected" as const),
    ]).catch(() => "unknown" as const);

    if (outcome === "unknown") log("no response to the sign-in submit; retrying");
  }

  if (outcome === "rejected") {
    throw new Error(`Sign-in was rejected. ${await snapshot(page, "credentials-rejected")}`);
  }
  if (outcome === "unknown") {
    throw new Error(`Sign-in stalled after submitting credentials. ${await snapshot(page, "after-credentials")}`);
  }

  if (outcome === "mfa") {
    log("two-factor challenge shown");
    if (!totpSecret) {
      throw new Error("A two-factor code is required but E2E_TOTP_SECRET is not set. Run: npx tsx scripts/setup-e2e-mfa.ts");
    }

    // The submit button stays disabled until six digits are present, so a bad code
    // would otherwise hang forever waiting for it to become enabled.
    let verified = false;
    for (let attempt = 1; attempt <= 3 && !verified; attempt += 1) {
      const code = generateSync({ secret: totpSecret });
      if (!/^\d{6}$/.test(code)) {
        throw new Error(`Generated two-factor code was not six digits: "${code}"`);
      }
      log(`entering two-factor code (attempt ${attempt})`);
      await mfaCodeField.fill("");
      await mfaCodeField.fill(code);

      const verifyButton = page.getByRole("button", { name: /^verify$/i });
      await verifyButton.waitFor({ state: "visible", timeout: 10_000 });
      const enabled = await verifyButton.isEnabled();
      if (!enabled) {
        throw new Error(`Verify button stayed disabled after entering a code. ${await snapshot(page, "mfa-disabled")}`);
      }
      await verifyButton.click({ timeout: 10_000 });

      const result = await Promise.race([
        page.waitForURL(/\/(portal|admin)(\/|$)/, { timeout: 30_000 }).then(() => "ok" as const),
        page
          .getByText(/invalid|expired|incorrect/i)
          .first()
          .waitFor({ state: "visible", timeout: 30_000 })
          .then(() => "retry" as const),
      ]).catch(() => "timeout" as const);

      if (result === "ok") {
        verified = true;
      } else if (result === "retry") {
        // Codes rotate every 30s; wait for the next window before retrying.
        log("two-factor code rejected, waiting for the next code window");
        await page.waitForTimeout(31_000);
      } else {
        throw new Error(`Two-factor verification stalled. ${await snapshot(page, "mfa-stalled")}`);
      }
    }
    if (!verified) {
      throw new Error(`Could not complete two-factor verification. ${await snapshot(page, "mfa-failed")}`);
    }
  }

  log(`signed in, landed on ${new URL(page.url()).pathname}`);

  // Confirm the account actually has Sales Command access before auditing.
  await page.goto("/portal/sales", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  const pathname = new URL(page.url()).pathname;
  if (!pathname.startsWith("/portal/sales")) {
    throw new Error(
      `The E2E account cannot reach Sales Command (redirected to ${pathname}). Run: npx tsx scripts/ensure-e2e-sales-rep.ts`,
    );
  }
  log("Sales Command access confirmed");
}
