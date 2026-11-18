import { test, expect, type Page } from "@playwright/test";
import { buildLogUpdateIntelligenceReview } from "../../src/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "../../src/lib/surgical-sales/logUpdateParseFreeform";
import type { DebriefIntelligenceExtractionContext } from "../../src/lib/surgical-sales/debriefIntelligenceExtractionContext";
import { runUniversalSurgicalExtraction } from "../../src/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "../../src/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { buildReviewProjectionFromUniversalFacts } from "../../src/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { signIn } from "./helpers/signIn";

type GuardrailScenario = {
  name: string;
  providerName: string;
  dictation: string;
  discoveryContext: DebriefIntelligenceExtractionContext | null;
  expectVisible: RegExp[];
  expectHidden: RegExp[];
};

const JESSICA_KNOWN_CONTEXT: DebriefIntelligenceExtractionContext = {
  pathwayStageId: "discovery",
  pathwayStageLabel: "Discovery",
  discoveryReadinessPercent: 45,
  openQuestions: [],
  signalStatuses: [],
  supportContacts: [
    {
      contactId: "contact-jessica",
      name: "Jessica",
      contactType: "scheduling",
      workflowRole: "Scheduling Coordinator",
      ownershipType: "organization",
      contactDetailsMissing: false,
    },
  ],
  credentialingPlatforms: [],
  providerPlatformName: null,
  upcomingEngagements: [],
  pastEngagements: [],
  productFocus: null,
  notesHistory: [],
};

const SCENARIOS: GuardrailScenario[] = [
  {
    name: "field-note parity with lettuce intro dictation",
    providerName: "Tom Lettuce",
    dictation: [
      "Stopped by to introduce myself to Dr. Lettuce today between clinic and his afternoon cases.",
      "We had about ten minutes to talk.",
      "He primarily performs robotic and laparoscopic ventral hernia repairs and said he's always interested in learning about new technology if it offers a meaningful clinical benefit.",
      "Right now he's comfortable with the products he's using and isn't actively looking to make a change, but he enjoys reviewing published clinical evidence before forming an opinion.",
      "We talked briefly about our portfolio, and he said he'd be open to having me observe one of his cases in the future if scheduling allows.",
      "I also met Jessica, his scheduler, who handles observation requests and coordinates OR access.",
      "She asked me to email her a few possible dates, and she'll see what works with Dr. Lettuce's schedule.",
      "Overall it was a positive first meeting, and I think there's a good opportunity to build the relationship over the next few visits.",
    ].join(" "),
    discoveryContext: null,
    expectVisible: [
      /Jessica\s+—\s+Scheduling Coordinator/i,
      /ventral hernia|Robotic|Laparoscopic/i,
      /Not actively looking|published clinical evidence|open to new technology/i,
    ],
    expectHidden: [
      /Lettuce\s+Today\s*[—·-]\s*Scheduling/i,
      /Lettuce\s+—\s+Scheduling Coordinator/i,
      /New Procedure Adoption/i,
      /Email the published clinical data/i,
      /Preference\s+repair/i,
      /Observation before product evaluation/i,
    ],
  },
  {
    name: "lounge run-in with known Jessica (full note)",
    providerName: "Tom Lettuce",
    dictation: [
      "Ran into Dr. Lettuce in the physician lounge this afternoon after his last case.",
      "He said he looked over the clinical article I sent last week and appreciated the data,",
      "but he still wants to see how the product performs during an actual case before making any decisions.",
      "Jessica mentioned they have a robotic ventral hernia repair coming up in about two weeks",
      "that might be a good opportunity for an observation if scheduling works out.",
      "Dr. Lettuce also said they're seeing a higher volume of larger ventral defects lately,",
      "so he's paying closer attention to products that are easier to position laparoscopically.",
      "No action needed today other than following up with Jessica next week",
      "to confirm whether the observation date is available.",
    ].join(" "),
    discoveryContext: JESSICA_KNOWN_CONTEXT,
    expectVisible: [
      /Robotic ventral hernia repair|ventral hernia/i,
      /follow(?:ing)?\s+up\s+with\s+Jessica/i,
    ],
    expectHidden: [
      /Lettuce\s+In\s+—\s+Scheduling Coordinator/i,
      /Lettuce\s+—\s+Scheduling Coordinator/i,
      /Lettuce\s+Today\s*[—·-]\s*Scheduling/i,
      /during an actual before making any decisions/i,
    ],
  },
  {
    name: "lounge run-in with known Jessica",
    providerName: "Tom Lettuce",
    dictation: [
      "Ran into Dr. Lettuce in the physician lounge after rounds.",
      "He was friendly and mentioned they are doing more robotic ventral hernia repair and seeing larger ventral defects lately.",
      "Observation access is not approved yet, but he did not seem opposed to it.",
      "Jessica handles scheduling for his cases and can help coordinate an observation.",
      "Other than following up with Jessica next week, no other actions today.",
    ].join(" "),
    discoveryContext: JESSICA_KNOWN_CONTEXT,
    expectVisible: [
      /Robotic ventral hernia repair/i,
      /Larger ventral defects|Increasing procedure volume/i,
      /follow(?:ing)?\s+up\s+with\s+Jessica/i,
    ],
    expectHidden: [
      /Lettuce\s+In\s+—\s+Scheduling Coordinator/i,
      /Lettuce\s+—\s+Scheduling Coordinator/i,
      /Jessica\s+—\s+Scheduling Coordinator/i,
    ],
  },
  {
    name: "office manager Maya on provider profile",
    providerName: "Tom Lettuce",
    dictation: [
      "Checked in at Dr. Lettuce's office today.",
      "Maya, the office manager, coordinates observation scheduling with the hospital.",
      "Dr. Lettuce said he prefers to observe before any product trial.",
      "Plan to email Maya available dates by Friday.",
    ].join(" "),
    discoveryContext: null,
    expectVisible: [/Maya\s+—\s+Office Manager/i],
    expectHidden: [/Lettuce\s+Prefers/i, /Lettuce\s+—\s+Scheduling Coordinator/i],
  },
  {
    name: "observation debrief with Renee",
    providerName: "Tom Lettuce",
    dictation: [
      "Observed Dr. Lettuce during a laparoscopic cholecystectomy today.",
      "Renee coordinated the case and had the room ready early.",
      "Dr. Lettuce mentioned Symbotex as their current mesh standard.",
      "My next step is to send clinical data on larger defect handling.",
    ].join(" "),
    discoveryContext: null,
    expectVisible: [/Renee\s+—/i, /Symbotex/i, /send clinical data/i],
    expectHidden: [/Lettuce\s+—\s+Scheduling Coordinator/i],
  },
  {
    name: "hospital cafe with Nora scheduling",
    providerName: "Tom Lettuce",
    dictation: [
      "Met Dr. Lettuce in the hospital cafeteria.",
      "He declined observation for now but Nora runs scheduling if we revisit.",
      "Foot and ankle reconstruction is a growing part of his practice.",
      "Need to schedule a follow-up office visit with Nora next month.",
    ].join(" "),
    discoveryContext: null,
    expectVisible: [/Nora\s+—/i, /Observation declined|Declined/i],
    expectHidden: [/Lettuce\s+—\s+Scheduling Coordinator/i],
  },
];

function emptyWorkflowLogUpdate(dictation: string): LogUpdateParseResult {
  return {
    sourceText: dictation,
    suggestedUpdates: [],
    fieldUpdates: [],
    intelligenceReview: buildLogUpdateIntelligenceReview(dictation, [], {}),
    stillMissing: [],
    saveAsNoteAccepted: true,
    usesProviderIntelligence: true,
  };
}

function ufRunsFromScenario(scenario: GuardrailScenario): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: scenario.dictation,
    declared_source_type: "discovery_note",
    context: { provider_display_name: scenario.providerName },
  });
  return [
    {
      capture_id: `guardrails-${scenario.name.replace(/\W+/g, "-")}`,
      declared_source_type: "discovery_note",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `guardrails-${scenario.name}-${index}`,
        capture_id: `guardrails-${scenario.name.replace(/\W+/g, "-")}`,
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

function reviewParseFromScenario(scenario: GuardrailScenario): LogUpdateParseResult {
  return buildReviewProjectionFromUniversalFacts({
    dictation: scenario.dictation,
    debriefRuns: ufRunsFromScenario(scenario),
    workflowLogUpdate: emptyWorkflowLogUpdate(scenario.dictation),
    existingFields: {},
  }).logUpdate;
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

test.describe("Field note extraction guardrails", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.route("**/api/portal/sales/log-update/map", async (route) => {
      const body = route.request().postDataJSON() as { rawNote?: string };
      const scenario = SCENARIOS.find((entry) => entry.dictation === body.rawNote);
      if (!scenario) {
        await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ ok: false }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          parse: reviewParseFromScenario(scenario),
          mapping_source: "universal-rules",
          discovery_context: scenario.discoveryContext,
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

  for (const scenario of SCENARIOS) {
    test(`universal guardrails: ${scenario.name}`, async ({ page }) => {
      await openCapture(page);
      await page.getByRole("textbox", { name: /field note/i }).fill(scenario.dictation);
      await page.getByRole("checkbox", { name: /confirm this update contains no PHI/i }).check();
      await page.getByRole("button", { name: /review updates/i }).click();

      await expect(page.getByRole("dialog", { name: /review extracted intelligence/i })).toBeVisible({
        timeout: 20_000,
      });

      const reviewDialog = page.getByRole("dialog", { name: /review extracted intelligence/i });

      // Exclude the collapsed raw-note dump — it matches dictation text while remaining hidden.
      const visibleReview = reviewDialog.locator(":visible").filter({
        hasNot: reviewDialog.locator(".log-update-review-raw-text"),
      });

      for (const pattern of scenario.expectVisible) {
        await expect(
          visibleReview.getByText(pattern).first(),
          `${scenario.name}: expected ${pattern}`,
        ).toBeVisible();
      }

      for (const pattern of scenario.expectHidden) {
        await expect(
          visibleReview.getByText(pattern),
          `${scenario.name}: hidden ${pattern}`,
        ).toHaveCount(0);
      }
    });
  }
});
