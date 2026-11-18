/**
 * Provider outreach email draft for debrief prepare — uses observation intelligence + rep workspace.
 */

import type { DebriefProductKnowledge } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import type { DebriefProductKnowledgeId } from "@/lib/surgical-sales/engagements/debriefProductKnowledge/debriefProductKnowledgeTypes";
import type { ProviderObservationNoteEntry } from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import {
  adaptUniversalFactsToWhatWeKnowLines,
  resolveDebriefPrepareProgramRuns,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

export const SIM360_EXPERIENCE_URL = "https://www.360medical.net/sim-360";

export const DEBRIEF_PREPARE_EMAIL_OUTREACH_GOALS = [
  {
    id: "sim360_experience",
    label: "360 Experience at SIM360",
    hint: "Invite them to our Clinical Advancement Center sim lab to test products hands-on.",
  },
  {
    id: "product_trial",
    label: "Product trial / evaluation case",
    hint: "Propose an evaluation case or trial use aligned to what you observed.",
  },
  {
    id: "inservice",
    label: "In-service / training",
    hint: "Offer tailored training or an in-service on workflow and technique.",
  },
] as const;

export type DebriefPrepareEmailOutreachGoal =
  (typeof DEBRIEF_PREPARE_EMAIL_OUTREACH_GOALS)[number]["id"];

export type DebriefPrepareEmailDraftResult = {
  subject: string;
  body: string;
  usedAi: boolean;
};

export type DebriefPrepareEmailDraftInput = {
  outreachGoal: DebriefPrepareEmailOutreachGoal;
  targetProduct: DebriefProductKnowledge;
  providerName: string | null;
  organizationName: string | null;
  repName?: string | null;
  completedObservationCount: number;
  meetingObjective: string;
  whyItMatters: string;
  hypothesis: string;
  knownFacts: string[];
  learnItems: string[];
  questionCards: string[];
  meetingNotes: string;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  completedCaseIds?: string[];
  competitorSummaries?: string[];
  productFitSignals?: string[];
};

const MAX_NOTE_CHARS = 2_400;
const MAX_NOTES = 10;

function truncateNote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_NOTE_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_NOTE_CHARS)}…`;
}

function outreachGoalInstructions(goal: DebriefPrepareEmailOutreachGoal): string {
  switch (goal) {
    case "sim360_experience":
      return `Primary CTA: invite the provider to a 360 Experience at SIM360 (our healthcare simulation and clinical advancement center in McAllen, TX). Include this link: ${SIM360_EXPERIENCE_URL}. Emphasize hands-on product evaluation in a realistic sim environment without patient risk.`;
    case "product_trial":
      return "Primary CTA: propose a product trial or evaluation case in their facility, tied to the workflow moments you observed. Be specific about what you would evaluate together.";
    case "inservice":
      return "Primary CTA: offer an in-service or training session for the provider and/or staff, focused on technique and workflow support for the target product.";
    default:
      return "Primary CTA: propose a clear next step for continued partnership.";
  }
}

export function buildDebriefPrepareEmailDraftUserPrompt(input: DebriefPrepareEmailDraftInput): string {
  const programRuns = resolveDebriefPrepareProgramRuns(input.universalFactsReadModel);
  const ufLines =
    programRuns.length > 0
      ? adaptUniversalFactsToWhatWeKnowLines({
          programRuns,
          completedCaseIds: input.completedCaseIds ?? [],
          programCompletedCount: Math.max(1, input.completedObservationCount),
          countStyle: "program_fraction",
          providerName: input.providerName,
        })
      : [];

  const corpusLines = input.observationCorpus.slice(0, MAX_NOTES).map((entry) => {
    const date = entry.caseDate ? ` (${entry.caseDate})` : "";
    return `Observation ${entry.observationIndex}${date}:\n${truncateNote(entry.body)}`;
  });

  const rawNotes =
    corpusLines.length > 0
      ? corpusLines
      : input.observationNotes.slice(0, MAX_NOTES).map((note, index) => {
          return `Note ${index + 1}:\n${truncateNote(note)}`;
        });

  const product = input.targetProduct;

  const sections = [
    `Outreach goal: ${input.outreachGoal.replace(/_/g, " ")}`,
    outreachGoalInstructions(input.outreachGoal),
    "",
    `Target product: ${product.name}`,
    `Product summary: ${product.shortDescription}`,
    `Problems solved: ${product.problemsSolved.join("; ")}`,
    `Workflow triggers: ${product.workflowTriggers.join("; ")}`,
    `360 positioning: ${product.experience360Positioning}`,
    `Evaluation triggers: ${product.evaluationCaseTriggers.join("; ")}`,
    "",
    input.providerName ? `Provider: ${input.providerName}` : null,
    input.organizationName ? `Organization: ${input.organizationName}` : null,
    input.repName ? `Sales rep: ${input.repName}` : null,
    `Completed observations: ${input.completedObservationCount}`,
    "",
    input.meetingObjective ? `Meeting objective (rep): ${input.meetingObjective}` : null,
    input.whyItMatters ? `Why it matters (rep): ${input.whyItMatters}` : null,
    input.hypothesis ? `Working hypothesis (rep): ${input.hypothesis}` : null,
    input.knownFacts.length > 0
      ? `Observed program facts:\n${input.knownFacts.map((line) => `- ${line}`).join("\n")}`
      : null,
    ufLines.length > 0
      ? `Universal facts (observation program):\n${ufLines.map((line) => `- ${line}`).join("\n")}`
      : null,
    input.learnItems.length > 0
      ? `Still exploring:\n${input.learnItems.map((line) => `- ${line}`).join("\n")}`
      : null,
    input.questionCards.length > 0
      ? `Conversation angles:\n${input.questionCards.map((line) => `- ${line}`).join("\n")}`
      : null,
    input.competitorSummaries?.length
      ? `Competitive context:\n${input.competitorSummaries.map((line) => `- ${line}`).join("\n")}`
      : null,
    input.productFitSignals?.length
      ? `Product fit signals:\n${input.productFitSignals.map((line) => `- ${line}`).join("\n")}`
      : null,
    input.meetingNotes ? `Rep meeting notes: ${input.meetingNotes}` : null,
    rawNotes.length > 0 ? `Raw observation notes:\n${rawNotes.join("\n\n")}` : null,
  ].filter(Boolean);

  return sections.join("\n");
}

export function parseDebriefPrepareEmailDraftResponse(raw: string): { subject: string; body: string } {
  const normalized = raw.trim();
  const subjectMatch = normalized.match(/^SUBJECT:\s*(.+?)(?:\r?\n|$)/im);
  const bodyMatch = normalized.match(/(?:^|\n)BODY:\s*\r?\n([\s\S]*)$/im);

  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }

  const lines = normalized.split(/\r?\n/);
  const subject = lines[0]?.replace(/^subject:\s*/i, "").trim() || "Following up on our observation program";
  const body = lines.slice(1).join("\n").trim() || normalized;
  return { subject, body };
}

async function callOpenAiEmailDraft(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:
        process.env.OPENAI_DEBRIEF_EMAIL_DRAFT_MODEL?.trim() ||
        process.env.OPENAI_PREP_PLAN_FIELD_MODEL?.trim() ||
        "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 1_200,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  return content;
}

function buildFallbackEmailDraft(input: DebriefPrepareEmailDraftInput): DebriefPrepareEmailDraftResult {
  const provider = input.providerName ? `Dr. ${input.providerName.replace(/^Dr\.?\s+/i, "")}` : "there";
  const org = input.organizationName ? ` at ${input.organizationName}` : "";
  const product = input.targetProduct.name;
  const fact = input.knownFacts[0] ?? "the workflow patterns we discussed";

  let subject = `Next step — ${product}`;
  let body = `Hi ${provider},\n\nThank you for allowing us to observe your cases${org}. Based on what we saw — especially ${fact.toLowerCase()} — I would like to continue the conversation around ${product}.\n\n`;

  if (input.outreachGoal === "sim360_experience") {
    subject = `SIM360 hands-on experience — ${product}`;
    body += `I would like to invite you to our SIM360 Clinical Advancement Center for a 360 Experience where you can test ${product} in a realistic simulation environment: ${SIM360_EXPERIENCE_URL}\n\n`;
  } else if (input.outreachGoal === "product_trial") {
    subject = `Evaluation case idea — ${product}`;
    body += `I would like to propose a focused evaluation case for ${product} that aligns with what we observed in your workflow.\n\n`;
  } else {
    subject = `In-service for ${product}`;
    body += `I would like to schedule a brief in-service on ${product} for you and your team.\n\n`;
  }

  body += `Would you have 20 minutes next week to discuss timing?\n\nBest,\n[Your name]`;

  return { subject, body, usedAi: false };
}

export async function generateDebriefPrepareProviderEmailDraft(
  input: DebriefPrepareEmailDraftInput,
): Promise<DebriefPrepareEmailDraftResult> {
  const system = `You draft outreach emails for medical device sales reps following an observation program debrief.
Write a concise, professional email to the surgeon/provider.
Rules:
- Use only facts from the provided intelligence — do not invent clinical outcomes, commitments, or pricing.
- Sound personal and specific to what was observed; reference 1-2 concrete patterns when available.
- Match the outreach goal and target product positioning.
- Keep the body under 220 words unless the context strongly warrants more.
- Use a warm but respectful tone appropriate for a busy surgeon.
- End with a clear, low-friction call to action and sign off as "[Your name]" (placeholder).
- Do not use markdown.

Return exactly this format:
SUBJECT: <one line subject>
---
BODY:
<email body with line breaks>`;

  const user = buildDebriefPrepareEmailDraftUserPrompt(input);

  try {
    const raw = await callOpenAiEmailDraft(system, user);
    const parsed = parseDebriefPrepareEmailDraftResponse(raw);
    if (!parsed.subject || !parsed.body) throw new Error("Could not parse email draft");
    return { ...parsed, usedAi: true };
  } catch {
    return buildFallbackEmailDraft(input);
  }
}

export function isDebriefPrepareEmailOutreachGoal(
  value: string,
): value is DebriefPrepareEmailOutreachGoal {
  return DEBRIEF_PREPARE_EMAIL_OUTREACH_GOALS.some((goal) => goal.id === value);
}

export function isDebriefPrepareEmailProductId(value: string): value is DebriefProductKnowledgeId {
  return ["ACSIS", "BioTissue", "Merakris", "TelaBio", "Skeletal Dynamics", "Endolumik"].includes(value);
}
