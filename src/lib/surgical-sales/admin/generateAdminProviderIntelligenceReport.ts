import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import type { AdminProviderReportCorpus } from "@/lib/surgical-sales/admin/fetchAdminProviderPreviewData";
import {
  AdminProviderIntelligenceReportSchema,
  type AdminProviderIntelligenceReport,
} from "@/lib/surgical-sales/admin/adminProviderPreviewTypes";

const SYSTEM_PROMPT = `You write brief surgical sales manager intelligence briefings for hospital admin users.

Audience: sales ops manager — not a rep in the field.
Tone: plain English, decisive, no CRM field names, no "Source:" prefixes, no jargon chips.
Never invent facts not present in the input.
If intelligence is thin, say what is missing and what to ask the rep to capture next.
Treat "Cases on file" as activity count only. Do not describe those as cases "with the product" unless Recent cases explicitly says product linked or the source-labelled evidence/universal facts explicitly say current product use, product support, evaluation, or outcome.
Preserve source meaning: observation case notes, debrief dictations, operational notes, product support cases, and intro calls are different evidence types. When evidence conflicts or is thin, say what needs verification instead of over-concluding.

Return JSON only with keys:
headline, summary, what_we_know, friction_or_risks, commercial_outlook, manager_actions

Required shape:
- headline: string
- summary: string
- what_we_know: array of 1-5 strings
- friction_or_risks: array of 0-4 strings
- commercial_outlook: one string, not an array
- manager_actions: array of 1-3 strings`;

function coerceText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).filter(Boolean).join(" ");
  }
  return String(value ?? "").trim();
}

function coerceList(value: unknown, maxItems: number): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => coerceText(item).split(/\n+/))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeAiReportPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const row = raw as Record<string, unknown>;
  return {
    headline: coerceText(row.headline),
    summary: coerceText(row.summary),
    what_we_know: coerceList(row.what_we_know, 5),
    friction_or_risks: coerceList(row.friction_or_risks, 4),
    commercial_outlook: coerceText(row.commercial_outlook),
    manager_actions: coerceList(row.manager_actions, 3),
  };
}

function fallbackReport(corpus: AdminProviderReportCorpus): AdminProviderIntelligenceReport {
  const lines = [...corpus.evidence_lines, ...corpus.uf_lines, ...corpus.crm_lines].slice(0, 5);
  const hasIntel = lines.length > 0;

  if (!hasIntel) {
    return {
      headline: `${corpus.provider_name} — limited intelligence on file`,
      summary: `${corpus.provider_name} at ${corpus.organization_name} is in ${corpus.stage_label} with ${corpus.case_count} case(s) on file. The team has not captured enough field intelligence for a confident manager read yet.`,
      what_we_know: [
        `Pathway stage: ${corpus.stage_label}`,
        corpus.case_count > 0
          ? `Last case date: ${corpus.last_case_date?.slice(0, 10) ?? "unknown"}`
          : "No completed case history linked yet",
      ],
      friction_or_risks: ["No documented friction or risks yet — confirm on next touchpoint"],
      commercial_outlook: "Too early to assess commercial momentum without observation or evaluation signals.",
      manager_actions: [
        `Ask ${corpus.rep_name} to capture an intro or observation note after the next touchpoint`,
        "Confirm observation access and scheduling path if still in Discovery",
      ],
    };
  }

  return {
    headline: `${corpus.provider_name} — ${corpus.stage_label} with active field signals`,
    summary: `${corpus.provider_name} (${corpus.organization_name}) is owned by ${corpus.rep_name} and sits in ${corpus.stage_label}. The team has ${corpus.case_count} case(s) and captured intelligence worth manager review.`,
    what_we_know: lines.slice(0, 4),
    friction_or_risks: lines.filter((l) => /friction|pain|challenge|delay|staff|workflow|inventory|visual/i.test(l)).slice(0, 3),
    commercial_outlook:
      corpus.stage_label === "Discovery" || corpus.stage_label === "Observation"
        ? "Commercial motion is still early — focus on access, observation quality, and debrief completion."
        : "Evaluate whether recent signals support moving toward product evaluation or commitment.",
    manager_actions: [
      `Review full provider file with ${corpus.rep_name}`,
      "Confirm the next touchpoint is logged and fresh notes are captured after cases",
    ],
  };
}

function buildUserPrompt(corpus: AdminProviderReportCorpus): string {
  return [
    `Provider: ${corpus.provider_name}`,
    `Organization: ${corpus.organization_name}`,
    `Owning rep: ${corpus.rep_name}`,
    `Pathway stage: ${corpus.stage_label}`,
    `Cases on file: ${corpus.case_count}`,
    `Last case: ${corpus.last_case_date?.slice(0, 10) ?? "none"}`,
    `Last captured: ${corpus.last_captured_at?.slice(0, 10) ?? "none"}`,
    "",
    "CRM intelligence:",
    corpus.crm_lines.length ? corpus.crm_lines.map((l) => `- ${l}`).join("\n") : "- none",
    "",
    "Universal facts:",
    corpus.uf_lines.length ? corpus.uf_lines.map((l) => `- ${l}`).join("\n") : "- none",
    "",
    "Source-labelled evidence from notes, dictations, observations, debriefs, and support cases:",
    corpus.evidence_lines.length ? corpus.evidence_lines.map((l) => `- ${l}`).join("\n") : "- none",
    "",
    "Recent cases:",
    corpus.case_lines.length ? corpus.case_lines.map((l) => `- ${l}`).join("\n") : "- none",
    "",
    "Recent engagements:",
    corpus.engagement_lines.length ? corpus.engagement_lines.map((l) => `- ${l}`).join("\n") : "- none",
  ].join("\n");
}

export async function generateAdminProviderIntelligenceReport(
  corpus: AdminProviderReportCorpus,
): Promise<{ report: AdminProviderIntelligenceReport; used_ai: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { report: fallbackReport(corpus), used_ai: false };
  }

  try {
    const raw = await callOpenAiStructuredJson({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(corpus),
      temperature: 0.2,
      maxTokens: 1200,
    });
    const parsed = AdminProviderIntelligenceReportSchema.parse(normalizeAiReportPayload(JSON.parse(raw)));
    return { report: parsed, used_ai: true };
  } catch {
    return { report: fallbackReport(corpus), used_ai: false };
  }
}
