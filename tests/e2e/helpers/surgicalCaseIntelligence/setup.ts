import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { CaseType } from "./types";

export type CreatedProvider = {
  providerId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  accountId: string;
};

export type CreatedCase = {
  caseId: string;
  caseType: CaseType;
  providerId: string;
  accountId: string;
};

function runSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function readJson<T>(res: { ok: () => boolean; status: () => number; json: () => Promise<unknown> }): Promise<T> {
  const body = (await res.json()) as T & { ok?: boolean; error?: unknown };
  if (!res.ok() || body.ok === false) {
    throw new Error(`API ${res.status()}: ${JSON.stringify(body.error ?? body)}`);
  }
  return body;
}

/** Resolve a facility/account the signed-in rep can use for case creation. */
export async function resolveTestAccountId(request: APIRequestContext): Promise<string> {
  const fromEnv = (process.env.E2E_ACCOUNT_ID || "").trim();
  if (fromEnv) return fromEnv;

  const res = await request.get("/api/portal/sales/surgical-accounts");
  const json = await readJson<{ organizations?: Array<{ id?: string }> }>(res);
  const id = String(json.organizations?.[0]?.id ?? "").trim();
  if (!id) {
    throw new Error(
      "No surgical accounts available for E2E. Set E2E_ACCOUNT_ID or ensure the E2E user can view an organization.",
    );
  }
  return id;
}

/** Create a clean provider linked to the test account (production create API). */
export async function createCleanTestProvider(
  request: APIRequestContext,
  input: {
    firstName: string;
    lastNameStem: string;
    specialty?: string;
    accountId?: string;
  },
): Promise<CreatedProvider> {
  const accountId = input.accountId ?? (await resolveTestAccountId(request));
  const lastName = `${input.lastNameStem}-E2E-${runSuffix()}`;
  const res = await request.post("/api/portal/sales/providers", {
    data: {
      save_mode: "complete",
      first_name: input.firstName,
      last_name: lastName,
      role_type: "surgeon",
      specialty: input.specialty ?? "General Surgery",
      primary_organization_id: accountId,
      onboarding_relationship: "early_discovery",
    },
  });
  const json = await readJson<{ provider_id?: string; provider?: { id?: string } }>(res);
  const providerId = String(json.provider_id ?? json.provider?.id ?? "").trim();
  if (!providerId) throw new Error("Provider create succeeded but returned no id");
  return {
    providerId,
    displayName: `${input.firstName} ${lastName}`,
    firstName: input.firstName,
    lastName,
    accountId,
  };
}

/** Create an observation or product-support case via the production case API. */
export async function createSurgicalCase(
  request: APIRequestContext,
  input: {
    caseType: CaseType;
    accountId: string;
    providerId: string;
    procedureType: string;
  },
): Promise<CreatedCase> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await request.post("/api/portal/sales/surgical-cases", {
    data: {
      case_type: input.caseType,
      account_id: input.accountId,
      surgeon_contact_id: input.providerId,
      case_date: today,
      procedure_type: input.procedureType,
      status: "draft",
      notes: null,
      follow_up_needed: false,
    },
  });
  const json = await readJson<{ case?: { id?: string }; case_id?: string }>(res);
  const caseId = String(json.case?.id ?? json.case_id ?? "").trim();
  if (!caseId) throw new Error("Case create succeeded but returned no id");
  return {
    caseId,
    caseType: input.caseType,
    providerId: input.providerId,
    accountId: input.accountId,
  };
}

export async function createProviderAndCase(
  page: Page,
  input: {
    caseType: CaseType;
    firstName: string;
    lastNameStem: string;
    procedureType: string;
    specialty?: string;
  },
): Promise<{ provider: CreatedProvider; surgicalCase: CreatedCase }> {
  const request = page.request;
  const provider = await createCleanTestProvider(request, {
    firstName: input.firstName,
    lastNameStem: input.lastNameStem,
    specialty: input.specialty,
  });
  const surgicalCase = await createSurgicalCase(request, {
    caseType: input.caseType,
    accountId: provider.accountId,
    providerId: provider.providerId,
    procedureType: input.procedureType,
  });
  return { provider, surgicalCase };
}

export async function openCasePage(page: Page, caseId: string): Promise<void> {
  await page.goto(`/portal/sales/cases/${encodeURIComponent(caseId)}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("tab").first()).toBeVisible({ timeout: 30_000 });
}

export async function openProviderIntelligence(page: Page, providerId: string): Promise<void> {
  await page.goto(`/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("provider-intelligence-workspace")).toBeVisible({ timeout: 45_000 });
}

/**
 * Reload provider intelligence until expected patterns appear or timeout.
 * UF read-model / dossier aggregation can lag a beat behind case note processing.
 */
export async function waitForProviderIntelligenceSignals(
  page: Page,
  providerId: string,
  patterns: RegExp[],
  options?: { timeoutMs?: number },
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 90_000;
  const deadline = Date.now() + timeoutMs;
  let lastText = "";

  while (Date.now() < deadline) {
    await openProviderIntelligence(page, providerId);

    const parts: string[] = [];
    const summary = page.getByLabel(/Provider summary/i);
    if ((await summary.count()) > 0) {
      parts.push(((await summary.innerText()).replace(/\s+/g, " ") || "").trim());
    }
    const aiDetails = page.getByTestId("provider-ai-summary-details");
    if ((await aiDetails.count()) > 0) {
      const open = await aiDetails.evaluate((el) => (el as HTMLDetailsElement).open);
      if (!open) await aiDetails.locator("summary").first().click().catch(() => undefined);
    }
    const workspace = page.getByTestId("provider-intelligence-workspace");
    parts.push(((await workspace.innerText()).replace(/\s+/g, " ") || "").trim());
    lastText = parts.join("\n");

    if (patterns.length === 0 || patterns.every((pattern) => pattern.test(lastText))) {
      return lastText;
    }
    await page.waitForTimeout(2_500);
  }

  throw new Error(
    `Provider intelligence did not surface expected signals within ${timeoutMs}ms. Missing one of: ${patterns
      .map(String)
      .join(", ")}. Surface excerpt: ${lastText.slice(0, 500)}`,
  );
}
