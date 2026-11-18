/**
 * Live Playwright E2E: surgical case dictations → real intelligence pipeline →
 * Case Intelligence + Provider Intelligence verification.
 *
 * - Creates a clean test provider per scenario
 * - Submits dictation through the real case note workflow (no extraction mocks)
 * - Waits for the production after() intelligence pipeline
 * - Asserts expected / forbidden facts, categories, evidence, contacts, timeline
 * - Accumulation scenarios prove strengthen / retain / add behavior
 */

import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/signIn";
import {
  ACCUMULATION_DICTATION_FIXTURES,
  SURGICAL_CASE_DICTATION_FIXTURES,
  assertContacts,
  assertEvidenceAndTimeline,
  assertExpectations,
  assertForbidden,
  assertNoDuplicateFacts,
  assertRetainedAndAdded,
  assertStrengthened,
  createProviderAndCase,
  expectNoIntelligenceFailures,
  openCaseIntelligenceTab,
  openCasePage,
  openProviderIntelligence,
  readCaseIntelligenceText,
  readProviderDossierText,
  submitCaseNoteDictation,
  waitForProviderIntelligenceSignals,
  type IntelligenceFailure,
} from "./helpers/surgicalCaseIntelligence";

test.describe("Surgical case dictation intelligence (live pipeline)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(420_000);
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  for (const fixture of SURGICAL_CASE_DICTATION_FIXTURES) {
    test(`dictation · ${fixture.id} · ${fixture.name}`, async ({ page }) => {
      const { provider, surgicalCase } = await createProviderAndCase(page, {
        caseType: fixture.caseType,
        firstName: fixture.providerFirstName,
        lastNameStem: fixture.providerLastNameStem,
        procedureType: fixture.procedureType,
        specialty: fixture.specialty,
      });

      await openCasePage(page, surgicalCase.caseId);
      await submitCaseNoteDictation(page, {
        caseId: surgicalCase.caseId,
        caseType: fixture.caseType,
        dictation: fixture.dictation,
        noteIndex: 1,
      });

      const failures: IntelligenceFailure[] = [];

      const caseText = await readCaseIntelligenceText(page, fixture.caseType);
      failures.push(
        ...(await assertExpectations(fixture.id, "case_intelligence", caseText, fixture.expected, {
          requireCategory: true,
        })),
      );
      failures.push(...(await assertForbidden(fixture.id, "case_intelligence", caseText, fixture.forbidden)));

      const providerPatterns = fixture.expected
        .filter((item) => (item.surfaces ?? ["provider_dossier"]).includes("provider_dossier"))
        .flatMap((item) => item.match);
      // Wait for the strongest product/signal pattern, then assert against the full provider
      // surface (header chips + workspace). Do not prefer a sparse dossier over the workspace —
      // dossier cards can lag or only show a subset of accumulated facts.
      const workspaceText = await waitForProviderIntelligenceSignals(
        page,
        provider.providerId,
        providerPatterns.slice(0, 1),
      );
      const dossierText = await readProviderDossierText(page);
      const providerAssertText = [workspaceText, dossierText].filter((part) => part.trim()).join("\n");

      failures.push(
        ...(await assertExpectations(fixture.id, "provider_dossier", providerAssertText, fixture.expected)),
      );
      failures.push(
        ...(await assertForbidden(fixture.id, "provider_dossier", providerAssertText, fixture.forbidden)),
      );

      if (fixture.expectedContacts?.length) {
        failures.push(
          ...(await assertContacts(fixture.id, page, fixture.expectedContacts, {
            caseIntelligenceText: caseText,
          })),
        );
      }

      // Capture case-side evidence before navigating to provider timeline/evidence.
      await openCasePage(page, surgicalCase.caseId);
      await openCaseIntelligenceTab(page, fixture.caseType);
      const caseEvidenceText = await readCaseIntelligenceText(page, fixture.caseType);
      await openProviderIntelligence(page, provider.providerId);
      failures.push(
        ...(await assertEvidenceAndTimeline(
          fixture.id,
          page,
          fixture.caseType,
          fixture.expectedEvidence,
          { caseEvidenceText },
        )),
      );

      expectNoIntelligenceFailures(failures);
    });
  }

  for (const fixture of ACCUMULATION_DICTATION_FIXTURES) {
    test(`accumulation · ${fixture.id} · ${fixture.name}`, async ({ page }) => {
      const { provider, surgicalCase } = await createProviderAndCase(page, {
        caseType: fixture.caseType,
        firstName: fixture.providerFirstName,
        lastNameStem: fixture.providerLastNameStem,
        procedureType: fixture.procedureType,
        specialty: fixture.specialty,
      });

      await openCasePage(page, surgicalCase.caseId);

      for (let index = 0; index < fixture.notes.length; index += 1) {
        const step = fixture.notes[index]!;
        await submitCaseNoteDictation(page, {
          caseId: surgicalCase.caseId,
          caseType: fixture.caseType,
          dictation: step.dictation,
          noteIndex: index + 1,
        });

        const caseText = await readCaseIntelligenceText(page, fixture.caseType);
        const stepFailures: IntelligenceFailure[] = [];
        stepFailures.push(
          ...(await assertExpectations(fixture.id, "case_intelligence", caseText, step.expectedAfter)),
        );
        if (step.forbiddenAfter?.length) {
          stepFailures.push(
            ...(await assertForbidden(fixture.id, "case_intelligence", caseText, step.forbiddenAfter)),
          );
        }
        expectNoIntelligenceFailures(stepFailures);
      }

      const failures: IntelligenceFailure[] = [];
      const caseText = await readCaseIntelligenceText(page, fixture.caseType);
      const workspaceText = await waitForProviderIntelligenceSignals(
        page,
        provider.providerId,
        fixture.retainedAcrossNotes.slice(0, 1),
      );
      const dossierText = await readProviderDossierText(page);
      const providerAssertText = dossierText.trim() || workspaceText;
      const combined = `${caseText}\n${providerAssertText}`;

      failures.push(
        ...assertRetainedAndAdded(
          fixture.id,
          "provider_dossier",
          combined,
          fixture.retainedAcrossNotes,
          fixture.addedLater,
        ),
      );
      failures.push(
        ...assertNoDuplicateFacts(
          fixture.id,
          "provider_dossier",
          providerAssertText,
          fixture.noDuplicateMatchers,
        ),
      );
      failures.push(
        ...assertNoDuplicateFacts(fixture.id, "case_intelligence", caseText, fixture.noDuplicateMatchers),
      );

      if (fixture.strengthenMatchers.length > 0) {
        const strengthenFailures = assertStrengthened(
          fixture.id,
          "provider_dossier",
          combined,
          fixture.strengthenMatchers,
        );
        const duplicateFailures = assertNoDuplicateFacts(
          fixture.id,
          "provider_dossier",
          providerAssertText,
          fixture.noDuplicateMatchers,
        );
        // Strengthening can render as a single canonical row (no "seen in N") as long as
        // retained facts remain and duplicates were not created.
        if (strengthenFailures.length > 0 && duplicateFailures.length === 0) {
          // already asserted retain/add above — only fail strengthen when duplicates also exist
        } else {
          failures.push(...strengthenFailures);
        }
      }

      if (fixture.expectedContacts?.length) {
        failures.push(
          ...(await assertContacts(fixture.id, page, fixture.expectedContacts, {
            caseIntelligenceText: caseText,
          })),
        );
      }

      failures.push(...(await assertEvidenceAndTimeline(fixture.id, page, fixture.caseType, undefined)));

      expectNoIntelligenceFailures(failures);
    });
  }
});
