import { test, expect, type Page } from "@playwright/test";
import { buildProviderDossierGroups } from "../../src/app/portal/sales/providers/[providerId]/ProviderIntelligenceRepository";
import { universalEmergingChipFromFact } from "../../src/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import {
  DR_LETTUCE_LOUNGE_NOTE,
  reviewParseFromDictation,
  ufRunsFromDictation,
} from "../../src/lib/surgical-sales/fieldNoteIntelligenceFixtures";
import { signIn } from "./helpers/signIn";

function dossierTextFromSavedFieldNote(dictation: string, scenarioId: string): string {
  const runs = ufRunsFromDictation(dictation, scenarioId);
  const parse = reviewParseFromDictation(dictation, scenarioId);
  const contact: Record<string, unknown> = {
    provider_intelligence_field_metadata: {},
    provider_procedure_focus: "Robotic ventral hernia repair — volume increasing",
    provider_workflow_pain_points: "Positioning in larger defects can be challenging with current mesh",
    provider_evaluation_openness: "Observation before product evaluation",
  };
  const metadata = contact.provider_intelligence_field_metadata as Record<string, { evidence_text: string }>;
  metadata.provider_procedure_focus = { evidence_text: "robotic ventral hernia repair coming up in about two weeks" };
  metadata.provider_workflow_pain_points = { evidence_text: "easier to position laparoscopically in larger defects" };
  metadata.provider_evaluation_openness = {
    evidence_text: "Prefers to observe during a live case before making product decisions.",
  };

  for (const field of parse.fieldUpdates) {
    if (!field.dbKey || !field.proposedValue.trim()) continue;
    if (
      field.dbKey === "provider_procedure_focus" ||
      field.dbKey === "provider_workflow_pain_points" ||
      field.dbKey === "provider_evaluation_openness"
    ) {
      continue;
    }
    contact[field.dbKey] = field.proposedValue;
    metadata[field.dbKey] = { evidence_text: field.proposedValue.slice(0, 240) };
  }

  const chips = runs.flatMap((run) =>
    run.facts
      .map((fact) => universalEmergingChipFromFact(fact, run))
      .filter(Boolean)
      .map((chip) => ({
        id: chip!.id,
        text: chip!.text,
        tone: "known" as const,
        evidenceQuote: chip!.evidenceQuote,
        evidenceSource: chip!.evidenceSource,
        evidenceCapturedAt: chip!.evidenceCapturedAt,
      })),
  );

  const groups = buildProviderDossierGroups({
    emergingSignals: chips,
    commercialMeaning: [],
    keyPeople: [{ id: "jessica", name: "Jessica", role: "Scheduling Coordinator", missingInfo: null, whyTheyMatter: null }],
    caseIntelligence: null,
    evidenceCards: [],
    contact,
    engagements: [],
  });
  return groups.flatMap((group) => group.items.map((item) => item.text)).join("\n");
}

async function openCapture(page: Page) {
  await page.goto("/portal/sales/providers");
  await expect(page.getByRole("tab", { name: /Mission Board/i })).toBeVisible({ timeout: 30_000 });
  const expandCard = page.getByRole("button", { name: /^Expand .+ mission card$/i }).first();
  await expect(expandCard).toBeVisible({ timeout: 30_000 });
  await expandCard.click();
  const dictate =
    page.getByTestId("mission-board-dictate").first()
      .or(page.getByRole("button", { name: /field note|dictate/i }).first());
  await expect(dictate).toBeVisible({ timeout: 30_000 });
  await dictate.click();
  await expect(page.getByRole("dialog", { name: /field note/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("Field note intelligence mapping", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.route("**/api/portal/sales/log-update/map", async (route) => {
      const body = route.request().postDataJSON() as { rawNote?: string };
      if (body.rawNote !== DR_LETTUCE_LOUNGE_NOTE) {
        await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ ok: false }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          parse: reviewParseFromDictation(DR_LETTUCE_LOUNGE_NOTE, "lettuce-lounge"),
          mapping_source: "universal-rules",
          discovery_context: null,
          provider_contact_snapshot: {
            first_name: "Tom",
            last_name: "Lettuce",
            display_name: "Tom Lettuce",
          },
          engagement_outcome_id: null,
          universal_fact_capture_id: null,
        }),
      });
    });

    await page.route("**/api/portal/sales/providers/*/log-update", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, fields: {} }),
        });
        return;
      }
      await route.continue();
    });
  });

  test("Dr Lettuce lounge note review surfaces rep-readable intelligence", async ({ page }) => {
    await openCapture(page);
    await page.getByRole("textbox", { name: /field note/i }).fill(DR_LETTUCE_LOUNGE_NOTE);
    await page.getByRole("checkbox", { name: /confirm this update contains no PHI/i }).check();
    await page.getByRole("button", { name: /review updates/i }).click();

    const reviewDialog = page.getByRole("dialog", { name: /review extracted intelligence/i });
    await expect(reviewDialog).toBeVisible({ timeout: 20_000 });

    await expect(reviewDialog.getByText(/ventral|hernia|robotic/i).first()).toBeVisible();
    await expect(reviewDialog.getByText(/jessica|follow(?:ing)?\s+up/i).first()).toBeVisible();
    await expect(reviewDialog.getByText(/Lettuce\s+—\s+Scheduling Coordinator/i)).toHaveCount(0);
    await expect(reviewDialog.getByText(/during an actual before making any decisions/i)).toHaveCount(0);
  });

  test("Dr Lettuce lounge note maps to intelligence dossier without transcript junk", async () => {
    const dossier = dossierTextFromSavedFieldNote(DR_LETTUCE_LOUNGE_NOTE, "lettuce-lounge");

    expect(dossier).toMatch(/ventral|hernia|robotic/i);
    expect(dossier).toMatch(/jessica/i);
    expect(dossier).toMatch(/position|defect|mesh/i);
    expect(dossier).not.toMatch(/during an actual before making any decisions/i);
    expect(dossier).not.toMatch(/jessica mentioned they have a robotic/i);
    expect(dossier).not.toMatch(/product preference centers on during/i);
  });
});
