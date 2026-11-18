/**
 * OpenAI-backed structured intelligence services (analysis only — no UI decisions).
 */

import { z } from "zod";
import {
  callOpenAiStructuredJson,
  INTELLIGENCE_SAVE_TARGET_LABELS,
  normalizeStructuredIntelligencePayload,
  type IntelligenceSaveTarget,
  type StructuredIntelligenceAnalysis,
  StructuredIntelligenceAnalysisSchema,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import type { GuidedIntelCaptureQuestion } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";

const FieldBriefingAiSchema = z.object({
  summary: z.string().min(1).max(800),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string().min(1).max(600),
  priority_asks: z
    .array(
      z.object({
        ask: z.string().min(1).max(300),
        save_target: z.enum(["organization", "provider", "case", "engagement"]),
        reasoning: z.string().min(1).max(400),
      }),
    )
    .max(6),
  critical_unknowns: z.array(z.string().min(1).max(200)).max(8),
  tactical_warnings: z.array(z.string().min(1).max(300)).max(5),
});

export type FieldBriefingAiEnhancement = z.infer<typeof FieldBriefingAiSchema>;

const RapidDiscoveryPrioritizeSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string().min(1).max(600),
  prioritized_db_keys: z.array(z.string().min(1).max(80)).max(40),
});

export type RapidDiscoveryPrioritization = z.infer<typeof RapidDiscoveryPrioritizeSchema>;

const PostSaveSummarySchema = z.object({
  summary: z.string().min(1).max(600),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string().min(1).max(400),
  by_save_target: z
    .array(
      z.object({
        save_target: z.enum(["organization", "provider", "case", "engagement"]),
        headline: z.string().min(1).max(120),
        lines: z.array(z.string().min(1).max(200)).max(12),
      }),
    )
    .max(4),
});

export type PostSaveIntelligenceSummary = z.infer<typeof PostSaveSummarySchema>;

const FIELD_BRIEFING_SYSTEM = `You generate tactical pre-meeting field briefing intelligence for surgical device reps.

Return JSON only:
{
  "summary": "one paragraph operational briefing synthesis",
  "confidence": "high"|"medium"|"low",
  "reasoning": "what evidence supports this briefing",
  "priority_asks": [{ "ask", "save_target", "reasoning" }],
  "critical_unknowns": ["..."],
  "tactical_warnings": ["..."]
}

save_target: organization | provider | case | engagement
Do not invent facts. Prefer operational deployment readiness over CRM language.`;

const RAPID_DISCOVERY_SYSTEM = `You prioritize Rapid Discovery questions for surgical field intelligence capture.

Given unresolved field questions, return JSON only:
{
  "confidence": "high"|"medium"|"low",
  "reasoning": "why this ordering helps deployment readiness",
  "prioritized_db_keys": ["db_key", ...]
}

Order db_keys from highest to lowest operational impact. Only include keys from the input list.
Credentialing/OR access/scheduling → prioritize organization-scoped fields first when gaps block access.
Do not add keys not in the input.`;

const POST_SAVE_SYSTEM = `You summarize intelligence saved after a field rep confirmed updates.

Return JSON only:
{
  "summary": "1-2 short sentences in direct field language",
  "confidence": "high"|"medium"|"low",
  "reasoning": "basis for the summary",
  "by_save_target": [{
    "save_target": "organization"|"provider"|"case"|"engagement",
    "headline": "short operational heading",
    "lines": ["what was saved", ...]
  }]
}

Group by save_target. Use Facility for organization. Be factual — only describe accepted saves listed.
Field language only: no consultant prose, no "could impact product acceptance," no speculation on adoption or evaluation.`;

async function parseOpenAiJson<T>(
  content: string,
  normalize: (raw: unknown) => unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }
  const normalized = normalize(parsed);
  const result = schema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`OpenAI response shape invalid: ${result.error.message.slice(0, 300)}`);
  }
  return result.data;
}

export async function generateFieldBriefingWithOpenAi(input: {
  providerName: string;
  facilityName: string | null;
  touchType: string;
  relationshipStage: string;
  knownFields: Array<{ label: string; value: string; saveTarget: IntelligenceSaveTarget }>;
  existingAsks: string[];
  openGaps: string[];
}): Promise<FieldBriefingAiEnhancement | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;

  const knownLines = input.knownFields
    .slice(0, 30)
    .map((f) => `- [${INTELLIGENCE_SAVE_TARGET_LABELS[f.saveTarget]}] ${f.label}: ${f.value.slice(0, 200)}`);

  const userPrompt = [
    `Provider: ${input.providerName}`,
    input.facilityName ? `Facility: ${input.facilityName}` : "",
    `Touch type: ${input.touchType}`,
    `Relationship stage: ${input.relationshipStage}`,
    "",
    "Known intelligence:",
    knownLines.length ? knownLines.join("\n") : "- (sparse)",
    "",
    "Rule-based asks already planned:",
    input.existingAsks.length ? input.existingAsks.map((a) => `- ${a}`).join("\n") : "- (none)",
    "",
    "Open gaps:",
    input.openGaps.length ? input.openGaps.map((g) => `- ${g}`).join("\n") : "- (none)",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const content = await callOpenAiStructuredJson({
      systemPrompt: FIELD_BRIEFING_SYSTEM,
      userPrompt,
      maxTokens: 2048,
    });
    return await parseOpenAiJson(
      content,
      (raw) => raw,
      FieldBriefingAiSchema,
    );
  } catch {
    return null;
  }
}

export async function prioritizeRapidDiscoveryWithOpenAi(input: {
  questions: Array<Pick<GuidedIntelCaptureQuestion, "dbKey" | "fieldLabel" | "proposedScope" | "priorityScore">>;
  providerName: string;
  facilityName: string | null;
  discoveryStakeholder: string;
}): Promise<RapidDiscoveryPrioritization | null> {
  if (!process.env.OPENAI_API_KEY?.trim() || input.questions.length === 0) return null;

  const questionLines = input.questions.map(
    (q) =>
      `- ${q.dbKey} | ${q.fieldLabel} | scope=${q.proposedScope} | score=${q.priorityScore}`,
  );

  const userPrompt = [
    `Provider: ${input.providerName}`,
    input.facilityName ? `Facility: ${input.facilityName}` : "",
    `Discovery audience: ${input.discoveryStakeholder}`,
    "",
    "Unresolved questions (db_key | label | scope | heuristic score):",
    questionLines.join("\n"),
  ].join("\n");

  try {
    const content = await callOpenAiStructuredJson({
      systemPrompt: RAPID_DISCOVERY_SYSTEM,
      userPrompt,
      maxTokens: 1024,
    });
    return await parseOpenAiJson(content, (raw) => raw, RapidDiscoveryPrioritizeSchema);
  } catch {
    return null;
  }
}

/** Re-order discovery queue using OpenAI prioritization when available. */
export function applyRapidDiscoveryPrioritization(
  queue: GuidedIntelCaptureQuestion[],
  prioritization: RapidDiscoveryPrioritization | null,
): GuidedIntelCaptureQuestion[] {
  if (!prioritization?.prioritized_db_keys.length) return queue;

  const order = new Map(prioritization.prioritized_db_keys.map((k, i) => [k, i]));
  return [...queue].sort((a, b) => {
    const aiA = order.get(a.dbKey) ?? 999;
    const aiB = order.get(b.dbKey) ?? 999;
    if (aiA !== aiB) return aiA - aiB;
    return b.priorityScore - a.priorityScore;
  });
}

export async function summarizePostSaveIntelligenceWithOpenAi(input: {
  sourceScope: string;
  acceptedByTarget: Array<{
    saveTarget: IntelligenceSaveTarget;
    lines: string[];
  }>;
  rawNote?: string | null;
}): Promise<PostSaveIntelligenceSummary | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;

  const targetLines = input.acceptedByTarget.flatMap((g) =>
    g.lines.map((line) => `- [${INTELLIGENCE_SAVE_TARGET_LABELS[g.saveTarget]}] ${line}`),
  );

  if (targetLines.length === 0) return null;

  const userPrompt = [
    `Source: ${input.sourceScope}`,
    input.rawNote ? `Original note excerpt: """${input.rawNote.slice(0, 500)}"""` : "",
    "",
    "Accepted saves:",
    targetLines.join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const content = await callOpenAiStructuredJson({
      systemPrompt: POST_SAVE_SYSTEM,
      userPrompt,
      maxTokens: 1024,
    });
    const parsed = await parseOpenAiJson(content, (raw) => raw, PostSaveSummarySchema);
    return {
      ...parsed,
      summary: sanitizeFieldIntelligenceText(parsed.summary, { preferShort: true, maxLen: 320 }),
      by_save_target: parsed.by_save_target.map((g) => ({
        ...g,
        headline: sanitizeFieldIntelligenceText(g.headline, { maxLen: 120 }),
        lines: g.lines.map((line) => sanitizeFieldIntelligenceText(line, { maxLen: 200 })).filter(Boolean),
      })),
    };
  } catch {
    return null;
  }
}

export type { StructuredIntelligenceAnalysis };
