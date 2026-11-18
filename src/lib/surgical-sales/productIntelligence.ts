import { z } from "zod";
import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { defaultAssertionForDeclaredSource } from "@/lib/surgical-sales/universalExtractor/assertionModel";
import type {
  UniversalDeclaredSourceType,
  UniversalSurgicalFact,
} from "@/lib/surgical-sales/universalExtractor/types";

export const PRODUCT_INTELLIGENCE_KNOWLEDGE_TYPES = [
  "what_it_does",
  "procedures",
  "problems_solved",
  "buying_signals",
  "workflow_pain_points",
  "evaluation_questions",
  "objections",
  "competitors",
  "stakeholders",
  "differentiators",
  "other",
] as const;

export type ProductIntelligenceKnowledgeType = (typeof PRODUCT_INTELLIGENCE_KNOWLEDGE_TYPES)[number];

export const PRODUCT_INTELLIGENCE_KNOWLEDGE_LABELS: Record<ProductIntelligenceKnowledgeType, string> = {
  what_it_does: "What it does",
  procedures: "Procedures",
  problems_solved: "Problems solved",
  buying_signals: "Buying signals",
  workflow_pain_points: "Workflow pain points",
  evaluation_questions: "Evaluation questions",
  objections: "Objections",
  competitors: "Competitors",
  stakeholders: "Stakeholders",
  differentiators: "Differentiators",
  other: "Other",
};

const ProductKnowledgeCandidateSchema = z.object({
  knowledge_type: z.enum(PRODUCT_INTELLIGENCE_KNOWLEDGE_TYPES),
  title: z.string().min(3).max(160),
  content: z.string().min(3).max(1400),
  evidence: z.string().max(1200).optional().nullable(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

const ProductKnowledgeAnalysisSchema = z.object({
  summary: z.string().max(1200).optional().nullable(),
  candidates: z.array(ProductKnowledgeCandidateSchema).max(40),
});

export type ProductKnowledgeCandidate = z.infer<typeof ProductKnowledgeCandidateSchema>;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trim()}…`;
}

function productResearchPrompt(input: {
  productName: string;
  category?: string | null;
  description?: string | null;
}): string {
  const category = input.category?.trim();
  const description = input.description?.trim();
  return [
    `Product: ${input.productName}`,
    category ? `Category: ${category}` : "Category: unknown",
    description ? `Known description: ${description}` : "Known description: none provided",
    "",
    "Create reviewable sales product intelligence for a surgical device sales team using only the known product context above.",
    "Do not infer clinical specialty, procedures, competitors, claims, indications, materials, outcomes, or workflow benefits from the product name alone.",
    "If the known context is thin, return only low-confidence candidates that restate the known context and identify what evidence an admin still needs.",
    "Return useful knowledge for: what the product does, procedures it is used in, problems it solves, buying signals, workflow pain points, evaluation questions, objections, competitors, stakeholders, and differentiators.",
    "Every candidate will be reviewed by an admin before use, so do not include final instructions or rep coaching.",
  ].join("\n");
}

function hasThinProductResearchContext(input: {
  category?: string | null;
  description?: string | null;
}): boolean {
  const description = input.description?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  if (!description) return true;
  if (/no catalog|not yet|unknown|tbd|to be determined/i.test(description)) return true;
  return [category, description].join(" ").length < 120;
}

function thinContextProductResearchCandidates(input: {
  productName: string;
  category?: string | null;
  description?: string | null;
}): ProductKnowledgeCandidate[] {
  const category = input.category?.trim();
  const description = input.description?.trim();
  const knownContext = [category ? `category: ${category}` : null, description ? `description: ${description}` : null]
    .filter(Boolean)
    .join("; ");

  return [
    {
      knowledge_type: "what_it_does",
      title: "Known product context",
      content: `${input.productName} has limited product context on file${knownContext ? ` (${knownContext})` : ""}. Do not infer procedures, competitors, indications, or workflow claims until product documentation is added.`,
      evidence: knownContext || "No category or description was provided.",
      confidence: "low",
    },
    {
      knowledge_type: "evaluation_questions",
      title: "Product evidence needed",
      content: `Confirm ${input.productName}'s intended procedures, indications, materials, sizing/catalog variants, differentiators, and approved claims from product documentation before approving sales intelligence.`,
      evidence: "Generated because the product row has thin context.",
      confidence: "low",
    },
  ];
}

function documentAnalysisPrompt(input: {
  productName: string;
  documentTitle: string;
  extractedText: string;
}): string {
  return [
    `Product: ${input.productName}`,
    `Document: ${input.documentTitle}`,
    "",
    "Extract reviewable product intelligence from this document for a surgical device sales team.",
    "Do not invent facts beyond the document. Prefer short reusable facts and include source evidence when available.",
    "Return useful knowledge for: what the product does, procedures it is used in, problems it solves, buying signals, workflow pain points, evaluation questions, objections, competitors, stakeholders, and differentiators.",
    "",
    "Document text:",
    truncate(input.extractedText, 18000),
  ].join("\n");
}

const PRODUCT_INTELLIGENCE_SYSTEM_PROMPT = `You extract product intelligence for a surgical device sales platform.

Return JSON only:
{
  "summary": "short optional summary",
  "candidates": [
    {
      "knowledge_type": "what_it_does | procedures | problems_solved | buying_signals | workflow_pain_points | evaluation_questions | objections | competitors | stakeholders | differentiators | other",
      "title": "short admin-facing title",
      "content": "specific reusable product knowledge",
      "evidence": "short source quote or reason, if available",
      "confidence": "high | medium | low"
    }
  ]
}

Rules:
1. Output candidates for admin review, not final production knowledge.
2. Keep each candidate atomic and useful to an extraction engine.
3. Do not include PHI, patient details, invented claims, clinical outcome promises, or unsupported superiority claims.
4. Buying signals and workflow pain points should be phrases the extractor can later match against rep notes.
5. If evidence is document-derived, quote or closely identify the source text.`;

export async function runProductDocumentAnalysis(input: {
  productName: string;
  documentTitle: string;
  extractedText: string;
}): Promise<ProductKnowledgeCandidate[]> {
  const content = await callOpenAiStructuredJson({
    systemPrompt: PRODUCT_INTELLIGENCE_SYSTEM_PROMPT,
    userPrompt: documentAnalysisPrompt(input),
    maxTokens: 4096,
  });
  const parsed = ProductKnowledgeAnalysisSchema.parse(JSON.parse(content));
  return parsed.candidates;
}

export async function runProductAiResearch(input: {
  productName: string;
  category?: string | null;
  description?: string | null;
}): Promise<ProductKnowledgeCandidate[]> {
  if (hasThinProductResearchContext(input)) {
    return thinContextProductResearchCandidates(input);
  }

  const content = await callOpenAiStructuredJson({
    systemPrompt: PRODUCT_INTELLIGENCE_SYSTEM_PROMPT,
    userPrompt: productResearchPrompt(input),
    maxTokens: 4096,
  });
  const parsed = ProductKnowledgeAnalysisSchema.parse(JSON.parse(content));
  return parsed.candidates;
}

export async function extractProductDocumentText(file: File): Promise<{
  text: string;
  status: "text_extracted" | "text_unavailable";
}> {
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
    return { text, status: text ? "text_extracted" : "text_unavailable" };
  }

  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: true });
      const text = String((result as { text?: unknown }).text ?? "").trim();
      return { text, status: text ? "text_extracted" : "text_unavailable" };
    } catch (error) {
      console.warn("[product-intelligence] pdf text extraction failed", error);
      return { text: "", status: "text_unavailable" };
    }
  }

  return { text: "", status: "text_unavailable" };
}

export async function insertProductKnowledgeCandidates(input: {
  productId: string;
  documentId?: string | null;
  runId?: string | null;
  candidates: ProductKnowledgeCandidate[];
}): Promise<void> {
  if (input.candidates.length === 0) return;
  const { error } = await supabaseAdmin.from("surgical_sales_product_intelligence_candidates").insert(
    input.candidates.map((candidate) => ({
      product_id: input.productId,
      document_id: input.documentId ?? null,
      run_id: input.runId ?? null,
      knowledge_type: candidate.knowledge_type,
      title: candidate.title.trim(),
      content: candidate.content.trim(),
      evidence: candidate.evidence?.trim() || null,
      confidence: candidate.confidence,
      status: "pending",
    })),
  );
  if (error) throw new Error(error.message);
}

function productMentionPattern(productName: string): RegExp {
  const escaped = productName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

type ApprovedProductIntelligenceRow = {
  knowledge_type: ProductIntelligenceKnowledgeType;
  title: string | null;
  content: string | null;
  confidence: "high" | "medium" | "low";
  product?: { id?: string; name?: string | null; active?: boolean } | null;
};

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 5 && !["product", "workflow", "signal", "signals"].includes(token)),
  );
}

function evidenceMatchesApprovedKnowledge(evidence: string, content: string): boolean {
  const evidenceTokens = tokenSet(evidence);
  if (evidenceTokens.size === 0) return false;
  for (const token of tokenSet(content)) {
    if (evidenceTokens.has(token)) return true;
  }
  return false;
}

function bestEvidenceForApprovedKnowledge(input: {
  productName: string;
  content: string;
  facts: UniversalSurgicalFact[];
}): string | null {
  const candidateConcepts = new Set<UniversalSurgicalFact["concept"]>([
    "product_interest",
    "workflow_or_timing_issue",
    "visualization_or_access_issue",
    "placement_or_positioning_issue",
    "sizing_or_fit_issue",
    "inventory_availability_issue",
    "product_performance_issue",
    "procedure_focus",
    "procedure_volume_trend",
  ]);

  for (const fact of input.facts) {
    if (!candidateConcepts.has(fact.concept)) continue;
    if (fact.negated || fact.uncertain) continue;
    const evidence = fact.evidence_text?.trim();
    if (!evidence) continue;
    if (evidenceMatchesApprovedKnowledge(evidence, input.content)) return evidence;
  }

  return null;
}

async function loadApprovedProductIntelligenceRows(): Promise<ApprovedProductIntelligenceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_product_intelligence_candidates")
    .select("knowledge_type, title, content, confidence, product:surgical_sales_products!inner(id, name, active)")
    .eq("status", "approved")
    .eq("product.active", true)
    .order("updated_at", { ascending: false })
    .limit(240);

  if (error) {
    if (/does not exist|schema cache/i.test(error.message ?? "")) return [];
    console.warn("[product-intelligence] approved context load failed", error.message);
    return [];
  }

  return (data ?? []) as ApprovedProductIntelligenceRow[];
}

/** Deprecated prompt helper retained for debug tooling; extraction uses deterministic enrichment below. */
export async function buildApprovedProductIntelligencePromptContext(rawNote: string): Promise<string | null> {
  const note = rawNote.trim();
  if (!note) return null;

  const rows = await loadApprovedProductIntelligenceRows();

  const byProduct = new Map<string, { name: string; lines: string[] }>();
  for (const row of rows) {
    const productName = String(row.product?.name ?? "").trim();
    const content = String(row.content ?? "").trim();
    if (!productName || !content) continue;
    if (!productMentionPattern(productName).test(note)) continue;

    const existing = byProduct.get(productName) ?? { name: productName, lines: [] };
    const label = PRODUCT_INTELLIGENCE_KNOWLEDGE_LABELS[row.knowledge_type] ?? "Other";
    existing.lines.push(`- ${label}: ${truncate(content, 220)} (${row.confidence})`);
    byProduct.set(productName, existing);
  }

  if (byProduct.size === 0) return null;

  return Array.from(byProduct.values())
    .map((product) => [`Product: ${product.name}`, ...product.lines.slice(0, 16)].join("\n"))
    .join("\n\n");
}

export async function enrichFactsWithApprovedProductIntelligence(input: {
  rawNote: string;
  declaredSourceType: UniversalDeclaredSourceType;
  facts: UniversalSurgicalFact[];
}): Promise<UniversalSurgicalFact[]> {
  const note = input.rawNote.trim();
  if (!note || input.facts.length === 0) return input.facts;

  const rows = await loadApprovedProductIntelligenceRows();
  if (rows.length === 0) return input.facts;

  const additions: UniversalSurgicalFact[] = [];
  const seen = new Set(
    input.facts.map(
      (fact) =>
        `${fact.concept}:${fact.product_mentioned ?? ""}:${fact.normalized_label}:${fact.evidence_text}`.toLowerCase(),
    ),
  );

  for (const row of rows) {
    if (
      row.knowledge_type !== "buying_signals" &&
      row.knowledge_type !== "workflow_pain_points" &&
      row.knowledge_type !== "problems_solved" &&
      row.knowledge_type !== "procedures" &&
      row.knowledge_type !== "differentiators"
    ) {
      continue;
    }

    const productName = String(row.product?.name ?? "").trim();
    const content = String(row.content ?? "").trim();
    if (!productName || !content || !productMentionPattern(productName).test(note)) continue;

    const evidence = bestEvidenceForApprovedKnowledge({
      productName,
      content,
      facts: input.facts,
    });
    if (!evidence) continue;

    const fact: UniversalSurgicalFact = {
      concept: "product_interest",
      normalized_label: `Potential ${productName} Fit`,
      assertion_level: defaultAssertionForDeclaredSource(input.declaredSourceType),
      source_type: input.declaredSourceType,
      evidence_text: evidence,
      confidence: row.confidence,
      negated: false,
      uncertain: false,
      product_mentioned: productName,
      notes: `Matched approved product intelligence: ${PRODUCT_INTELLIGENCE_KNOWLEDGE_LABELS[row.knowledge_type]}`,
    };
    const key = `${fact.concept}:${fact.product_mentioned ?? ""}:${fact.normalized_label}:${fact.evidence_text}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push(fact);
  }

  return additions.length > 0 ? [...input.facts, ...additions] : input.facts;
}
