import { expect, type Locator, type Page } from "@playwright/test";
import type {
  ExpectedContact,
  IntelligenceExpectation,
  IntelligenceFailure,
  IntelligenceForbidden,
  IntelligenceSurface,
} from "./types";
import { caseIntelligenceRoot } from "./noteWorkflow";
import type { CaseType } from "./types";

function formatFailures(failures: IntelligenceFailure[]): string {
  if (failures.length === 0) return "";
  return failures
    .map(
      (failure, index) =>
        `${index + 1}. [${failure.kind}] ${failure.fixtureId} @ ${failure.surface}\n   ${failure.detail}`,
    )
    .join("\n");
}

function matchesAll(text: string, patterns: RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(text));
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Find duplicate fact lines that match a product/contact pattern. */
export function findDuplicateFactLines(text: string, pattern: RegExp): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0 && pattern.test(line));

  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const line of lines) {
    const key = normalizeLine(line)
      .replace(/\s*[—–-]\s*seen in .+$/i, "")
      .replace(/\s*evidence\s*\(\d+\)\s*$/i, "");
    if (seen.has(key)) dupes.push(line);
    else seen.set(key, line);
  }
  return dupes;
}

async function textOf(locator: Locator): Promise<string> {
  if ((await locator.count()) === 0) return "";
  return (await locator.innerText()).replace(/\s+/g, " ").trim();
}

export async function readCaseIntelligenceText(page: Page, caseType: CaseType): Promise<string> {
  const root = caseIntelligenceRoot(page, caseType);
  await expect(root).toBeVisible({ timeout: 20_000 });
  return textOf(root);
}

export async function readProviderDossierText(page: Page): Promise<string> {
  const dossier = page.getByTestId("provider-what-we-know-dossier");
  if ((await dossier.count()) === 0) return "";
  return textOf(dossier);
}

/** Full Intelligence tab workspace — includes dossier, cases rollup, people, timeline, AI summary. */
export async function readProviderIntelligenceWorkspaceText(page: Page): Promise<string> {
  const workspace = page.getByTestId("provider-intelligence-workspace");
  await expect(workspace).toBeVisible({ timeout: 30_000 });
  return textOf(workspace);
}

/**
 * Provider-facing intelligence surface used for accumulation assertions:
 * header status chips + Intelligence workspace (with AI summary expanded when present).
 */
export async function readProviderIntelligenceSurfaceText(page: Page): Promise<string> {
  const parts: string[] = [];
  const summary = page.getByLabel(/Provider summary/i);
  if ((await summary.count()) > 0) parts.push(await textOf(summary));

  const workspace = page.getByTestId("provider-intelligence-workspace");
  await expect(workspace).toBeVisible({ timeout: 30_000 });

  const aiDetails = page.getByTestId("provider-ai-summary-details");
  if ((await aiDetails.count()) > 0) {
    const open = await aiDetails.evaluate((el) => (el as HTMLDetailsElement).open);
    if (!open) await aiDetails.locator("summary").first().click().catch(() => undefined);
  }

  const timeline = page.getByTestId("provider-timeline");
  if ((await timeline.count()) > 0) {
    const open = await timeline.evaluate((el) => (el as HTMLDetailsElement).open);
    if (!open) await timeline.locator("summary").first().click().catch(() => undefined);
  }

  parts.push(await textOf(workspace));
  return parts.join("\n");
}

export async function readPeopleAccessText(page: Page): Promise<string> {
  const dossier = page.getByTestId("provider-what-we-know-dossier");
  if ((await dossier.count()) === 0) return "";
  const peopleHeading = dossier.getByRole("heading", { name: /People\s*&\s*Access/i });
  if ((await peopleHeading.count()) === 0) {
    // Fall back to full dossier — People & Access may be a group title without heading role.
    const full = await textOf(dossier);
    const idx = full.search(/People\s*&\s*Access/i);
    return idx >= 0 ? full.slice(idx) : "";
  }
  const card = peopleHeading.locator("xpath=ancestor::article[1]");
  if ((await card.count()) > 0) return textOf(card.first());
  return textOf(dossier);
}

export async function readRelationshipMapText(page: Page): Promise<string> {
  const map = page.getByTestId("provider-key-people");
  if ((await map.count()) === 0) return "";
  return textOf(map);
}

export async function readProviderTimelineText(page: Page): Promise<string> {
  const timeline = page.getByTestId("provider-timeline");
  if ((await timeline.count()) === 0) return "";
  // Expand collapsed timeline for assertions.
  const summary = timeline.locator("summary").first();
  if ((await summary.count()) > 0) {
    const open = await timeline.evaluate((el) => (el as HTMLDetailsElement).open);
    if (!open) await summary.click();
  }
  return textOf(timeline);
}

export async function collectEvidenceQuotes(page: Page, scope: Locator): Promise<string> {
  const disclosures = scope.locator("details").filter({ has: page.locator("summary", { hasText: /Evidence/i }) });
  const count = await disclosures.count();
  const quotes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const details = disclosures.nth(i);
    const open = await details.evaluate((el) => (el as HTMLDetailsElement).open);
    if (!open) {
      await details.locator("summary").click().catch(() => undefined);
    }
    quotes.push(await textOf(details));
  }
  return quotes.join("\n");
}

export async function assertExpectations(
  fixtureId: string,
  surface: IntelligenceSurface,
  text: string,
  expectations: IntelligenceExpectation[],
  options?: { requireCategory?: boolean },
): Promise<IntelligenceFailure[]> {
  const failures: IntelligenceFailure[] = [];
  for (const expectation of expectations) {
    const surfaces = expectation.surfaces ?? [surface];
    if (!surfaces.includes(surface)) continue;

    if (!matchesAll(text, expectation.match)) {
      failures.push({
        kind: "missing_expected",
        fixtureId,
        surface,
        detail: `Missing expected fact "${expectation.label}" (${expectation.id}). Patterns: ${expectation.match
          .map(String)
          .join(", ")}. Surface excerpt: ${text.slice(0, 500)}`,
      });
      continue;
    }

    if (options?.requireCategory && expectation.category) {
      // Soft category check: category heading should appear somewhere near the fact text.
      if (!expectation.category.test(text)) {
        failures.push({
          kind: "miscategorized",
          fixtureId,
          surface,
          detail: `Expected category ${expectation.category} for "${expectation.label}" was not present on ${surface}.`,
        });
      }
    }
  }
  return failures;
}

export async function assertForbidden(
  fixtureId: string,
  surface: IntelligenceSurface,
  text: string,
  forbidden: IntelligenceForbidden[],
): Promise<IntelligenceFailure[]> {
  const failures: IntelligenceFailure[] = [];
  for (const item of forbidden) {
    const surfaces = item.surfaces ?? [surface];
    if (!surfaces.includes(surface)) continue;
    if (matchesAny(text, item.match)) {
      failures.push({
        kind: "forbidden_present",
        fixtureId,
        surface,
        detail: `Forbidden / invented / negated fact present: "${item.label}" (${item.id}). Patterns: ${item.match
          .map(String)
          .join(", ")}. Surface excerpt: ${text.slice(0, 500)}`,
      });
    }
  }
  return failures;
}

export function assertNoDuplicateFacts(
  fixtureId: string,
  surface: IntelligenceSurface,
  text: string,
  patterns: RegExp[],
): IntelligenceFailure[] {
  const failures: IntelligenceFailure[] = [];
  for (const pattern of patterns) {
    const dupes = findDuplicateFactLines(text, pattern);
    if (dupes.length > 0) {
      failures.push({
        kind: "duplicate_fact",
        fixtureId,
        surface,
        detail: `Repeated fact created duplicates for ${pattern}: ${dupes.join(" | ")}`,
      });
    }
  }
  return failures;
}

export function assertRetainedAndAdded(
  fixtureId: string,
  surface: IntelligenceSurface,
  text: string,
  retained: RegExp[],
  added: RegExp[],
): IntelligenceFailure[] {
  const failures: IntelligenceFailure[] = [];
  for (const pattern of retained) {
    if (!pattern.test(text)) {
      failures.push({
        kind: "non_accumulating",
        fixtureId,
        surface,
        detail: `Previously captured intelligence was removed. Missing retained pattern ${pattern}.`,
      });
    }
  }
  for (const pattern of added) {
    if (!pattern.test(text)) {
      failures.push({
        kind: "non_accumulating",
        fixtureId,
        surface,
        detail: `New fact was not added without wiping prior intelligence. Missing added pattern ${pattern}.`,
      });
    }
  }
  return failures;
}

export function assertStrengthened(
  fixtureId: string,
  surface: IntelligenceSurface,
  text: string,
  strengthenMatchers: RegExp[],
): IntelligenceFailure[] {
  if (strengthenMatchers.some((pattern) => pattern.test(text))) return [];
  return [
    {
      kind: "non_accumulating",
      fixtureId,
      surface,
      detail: `Repeated fact did not strengthen existing intelligence. Expected one of: ${strengthenMatchers
        .map(String)
        .join(", ")}. Surface excerpt: ${text.slice(0, 500)}`,
    },
  ];
}

export async function assertContacts(
  fixtureId: string,
  page: Page,
  contacts: ExpectedContact[],
  options?: { caseIntelligenceText?: string },
): Promise<IntelligenceFailure[]> {
  const failures: IntelligenceFailure[] = [];
  const peopleAccess = await readPeopleAccessText(page);
  const relationshipMap = await readRelationshipMapText(page);
  const dossier = await readProviderDossierText(page);
  const workspace = await readProviderIntelligenceWorkspaceText(page);
  const caseText = options?.caseIntelligenceText ?? "";

  for (const contact of contacts) {
    const foundInCase = contact.name.test(caseText);
    const foundInPeopleAccess = contact.name.test(peopleAccess) || contact.name.test(dossier);
    const foundInRelationshipMap = contact.name.test(relationshipMap);
    const foundInWorkspace = contact.name.test(workspace);

    if (!foundInCase) {
      failures.push({
        kind: "missing_contact",
        fixtureId,
        surface: "case_intelligence",
        detail: `Contact ${contact.name} was not captured on Case Intelligence from the note.`,
      });
    }

    if (contact.requireProviderSurfaces) {
      if (!foundInPeopleAccess && !foundInRelationshipMap && !foundInWorkspace) {
        failures.push({
          kind: "missing_contact",
          fixtureId,
          surface: "people_access",
          detail: `Contact ${contact.name} missing from People & Access and Relationship Map after repeated capture.`,
        });
      } else if (!foundInPeopleAccess && !foundInRelationshipMap) {
        failures.push({
          kind: "missing_contact",
          fixtureId,
          surface: "relationship_map",
          detail: `Contact ${contact.name} captured in case notes but not visible in People & Access or Relationship Map.`,
        });
      }
    }
  }
  return failures;
}

export async function assertEvidenceAndTimeline(
  fixtureId: string,
  page: Page,
  caseType: CaseType,
  expectedEvidence: RegExp[] | undefined,
  options?: { caseEvidenceText?: string },
): Promise<IntelligenceFailure[]> {
  const failures: IntelligenceFailure[] = [];
  const caseRoot = caseIntelligenceRoot(page, caseType);
  const caseEvidenceOnPage =
    (await caseRoot.count()) > 0 ? await collectEvidenceQuotes(page, caseRoot) : "";
  const caseEvidence = options?.caseEvidenceText ?? caseEvidenceOnPage;
  const dossier = page.getByTestId("provider-what-we-know-dossier");
  const relationshipMap = page.getByTestId("provider-key-people");
  const providerEvidence =
    (await dossier.count()) > 0 ? await collectEvidenceQuotes(page, dossier) : "";
  const peopleEvidence =
    (await relationshipMap.count()) > 0 ? await collectEvidenceQuotes(page, relationshipMap) : "";
  const combinedEvidence = `${caseEvidence}\n${providerEvidence}\n${peopleEvidence}`;

  const evidenceControls = page.locator("summary", { hasText: /Evidence/i });
  const evidenceControlCount = await evidenceControls.count();

  if (expectedEvidence && expectedEvidence.length > 0) {
    if (!matchesAny(combinedEvidence, expectedEvidence) && evidenceControlCount === 0) {
      failures.push({
        kind: "missing_evidence",
        fixtureId,
        surface: "evidence",
        detail: `Evidence disclosures missing expected quote patterns: ${expectedEvidence
          .map(String)
          .join(", ")}. Evidence text: ${combinedEvidence.slice(0, 500)}`,
      });
    } else if (!matchesAny(combinedEvidence, expectedEvidence)) {
      // Controls exist but quotes did not match — still a readable failure.
      failures.push({
        kind: "missing_evidence",
        fixtureId,
        surface: "evidence",
        detail: `Evidence present but quotes did not match expected patterns: ${expectedEvidence
          .map(String)
          .join(", ")}. Evidence text: ${combinedEvidence.slice(0, 500)}`,
      });
    }
  } else if (evidenceControlCount === 0 && !/Evidence/i.test(combinedEvidence)) {
    failures.push({
      kind: "missing_evidence",
      fixtureId,
      surface: "evidence",
      detail: "No Evidence disclosures found on Case or Provider Intelligence after note capture.",
    });
  }

  const timelineEl = page.getByTestId("provider-timeline");
  if ((await timelineEl.count()) === 0) {
    failures.push({
      kind: "missing_timeline",
      fixtureId,
      surface: "provider_timeline",
      detail: "Provider timeline section did not appear after intelligence capture.",
    });
  } else {
    const timeline = await readProviderTimelineText(page);
    if (!timeline.trim()) {
      failures.push({
        kind: "missing_timeline",
        fixtureId,
        surface: "provider_timeline",
        detail: "Provider timeline rendered but had no activity rows after note capture.",
      });
    }
  }

  return failures;
}

export function expectNoIntelligenceFailures(failures: IntelligenceFailure[]): void {
  expect(failures, formatFailures(failures)).toEqual([]);
}
