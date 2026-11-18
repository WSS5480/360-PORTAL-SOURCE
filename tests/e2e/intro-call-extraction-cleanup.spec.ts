import { test, expect, type Page } from "@playwright/test";
import { buildLogUpdateIntelligenceReview } from "../../src/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "../../src/lib/surgical-sales/logUpdateParseFreeform";
import { runUniversalSurgicalExtraction } from "../../src/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "../../src/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { buildReviewProjectionFromUniversalFacts } from "../../src/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { signIn } from "./helpers/signIn";

type IntroCallScenario = {
  name: string;
  providerName: string;
  dictation: string;
  expectVisible: RegExp[];
  expectHidden?: RegExp[];
};

const SCENARIOS: IntroCallScenario[] = [
  {
    name: "lettuce intro accuracy — Jessica scheduler, no hallucinated contacts, no new-adoption",
    providerName: "Dr. Lettuce",
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
    name: "hernia intro, pending observation, scheduler identified",
    providerName: "Dr. Lettuce",
    dictation: [
      "Spoke with Dr. Lettuce for an intro call. He was friendly and open to learning more about our program.",
      "He is seeing high volume ventral hernia and abdominal wall reconstruction procedures.",
      "He currently uses Bard Mesh on many hernia cases but wants to understand our approach before discussing a switch.",
      "Observation access was not approved today. Jennifer appears to be involved in scheduling and may be a good contact for future coordination.",
      "My next step is to connect with the office staff and learn more about the observation process.",
    ].join(" "),
    expectVisible: [
      /Jennifer\s+—\s+Scheduling Coordinator/i,
      /Interested.+not yet approved|Not yet approved/i,
      /Abdominal wall reconstruction|Ventral hernia repair/i,
      /Abdominal wall reconstruction/i,
      /Bard Mesh/i,
    ],
  },
  {
    name: "trauma intro, approved observation, office manager identified",
    providerName: "Dr. Pepper",
    dictation: [
      "Intro call with Dr. Pepper went very well. She was enthusiastic about continuing the conversation.",
      "She described increasing distal radius fracture volume and more upper extremity trauma referrals.",
      "She uses Acumed for many distal radius cases.",
      "She approved a case observation for next month. Maya, her office manager, coordinates scheduling with the hospital.",
      "My next step is to send available dates and coordinate the observation window with Maya.",
    ].join(" "),
    expectVisible: [
      /Maya\s+—\s+Office Manager/i,
      /Observation approved|Approved/i,
      /Distal radius|Upper extremity trauma/i,
      /Acumed/i,
    ],
  },
  {
    name: "bariatric intro, credentialing dependent, commercial sequencing",
    providerName: "Dr. Salt",
    dictation: [
      "Met Dr. Salt for an introductory call. He was interested but cautious and said product evaluation should wait until after I observe a case.",
      "He is doing more bariatric and laparoscopic cholecystectomy procedures this quarter.",
      "He mentioned Symbotex as one of the meshes they use today.",
      "Observation is possible, but vendor credentialing is required before anyone can enter the OR.",
      "Renee handles scheduling and helps coordinate credentialing paperwork for observation access.",
      "My next step is to send the insurance certificate for the credentialing packet.",
    ].join(" "),
    expectVisible: [
      /Renee\s+—\s+Scheduling Coordinator/i,
      /Observation allowed after credentialing|Credentialing required/i,
      /Bariatric|Laparoscopic/i,
      /Commercial signal: Observation before product evaluation|Observation before product evaluation/i,
    ],
  },
  {
    name: "foot ankle intro, declined observation, reserved sentiment",
    providerName: "Dr. Berry",
    dictation: [
      "I spoke with Dr. Berry for an intro call. He was reserved but open to a follow-up conversation.",
      "Foot and ankle reconstruction is a major focus area in his practice, including complex ankle fracture cases.",
      "He currently uses Phasix for select soft tissue cases.",
      "He declined observation access for now and said we should revisit it after another conversation.",
      "Nora handles scheduling for his office.",
      "My next step is to prepare a short office meeting agenda.",
    ].join(" "),
    expectVisible: [
      /Nora\s+—\s+Scheduling Coordinator/i,
      /Observation declined|Declined/i,
      /Foot And Ankle Reconstruction|Complex ankle fracture|Ankle/i,
      /Phasix/i,
    ],
  },
  {
    name: "robotic general surgery intro, OR coordinator, trial sequencing",
    providerName: "Dr. Stone",
    dictation: [
      "Dr. Stone was positive and willing to continue learning after the introductory conversation.",
      "He is expanding robotic hernia repair and robotic cholecystectomy volume.",
      "He uses Ventralight in some ventral hernia cases.",
      "He was not opposed to observation, but nothing was approved today. He wants observation before any formal product trial.",
      "Olivia is the OR coordinator for scheduling and case timing.",
      "My next step is to identify an appropriate robotic case for observation.",
    ].join(" "),
    expectVisible: [
      /Olivia\s+—\s+OR Coordinator/i,
      /Interested.+not yet approved|Not yet approved/i,
      /Robotic hernia repair|Robotic cholecystectomy|Robotic/i,
      /Ventralight/i,
      /Commercial signal: Observation before product evaluation|Observation before product evaluation/i,
    ],
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

function ufRunsFromIntroCall(scenario: IntroCallScenario): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: scenario.dictation,
    declared_source_type: "intro_call",
    context: {
      provider_display_name: scenario.providerName,
    },
  });
  return [
    {
      capture_id: `intro-cleanup-${scenario.name.replace(/\W+/g, "-")}`,
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `intro-cleanup-${index}`,
        capture_id: `intro-cleanup-${scenario.name.replace(/\W+/g, "-")}`,
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

function reviewParseFromIntroCall(scenario: IntroCallScenario): LogUpdateParseResult {
  const debriefRuns = ufRunsFromIntroCall(scenario);
  const parse = buildReviewProjectionFromUniversalFacts({
    dictation: scenario.dictation,
    debriefRuns,
    workflowLogUpdate: emptyWorkflowLogUpdate(scenario.dictation),
    existingFields: {},
  }).logUpdate;

  const nextStepProviderIntel = (parse.fieldUpdates ?? []).filter(
    (field) =>
      field.dbKey === "provider_workflow_pain_points" &&
      /next step|follow up|coordinate|schedule|office staff|available dates/i.test(field.proposedValue),
  );
  expect(nextStepProviderIntel, `${scenario.name} should not store next steps as provider intelligence`).toEqual([]);
  const relationshipProviderIntel = (parse.fieldUpdates ?? []).filter(
    (field) =>
      field.dbKey === "provider_communication_style" &&
      /relationship|continuing|continued discussion|conversation|open to/i.test(field.proposedValue),
  );
  expect(
    relationshipProviderIntel,
    `${scenario.name} should not store relationship-building summaries as provider intelligence`,
  ).toEqual([]);
  return parse;
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
  await expect(
    page.getByRole("dialog", { name: /field note|dictate update/i }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Intro-call extraction cleanup", () => {
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
          parse: reviewParseFromIntroCall(scenario),
          mapping_source: "universal-rules",
          discovery_context: null,
          provider_contact_snapshot: null,
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
    test(`cleans intro-call extraction: ${scenario.name}`, async ({ page }) => {
      await openCapture(page);
      const noteBox = page
        .getByRole("textbox", { name: /field intelligence note|field note/i })
        .first();
      await noteBox.fill(scenario.dictation);
      await page.getByRole("checkbox", { name: /contains no PHI|confirm this update contains no PHI/i }).check();
      await page.getByRole("button", { name: /review updates/i }).click();

      await expect(page.getByRole("dialog", { name: /review extracted intelligence/i })).toBeVisible({
        timeout: 20_000,
      });

      const reviewDialog = page.getByRole("dialog", { name: /review extracted intelligence/i });
      const visibleReview = reviewDialog.locator(":visible");

      for (const pattern of scenario.expectVisible) {
        await expect(
          visibleReview.getByText(pattern).first(),
          `${scenario.name}: expected ${pattern}`,
        ).toBeVisible();
      }

      for (const generic of [
        /Team influence on case flow/i,
        /Staff workflow/i,
        /Credentialing Not Discussed/i,
        /Relationship-building stage/i,
        /Relationship momentum/i,
        /Next step:\s+My next step/i,
      ]) {
        await expect(visibleReview.getByText(generic), `${scenario.name}: generic filler ${generic}`).toHaveCount(0);
      }

      for (const pattern of scenario.expectHidden ?? []) {
        await expect(visibleReview.getByText(pattern), `${scenario.name}: hidden ${pattern}`).toHaveCount(0);
      }
    });
  }
});
