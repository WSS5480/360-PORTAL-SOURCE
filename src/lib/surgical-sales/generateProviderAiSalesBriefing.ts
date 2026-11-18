import type {
  FieldBriefingEvidenceCard,
  ProviderIntelligenceFieldBriefingView,
} from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export type ProviderAiSalesBriefing = {
  text: string;
  engagementCount: number;
  evidenceCount: number;
  generatedAt: string;
};

export type GenerateProviderAiSalesBriefingInput = {
  providerName: string;
  organizationName?: string | null;
  engagements: ProviderEngagementSummary[];
  evidenceCards: FieldBriefingEvidenceCard[];
  cases: Array<Record<string, unknown>>;
};

const MAX_TEXT_CHARS = 1_200;
const MAX_FIELD_CHARS = 700;
const FORBIDDEN_DEBUG_COPY = [
  /evidence reviewed/i,
  /extracted evidence/i,
  /unsupported conclusions/i,
  /engagement history unknown/i,
  /\bunknown\b/i,
];

function cleanText(raw: unknown, maxChars = MAX_FIELD_CHARS): string | null {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > maxChars ? `${text.slice(0, maxChars - 3).trim()}...` : text;
}

function dateLabel(raw: unknown): string | null {
  const text = cleanText(raw, 80);
  if (!text) return null;
  const time = new Date(text).getTime();
  if (!Number.isFinite(time)) return text;
  return new Date(time).toISOString().slice(0, 10);
}

function engagementLines(engagements: ProviderEngagementSummary[]): string {
  if (engagements.length === 0) return "- None captured.";
  return engagements
    .map((row, index) => {
      const parts = [
        row.title ? `title=${cleanText(row.title, 160)}` : null,
        `type=${row.engagement_type_label || row.engagement_type || "Engagement"}`,
        `status=${row.status_label || row.status || "not set"}`,
        dateLabel(row.scheduled_at ?? row.engagement_date ?? row.updated_at)
          ? `date=${dateLabel(row.scheduled_at ?? row.engagement_date ?? row.updated_at)}`
          : null,
        row.organization_name ? `facility=${cleanText(row.organization_name, 120)}` : null,
        row.case_number ? `case=${cleanText(row.case_number, 80)}` : null,
        row.opportunity_label ? `opportunity=${cleanText(row.opportunity_label, 160)}` : null,
        row.outcome_label ? `outcome=${cleanText(row.outcome_label, 240)}` : null,
        row.memory_context_line ? `context=${cleanText(row.memory_context_line)}` : null,
        row.notes ? `notes=${cleanText(row.notes)}` : null,
      ].filter(Boolean);
      return `- E${index + 1}: ${parts.join("; ")}`;
    })
    .join("\n");
}

function evidenceLines(evidenceCards: FieldBriefingEvidenceCard[]): string {
  if (evidenceCards.length === 0) return "- None captured.";
  return evidenceCards
    .map((card, index) => {
      const impacts = card.intelligenceImpacts.map((impact) => impact.label).filter(Boolean).join(", ");
      const parts = [
        `title=${cleanText(card.title, 180)}`,
        card.mappedFieldLabel ? `field=${cleanText(card.mappedFieldLabel, 160)}` : null,
        card.sourceTypeLabel ? `source=${cleanText(card.sourceTypeLabel, 120)}` : null,
        card.dateLabel ? `date=${cleanText(card.dateLabel, 80)}` : null,
        card.sourceDateLabel ? `sourceDate=${cleanText(card.sourceDateLabel, 80)}` : null,
        card.sourceQuote ? `quote=${cleanText(card.sourceQuote)}` : null,
        card.excerpt ? `excerpt=${cleanText(card.excerpt)}` : null,
        card.whyItMatters ? `commercialMeaning=${cleanText(card.whyItMatters)}` : null,
        impacts ? `impacts=${cleanText(impacts, 240)}` : null,
      ].filter(Boolean);
      return `- V${index + 1}: ${parts.join("; ")}`;
    })
    .join("\n");
}

function caseLines(cases: Array<Record<string, unknown>>): string {
  if (cases.length === 0) return "- None captured.";
  return cases
    .map((row, index) => {
      const activityBodies = Array.isArray(row.activities)
        ? row.activities
            .map((activity) => cleanText((activity as Record<string, unknown>).body, 260))
            .filter(Boolean)
            .slice(0, 4)
        : [];
      const parts = [
        row.case_number ? `case=${cleanText(row.case_number, 80)}` : null,
        row.case_date ? `date=${dateLabel(row.case_date)}` : null,
        row.status ? `status=${cleanText(row.status, 80)}` : null,
        row.case_type ? `type=${cleanText(row.case_type, 120)}` : null,
        row.procedure_type ? `procedure=${cleanText(row.procedure_type, 160)}` : null,
        row.product_name ? `product=${cleanText(row.product_name, 160)}` : null,
        row.observation_goal ? `goal=${cleanText(row.observation_goal)}` : null,
        row.notes ? `notes=${cleanText(row.notes)}` : null,
        row.debrief_key_findings ? `debrief=${cleanText(row.debrief_key_findings)}` : null,
        row.live_observation_clinical_pain_points
          ? `painPoints=${cleanText(row.live_observation_clinical_pain_points)}`
          : null,
        row.live_observation_product_fit ? `productFit=${cleanText(row.live_observation_product_fit)}` : null,
        row.live_observation_competitors ? `competitors=${cleanText(row.live_observation_competitors)}` : null,
        row.live_observation_workflow ? `workflow=${cleanText(row.live_observation_workflow)}` : null,
        activityBodies.length > 0 ? `activityNotes=${activityBodies.join(" | ")}` : null,
      ].filter(Boolean);
      return `- C${index + 1}: ${parts.join("; ")}`;
    })
    .join("\n");
}

export function buildProviderAiSalesBriefingPrompt(input: GenerateProviderAiSalesBriefingInput): string {
  return [
    `Provider: ${input.providerName || "Provider"}`,
    input.organizationName ? `Facility: ${input.organizationName}` : null,
    "",
    "Provider engagements:",
    engagementLines(input.engagements),
    "",
    "Deterministic evidence cards:",
    evidenceLines(input.evidenceCards),
    "",
    "Provider cases and observation notes:",
    caseLines(input.cases),
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}

function normalizeBriefingText(raw: string): string | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const capped = text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS - 3).trim()}...` : text;
  if (FORBIDDEN_DEBUG_COPY.some((pattern) => pattern.test(capped))) return null;
  return capped;
}

async function callOpenAiProviderBriefing(userPrompt: string): Promise<string> {
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
        process.env.OPENAI_PROVIDER_AI_SUMMARY_MODEL?.trim() ||
        process.env.OPENAI_PREP_PLAN_FIELD_MODEL?.trim() ||
        "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 420,
      messages: [
        {
          role: "system",
          content:
            "You write grounded sales briefings for medical device reps. Write 3-5 concise sentences in polished sales language. Use only the supplied provider engagements, evidence cards, cases, and notes. Every claim must be directly supported by the supplied records. Do not invent clinical outcomes, provider preferences, commitments, access status, competitors, product interest, or next steps. If the records are thin, say what is captured and frame the next move as a question to validate. Do not mention debug or audit wording, including evidence reviewed, extracted evidence, unsupported conclusions, engagement history unknown, or unknown. Do not use markdown.",
        },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty OpenAI response");
  return content;
}

export async function generateProviderAiSalesBriefing(
  input: GenerateProviderAiSalesBriefingInput,
): Promise<ProviderAiSalesBriefing | null> {
  if (input.engagements.length === 0 && input.evidenceCards.length === 0 && input.cases.length === 0) return null;
  try {
    const raw = await callOpenAiProviderBriefing(buildProviderAiSalesBriefingPrompt(input));
    const text = normalizeBriefingText(raw);
    if (!text) return null;
    return {
      text,
      engagementCount: input.engagements.length,
      evidenceCount: input.evidenceCards.length,
      generatedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error("[generateProviderAiSalesBriefing] Failed to generate provider AI summary:", e);
    return null;
  }
}

export async function generateProviderAiSalesBriefingFromView(input: {
  providerName: string;
  organizationName?: string | null;
  engagements: ProviderEngagementSummary[];
  cases: Array<Record<string, unknown>>;
  view: ProviderIntelligenceFieldBriefingView;
}): Promise<ProviderAiSalesBriefing | null> {
  if (!input.view.hasFieldEvidence) return null;
  return generateProviderAiSalesBriefing({
    providerName: input.providerName,
    organizationName: input.organizationName,
    engagements: input.engagements,
    evidenceCards: input.view.fieldEvidence,
    cases: input.cases,
  });
}
