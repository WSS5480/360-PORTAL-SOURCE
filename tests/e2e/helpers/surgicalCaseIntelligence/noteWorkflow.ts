import { expect, type Page } from "@playwright/test";
import type { CaseType } from "./types";

type CaseDetailJson = {
  ok?: boolean;
  activities?: Array<{
    id?: string;
    activity_type?: string;
    body?: string;
    metadata_json?: {
      note_id?: string | null;
      intelligence_processing?: boolean;
      ai_extraction?: unknown;
      intelligence_error?: string | null;
    } | null;
  }>;
  error?: string;
};

function isNoteActivity(activity: NonNullable<CaseDetailJson["activities"]>[number]): boolean {
  const type = String(activity.activity_type ?? "").toLowerCase();
  const noteId = String(activity.metadata_json?.note_id ?? "").trim();
  if (noteId) return true;
  if (type === "note" || type.endsWith("_note") || type.includes("field_note")) return true;
  // Legacy case activities created from operational notes often use activity_type "note".
  return type === "case_note" || type === "observation_note";
}

function isActivityPending(activity: NonNullable<CaseDetailJson["activities"]>[number]): boolean {
  const meta = activity.metadata_json;
  if (!meta || typeof meta !== "object") return false;
  return meta.intelligence_processing === true && !meta.ai_extraction;
}

/** Poll the real case detail API until background intelligence finishes. */
export async function waitForCaseIntelligencePipeline(
  page: Page,
  caseId: string,
  options?: { timeoutMs?: number; minNotes?: number },
): Promise<CaseDetailJson> {
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const minNotes = options?.minNotes ?? 1;
  const deadline = Date.now() + timeoutMs;
  let last: CaseDetailJson | null = null;

  while (Date.now() < deadline) {
    const res = await page.request.get(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {
      headers: { "Cache-Control": "no-store" },
    });
    last = (await res.json()) as CaseDetailJson;
    if (!res.ok() || !last.ok) {
      throw new Error(`Case detail poll failed: ${last?.error ?? res.status()}`);
    }

    const activities = last.activities ?? [];
    const noteActivities = activities.filter(isNoteActivity);

    const pending = noteActivities.filter(isActivityPending);
    const errors = noteActivities
      .map((activity) => activity.metadata_json?.intelligence_error)
      .filter((value): value is string => Boolean(value && String(value).trim()));

    if (errors.length > 0) {
      throw new Error(`Intelligence pipeline reported error(s): ${errors.join(" | ")}`);
    }

    if (noteActivities.length >= minNotes && pending.length === 0) {
      return last;
    }

    await page.waitForTimeout(2_000);
  }

  const pendingIds = (last?.activities ?? [])
    .filter(isActivityPending)
    .map((activity) => activity.id ?? activity.metadata_json?.note_id ?? "?")
    .join(", ");
  throw new Error(
    `Intelligence pipeline did not finish within ${timeoutMs}ms for case ${caseId}. Still processing: ${pendingIds || "unknown"}`,
  );
}

async function openFieldNotesTab(page: Page, caseType: CaseType): Promise<void> {
  const tabName = caseType === "observation" ? /^Field Notes$/i : /^Field Notes$/i;
  const tab = page.getByRole("tab", { name: tabName });
  await expect(tab).toBeVisible({ timeout: 20_000 });
  await tab.click();
}

async function openIntelligenceTab(page: Page, caseType: CaseType): Promise<void> {
  const tab = page.getByRole("tab", { name: /^Intelligence$/i });
  await expect(tab).toBeVisible({ timeout: 20_000 });
  await tab.click();
  const root =
    caseType === "observation"
      ? page.getByTestId("case-intelligence-tab")
      : page.getByTestId("case-ps-intelligence-tab");
  await expect(root).toBeVisible({ timeout: 20_000 });
}

/**
 * Submit a dictation through the real case note workflow (Quick note + Save note).
 * Does not mock extraction — the production notes route and after() pipeline run.
 */
export async function submitCaseNoteDictation(
  page: Page,
  input: {
    caseId: string;
    caseType: CaseType;
    dictation: string;
    noteIndex?: number;
  },
): Promise<void> {
  await openFieldNotesTab(page, input.caseType);

  const textarea =
    input.caseType === "observation"
      ? page.getByRole("textbox", { name: /quick note/i })
      : page.getByRole("textbox", { name: /quick note/i });
  await expect(textarea).toBeVisible({ timeout: 20_000 });
  await textarea.fill(input.dictation);

  const saveButton = page.getByRole("button", { name: /^Save note$/i });
  await expect(saveButton).toBeEnabled({ timeout: 10_000 });

  const notesResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/portal/sales/surgical-cases/${input.caseId}/notes`) &&
      response.request().method() === "POST",
    { timeout: 60_000 },
  );

  await saveButton.click();

  const notesResponse = await notesResponsePromise;
  if (!notesResponse.ok()) {
    const body = await notesResponse.text();
    throw new Error(`Case note save failed (${notesResponse.status()}): ${body}`);
  }

  const savedTestId = input.caseType === "observation" ? "case-obs-note-saved" : "case-ps-note-saved";
  await expect(page.getByTestId(savedTestId)).toBeVisible({ timeout: 30_000 });

  await waitForCaseIntelligencePipeline(page, input.caseId, {
    minNotes: input.noteIndex ?? 1,
  });

  // Refresh UI from the completed pipeline.
  await page.reload({ waitUntil: "networkidle" });
  await openIntelligenceTab(page, input.caseType);

  const building = page.getByText(/Building intelligence/i);
  if ((await building.count()) > 0) {
    await expect(building).toHaveCount(0, { timeout: 60_000 });
  }
}

export async function openCaseIntelligenceTab(page: Page, caseType: CaseType): Promise<void> {
  await openIntelligenceTab(page, caseType);
}

export function caseIntelligenceRoot(page: Page, caseType: CaseType) {
  return caseType === "observation"
    ? page.getByTestId("case-intelligence-tab")
    : page.getByTestId("case-ps-intelligence-tab");
}
