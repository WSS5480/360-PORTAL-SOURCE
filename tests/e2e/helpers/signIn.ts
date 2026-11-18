import { expect, test } from "@playwright/test";
import { generateSync } from "otplib";

export async function signIn(page: import("@playwright/test").Page): Promise<void> {
  const magicLink = process.env.E2E_MAGICLINK;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const totpSecret = process.env.E2E_TOTP_SECRET;

  if (magicLink) {
    await page.goto(magicLink);
    await page.waitForLoadState("networkidle");
    return;
  }

  if (!email || !password) {
    test.skip(true, "Missing E2E_MAGICLINK or E2E_USER_EMAIL/E2E_USER_PASSWORD");
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await page.getByPlaceholder("you@company.com").fill(email!);
  await page.getByPlaceholder("Your password").fill(password!);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  const mfaChallenge = page.getByRole("heading", { name: /two-factor authentication/i });
  const mfaEnroll = page.getByRole("heading", { name: /set up two-factor authentication/i });

  const mfaVisible = await Promise.race([
    mfaChallenge.waitFor({ state: "visible", timeout: 15_000 }).then(() => "challenge" as const),
    mfaEnroll.waitFor({ state: "visible", timeout: 15_000 }).then(() => "enroll" as const),
    page.waitForURL(/\/(portal|admin)(\/|$)/, { timeout: 15_000 }).then(() => "done" as const),
  ]).catch(() => "timeout" as const);

  if (mfaVisible === "done") return;

  if (mfaVisible === "enroll") {
    throw new Error(
      "E2E account has no MFA factor. Run: npx tsx scripts/setup-e2e-mfa.ts",
    );
  }

  if (mfaVisible === "challenge") {
    if (!totpSecret) {
      throw new Error(
        "MFA challenge shown but E2E_TOTP_SECRET is missing. Run: npx tsx scripts/setup-e2e-mfa.ts",
      );
    }
    const code = generateSync({ secret: totpSecret });
    await page.getByPlaceholder("000000").fill(code);
    await page.getByRole("button", { name: /^verify$/i }).click();
  }

  await page.waitForURL(/\/(portal|admin)(\/|$)/, { timeout: 20_000 });
}
