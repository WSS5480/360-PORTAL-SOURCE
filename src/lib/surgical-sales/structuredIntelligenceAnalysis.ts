/**
 * Canonical structured intelligence analysis contract for OpenAI outputs.
 *
 * OpenAI is used only for operational memory synthesis — never UI routing.
 * All model responses must conform to StructuredIntelligenceAnalysisSchema.
 */

import { z } from "zod";
import {
  sanitizeFieldIntelligenceLabel,
  sanitizeFieldIntelligenceText,
  sanitizeFieldIntelligenceValue,
} from "@/lib/surgical-sales/fieldIntelligenceLanguage";

/** Required save destinations shown to reps before commit. */
export const INTELLIGENCE_SAVE_TARGETS = [
  "organization",
  "provider",
  "case",
  "engagement",
] as const;

export type IntelligenceSaveTarget = (typeof INTELLIGENCE_SAVE_TARGETS)[number];

export const INTELLIGENCE_DOMAINS = [
  "or_access",
  "credentialing",
  "scheduling",
  "workflow",
  "relationship",
  "stakeholders",
  "evaluation",
  "product_fit",
  "case_mix",
  "procurement",
  "next_steps",
] as const;

export type IntelligenceDomain = (typeof INTELLIGENCE_DOMAINS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const ACTION_PRIORITIES = ["high", "medium", "low"] as const;
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];

export const OWNER_TYPES = ["rep", "scheduler", "provider", "office", "credentialing"] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

/** Legacy log-update target vocabulary (normalized to save_target server-side). */
export const LEGACY_INTELLIGENCE_TARGETS = [
  "case",
  "engagement_note",
  "engagement",
  "provider",
  "organization",
  "multiple",
] as const;

export type LegacyIntelligenceTarget = (typeof LEGACY_INTELLIGENCE_TARGETS)[number];

const IntelligenceUpdateBaseSchema = z.object({
  domain: z.enum(INTELLIGENCE_DOMAINS),
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(4000),
  confidence: z.enum(CONFIDENCE_LEVELS),
  save_target: z.enum(INTELLIGENCE_SAVE_TARGETS),
  reasoning: z.string().min(1).max(800),
  source_scope: z.string().min(1).max(400).optional(),
});

export const ConfirmedIntelligenceUpdateSchema = IntelligenceUpdateBaseSchema;

export const PartialIntelligenceUpdateSchema = IntelligenceUpdateBaseSchema.extend({
  still_needs: z.array(z.string().min(1).max(300)).max(12),
});

export const StillToValidateSchema = z.object({
  domain: z.enum(INTELLIGENCE_DOMAINS),
  question: z.string().min(1).max(400),
  priority: z.enum(ACTION_PRIORITIES),
  save_target: z.enum(INTELLIGENCE_SAVE_TARGETS).optional(),
});

export const RecommendedNextMoveSchema = z.object({
  action: z.string().min(1).max(500),
  owner_type: z.enum(OWNER_TYPES),
  priority: z.enum(ACTION_PRIORITIES),
  save_target: z.enum(INTELLIGENCE_SAVE_TARGETS).optional(),
});

export const DoNotUpdateSchema = z.object({
  item: z.string().min(1).max(500),
  reason: z.string().min(1).max(500),
});

export const OperationalSignalSchema = z.object({
  domain: z.enum(INTELLIGENCE_DOMAINS),
  signal: z.string().min(1).max(200),
  confidence: z.enum(CONFIDENCE_LEVELS),
  evidence: z.string().min(1).max(2000),
  operational_meaning: z.string().min(1).max(4000),
  save_target: z.enum(INTELLIGENCE_SAVE_TARGETS),
  reasoning: z.string().min(1).max(800),
  source_scope: z.string().min(1).max(400).optional(),
});

export const StructuredIntelligenceAnalysisSchema = z.object({
  summary: z.string().min(1).max(1200),
  confidence: z.enum(CONFIDENCE_LEVELS),
  reasoning: z.string().min(1).max(1200),
  source_scope: z.string().min(1).max(400),
  operational_signals: z.array(OperationalSignalSchema).max(24).default([]),
  confirmed_updates: z.array(ConfirmedIntelligenceUpdateSchema).max(24),
  partial_updates: z.array(PartialIntelligenceUpdateSchema).max(24),
  still_to_validate: z.array(StillToValidateSchema).max(16),
  recommended_next_moves: z.array(RecommendedNextMoveSchema).max(12),
  do_not_update: z.array(DoNotUpdateSchema).max(12),
});

export type StructuredIntelligenceAnalysis = z.infer<typeof StructuredIntelligenceAnalysisSchema>;
export type ConfirmedIntelligenceUpdate = z.infer<typeof ConfirmedIntelligenceUpdateSchema>;
export type PartialIntelligenceUpdate = z.infer<typeof PartialIntelligenceUpdateSchema>;
export type StillToValidate = z.infer<typeof StillToValidateSchema>;
export type OperationalIntelligenceSignal = z.infer<typeof OperationalSignalSchema>;

/** Default save_target by operational domain (server-enforced guardrails). */
export const DOMAIN_DEFAULT_SAVE_TARGET: Record<IntelligenceDomain, IntelligenceSaveTarget> = {
  or_access: "organization",
  credentialing: "organization",
  scheduling: "organization",
  workflow: "provider",
  relationship: "provider",
  stakeholders: "organization",
  evaluation: "provider",
  product_fit: "provider",
  case_mix: "provider",
  procurement: "organization",
  next_steps: "engagement",
};

const SAVE_TARGET_ALIASES: Record<string, IntelligenceSaveTarget> = {
  organization: "organization",
  org: "organization",
  facility: "organization",
  hospital: "organization",
  provider: "provider",
  surgeon: "provider",
  case: "case",
  engagement: "engagement",
  engagement_note: "engagement",
  visit: "engagement",
  touch: "engagement",
  note: "engagement",
};

const DOMAIN_ALIASES: Record<string, IntelligenceDomain> = {
  or_access: "or_access",
  "or-access": "or_access",
  oraccess: "or_access",
  access: "or_access",
  credentialing: "credentialing",
  credentials: "credentialing",
  scheduling: "scheduling",
  schedule: "scheduling",
  workflow: "workflow",
  clinical_workflow: "workflow",
  relationship: "relationship",
  stakeholders: "stakeholders",
  stakeholder: "stakeholders",
  evaluation: "evaluation",
  product_fit: "product_fit",
  productfit: "product_fit",
  case_mix: "case_mix",
  casemix: "case_mix",
  procurement: "procurement",
  purchasing: "procurement",
  next_steps: "next_steps",
  next_step: "next_steps",
  nextsteps: "next_steps",
};

function slugKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

export function normalizeDomain(value: unknown): IntelligenceDomain | null {
  const key = slugKey(value);
  if (!key) return null;
  if (DOMAIN_ALIASES[key]) return DOMAIN_ALIASES[key];
  if ((INTELLIGENCE_DOMAINS as readonly string[]).includes(key)) return key as IntelligenceDomain;
  return null;
}

export function normalizeSaveTarget(
  value: unknown,
  domain?: IntelligenceDomain | null,
  fallback: IntelligenceSaveTarget = "provider",
): IntelligenceSaveTarget {
  const key = slugKey(value);
  if (SAVE_TARGET_ALIASES[key]) return SAVE_TARGET_ALIASES[key];
  if ((INTELLIGENCE_SAVE_TARGETS as readonly string[]).includes(key)) return key as IntelligenceSaveTarget;
  if (domain && DOMAIN_DEFAULT_SAVE_TARGET[domain]) return DOMAIN_DEFAULT_SAVE_TARGET[domain];
  return fallback;
}

/** Map canonical save_target to legacy routing target for existing pipelines. */
export function legacyTargetFromSaveTarget(saveTarget: IntelligenceSaveTarget): LegacyIntelligenceTarget {
  if (saveTarget === "engagement") return "engagement_note";
  if (saveTarget === "organization") return "organization";
  return saveTarget;
}

export function saveTargetFromLegacyTarget(
  target: LegacyIntelligenceTarget | string | null | undefined,
  domain?: IntelligenceDomain | null,
): IntelligenceSaveTarget {
  const key = slugKey(target);
  if (key === "engagement_note" || key === "engagement" || key === "visit" || key === "touch") {
    return "engagement";
  }
  if (key === "organization" || key === "facility" || key === "org") return "organization";
  if (key === "case") return "case";
  if (key === "provider") return "provider";
  if (key === "multiple") return domain ? DOMAIN_DEFAULT_SAVE_TARGET[domain] : "provider";
  return normalizeSaveTarget(target, domain);
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const key = slugKey(value);
  if ((allowed as readonly string[]).includes(key)) return key as T;
  return fallback;
}

function normalizeString(value: unknown, maxLen: number, fallback = ""): string {
  const s = String(value ?? "").trim();
  if (!s) return fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeStringArray(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const s = normalizeString(item, maxLen);
    if (!s) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeUpdateRow(
  item: unknown,
  kind: "confirmed" | "partial",
): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const domain = normalizeDomain(row.domain);
  const value = normalizeString(row.value, 4000);
  const label = sanitizeFieldIntelligenceLabel(
    normalizeString(row.label, 200, value.slice(0, 80) || "Update"),
  );
  const sanitizedValue = sanitizeFieldIntelligenceValue(value);
  if (!domain || !sanitizedValue) return null;

  const save_target = normalizeSaveTarget(
    row.save_target ?? row.saveTarget ?? row.target,
    domain,
  );
  const reasoning = normalizeString(
    row.reasoning ?? row.reason,
    800,
    "Mapped from field note.",
  );

  const base = {
    domain,
    label,
    value: sanitizedValue,
    confidence: normalizeEnum(row.confidence, CONFIDENCE_LEVELS, "medium"),
    save_target,
    reasoning: sanitizeFieldIntelligenceText(reasoning, { maxLen: 400 }) || reasoning,
    source_scope: normalizeString(row.source_scope ?? row.sourceScope, 400) || undefined,
  };

  if (kind === "partial") {
    return {
      ...base,
      still_needs: normalizeStringArray(row.still_needs ?? row.stillNeeds, 12, 300),
    };
  }
  return base;
}

function normalizeOperationalSignals(items: unknown): OperationalIntelligenceSignal[] {
  if (!Array.isArray(items)) return [];
  const out: OperationalIntelligenceSignal[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const domain = normalizeDomain(row.domain);
    const operational_meaning = sanitizeFieldIntelligenceValue(
      normalizeString(row.operational_meaning ?? row.operationalMeaning ?? row.value, 4000),
    );
    const signal = normalizeString(row.signal ?? row.label, 200, operational_meaning.slice(0, 80) || "Signal");
    const evidence = normalizeString(row.evidence ?? row.reasoning ?? row.reason, 2000, operational_meaning);
    const reasoning = normalizeString(row.reasoning ?? row.reason, 800, "Extracted from field note.");
    if (!domain || !operational_meaning || !signal) continue;
    out.push({
      domain,
      signal,
      confidence: normalizeEnum(row.confidence, CONFIDENCE_LEVELS, "medium"),
      evidence,
      operational_meaning,
      save_target: normalizeSaveTarget(row.save_target ?? row.saveTarget ?? row.target, domain),
      reasoning,
      source_scope: normalizeString(row.source_scope ?? row.sourceScope, 400) || undefined,
    });
  }
  return out;
}

/** Coerce messy model JSON into strict shape before Zod validation. */
export function normalizeStructuredIntelligencePayload(
  raw: unknown,
  rawNote: string,
  defaultSourceScope = "field_note",
): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;

  const summary = sanitizeFieldIntelligenceText(
    normalizeString(o.summary, 1200) ||
      normalizeString(rawNote, 1200).split(/\n/)[0]?.slice(0, 400) ||
      "Field note captured.",
    { preferShort: true, maxLen: 320 },
  );

  const stillRaw =
    o.still_to_validate ?? o.stillToValidate ?? o.still_worth_confirming ?? o.stillWorthConfirming;
  const movesRaw =
    o.recommended_next_moves ??
    o.recommendedNextMoves ??
    o.suggested_next_actions ??
    o.suggestedNextActions;

  return {
    summary,
    confidence: normalizeEnum(o.confidence, CONFIDENCE_LEVELS, "medium"),
    reasoning: normalizeString(o.reasoning, 1200, "Synthesized from rep field note."),
    source_scope: normalizeString(o.source_scope ?? o.sourceScope, 400, defaultSourceScope),
    operational_signals: normalizeOperationalSignals(
      o.operational_signals ?? o.operationalSignals ?? o.signals,
    ),
    confirmed_updates: Array.isArray(o.confirmed_updates)
      ? o.confirmed_updates.map((i) => normalizeUpdateRow(i, "confirmed")).filter(Boolean)
      : [],
    partial_updates: Array.isArray(o.partial_updates)
      ? o.partial_updates.map((i) => normalizeUpdateRow(i, "partial")).filter(Boolean)
      : [],
    still_to_validate: Array.isArray(stillRaw)
      ? stillRaw
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const domain = normalizeDomain(row.domain);
            const question = sanitizeFieldIntelligenceText(normalizeString(row.question, 400), {
              maxLen: 300,
            });
            if (!domain || !question) return null;
            return {
              domain,
              question,
              priority: normalizeEnum(row.priority, ACTION_PRIORITIES, "medium"),
              save_target: row.save_target
                ? normalizeSaveTarget(row.save_target, domain)
                : undefined,
            };
          })
          .filter(Boolean)
      : [],
    recommended_next_moves: Array.isArray(movesRaw)
      ? movesRaw
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const action = normalizeString(row.action, 500);
            if (!action) return null;
            const domain = normalizeDomain(row.domain);
            return {
              action,
              owner_type: normalizeEnum(row.owner_type ?? row.ownerType, OWNER_TYPES, "rep"),
              priority: normalizeEnum(row.priority, ACTION_PRIORITIES, "medium"),
              save_target: row.save_target
                ? normalizeSaveTarget(row.save_target, domain)
                : undefined,
            };
          })
          .filter(Boolean)
      : [],
    do_not_update: Array.isArray(o.do_not_update)
      ? o.do_not_update
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const reason = normalizeString(row.reason, 500, "Not supported by the note.");
            const label = normalizeString(row.item, 500);
            if (!label) return null;
            return { item: label, reason };
          })
          .filter(Boolean)
      : [],
  };
}

export const STRUCTURED_INTELLIGENCE_SYSTEM_PROMPT = `You are an operational signal detector for surgical device field teams.

The rep note may be free-form dictation — bullets, fragments, stream-of-consciousness, or full sentences. Do NOT depend on a specific sentence format. Extract meaning from any style.

Universal extraction rules (mandatory):
1. Extract only what is explicitly stated or strongly implied in the note — never invent missing facts.
2. Never fill gaps with assumptions; preserve unknowns as still_to_validate or partial_updates with still_needs.
3. Separate confirmed facts (confirmed_updates, high confidence only when plainly stated) from inferred signals (partial_updates, hedged language).
4. Separate interest ("interested", "open to observation", "not opposed", "didn't shut down") from approval ("observation approved", "cleared to observe", "permission to observe") — interest is never a confirmed approval.
5. Separate mentioned people (name only, no contact info, unclear role) from confirmed contacts (named owner with operational role, or contact details present).
6. Separate pain points (frustrations, workflow problems) from product interest (product names, evaluations, competitive mentions) — do not merge into one update.
7. Separate next steps (future actions: "need to", "follow up", "get her info") from completed actions (past tense: "scheduled", "called", "sent") — next steps go to still_to_validate or partial, not confirmed facts.
8. If the note does not say it, do not guess — use still_to_validate instead.

Every operational_signal MUST include:
- evidence: verbatim excerpt from the rep note (short quote)
- operational_meaning: synthesized fact (not coaching)
- confidence: high | medium | low
- domain and save_target

Your job is ONLY to:
1. Detect operational signals stated or implied in the rep note
2. Map learnings to pathway-related domains (or_access, scheduling, case_mix, evaluation, etc.)
3. Suggest status updates (confirmed / partial / still unknown) — NOT rep strategy or coaching

Do NOT act as a sales strategist, coach, or advisor. No next-step playbooks. No commercial speculation.

Return JSON only with this exact shape:
{
  "summary": "One short operational sentence or empty string — what was detected, not advice",
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief — why signals are supported by the note",
  "source_scope": "entity context (provider visit, case day, facility policy)",
  "operational_signals": [{
    "domain", "signal", "confidence", "evidence", "operational_meaning", "save_target", "reasoning", "source_scope"
  }],
  "confirmed_updates": [],
  "partial_updates": [],
  "still_to_validate": [{ "domain", "question", "priority", "save_target" }],
  "recommended_next_moves": [],
  "do_not_update": [{ "item", "reason" }]
}

save_target (required on every signal and update) — one of:
- organization — credentialing, OR access, scheduling workflow, observation policy, SPD/tray logistics, purchasing process (facility-wide unless surgeon-only exception stated)
- provider — procedure mix, technique preference, workflow interest, communication style, evaluation openness
- case — implants, trays, room, case timing, support coverage, product availability
- engagement — what happened today, commitments, follow-up notes (this touch only)

Domains: or_access | credentialing | scheduling | workflow | relationship | stakeholders | evaluation | product_fit | case_mix | procurement | next_steps

Intelligence categories (server maps every extracted item to exactly one primary + optional secondary):
- access_intelligence — observation approval, credentialing, scheduling pathway, facility approval, access blockers
- relationship_intelligence — openness, resistance, trust, receptiveness, relationship temperature
- clinical_focus — procedure types, case mix, volume, specialty focus, clinical complexity
- workflow_intelligence — OR workflow, turnover, setup, scheduling process, bottlenecks
- product_fit_signals — only when dictation explicitly ties to our product, category, evaluation, trial, or solution (not vague OR/workflow friction alone)
- competitive_intelligence — named competitors, current products, vendor preferences
- people_contacts — schedulers, coordinators, office managers, champions, blockers
- next_steps — follow-up actions, owner, timing, unresolved questions

Workflow domain — procedure workflow understanding maturity (not yes/no observation):
- discussed_only — verbal understanding, no direct visualization yet
- partially_understood — some workflow visibility, gaps remain
- observed_in_field — workflow directly seen during observation or case
- fully_validated — high confidence, operational fit confirmed, repeatable understanding
- unknown — not yet captured
Infer from debrief language and prefix provider field values with token when clear (e.g. observed_in_field|…).

Classification rules (critical — server enforces these too):
1. confirmed_updates — ONLY clear affirmative facts the rep learned. Requires explicit supporting language in the note. confidence "high" only when the fact is stated plainly without hedging.
2. partial_updates — Useful information with remaining uncertainty. Use when the rep mentions facts BUT gaps remain (e.g. "mix of open, lap, and robotic" without breakdown). Label like "Procedure mix partially mapped". Include still_needs[] describing what remains. ALWAYS emit partial_updates for suspected contacts (e.g. "Karen from his office handles scheduling") even without email/phone — save_target "provider" for office schedulers, NOT organization unless the note says facility-wide scheduling. Include evidence/source quote in reasoning.
For EVERY confirmed_update and partial_update, reasoning MUST include a verbatim Source quote line copied from the rep note, e.g. Source quote: "Vendor credentialing has to be completed first…" — no paraphrase-only evidence.
3. still_to_validate — Gaps and unresolved pathway requirements. Phrase as short factual gaps (e.g. "Official observation approval", "Scheduler name"). Questions OK when the rep asked one in the note.
4. recommended_next_moves — ALWAYS return [] (empty). Never suggest rep strategy, follow-up playbooks, or coaching.
5. raw debrief — The rep note itself is always preserved separately; never replace it with synthesis.

Never:
- Save absence of knowledge as a confirmed update (e.g. "scheduling owner not identified", "procedure mix unknown").
- Record what the rep does NOT know as if it were on-file intelligence.
- Overstate conclusions or infer product acceptance, evaluation likelihood, or commercial impact unless explicitly stated.
- Put hedged language ("but I didn't get…", "still need to…", "not sure who…") in confirmed_updates.
- Treat observation openness or interest as partial only — never confirmed observation approval unless explicitly approved in the note.

or_access / observation approval:
- confirmed_updates ONLY for explicit approval ("observation approved", "she approved observation", "we can observe", "cleared to observe", "permission to observe").
- partial_updates for "open to observation", "not opposed", "didn't shut down", "no resistance", "seems willing", "right people", "once credentialing is done" — include still_needs for official approval.

Examples:
- Note: "They do a mix of open, lap, and robotic cases, but I didn't get a great breakdown yet."
  → partial_updates: [{ label: "Procedure mix partially mapped", value: "Open, lap, and robotic cases were mentioned, but detailed breakdown still needs validation.", still_needs: ["Detailed open/lap/robotic case breakdown"], confidence: "medium", domain: "case_mix", save_target: "provider" }]
  → NOT confirmed_updates: "procedure mix known"
- Note: "I still need to figure out who coordinates access or scheduling."
  → still_to_validate: [{ question: "Who coordinates access or scheduling?", domain: "scheduling", priority: "high" }]
  → NOT confirmed_updates: "scheduling owner not identified"
- Note: "Karen from his office handles scheduling; I still need her info."
  → partial_updates: [{ domain: "scheduling", label: "Scheduling owner partially mapped", value: "Karen (provider office) appears to handle scheduling.", still_needs: ["Karen contact info"], confidence: "medium", save_target: "provider", source_scope: "provider office" }]
  → NOT confirmed_updates naming Karen as confirmed facility scheduler

Guardrails:
- Do not invent facts not supported by the note.
- Leave confirmed_updates and partial_updates as empty arrays []; server derives them from operational_signals when possible.
- operational_meaning must be complete synthesized intelligence — never raw visit filler.
- evidence holds the rep-note excerpt; operational_meaning is synthesized only.
- Use snake_case domain and save_target values exactly as listed.

operational_signals.signal (required style):
- Short, concrete phrases: "Robotic procedures mentioned", "Observation openness implied", "Scheduler not identified"
- Never: "indicating potential", "strategic opportunity", "may want to consider", "leverage", "drive adoption"

summary:
- Optional. If present: one neutral detection line only. Never recommendations.

Never:
- Generic summaries, vague coaching, or overconfident recommendations.
- Consultant / corporate language.

Contact leads (critical):
- ONLY emit stakeholder/contact leads when a real person name appears with operational ownership (e.g. "Karen handles scheduling", "Mike, his PA").
- NEVER invent contacts from vague phrases: "the right people", "their team", "the office", "support staff", "people at the hospital".
- Pronouns (he, she, they) are not contact names.
- Role-only mentions without a name belong in partial_updates or operational_signals — not as contacts.`;

export async function callOpenAiStructuredJson(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:
        params.model?.trim() ||
        process.env.OPENAI_LOG_UPDATE_MAP_MODEL?.trim() ||
        process.env.OPENAI_NOTE_CAPTURE_MODEL ||
        "gpt-4o-mini",
      temperature: params.temperature ?? 0.15,
      max_tokens: params.maxTokens ?? 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${errText.slice(0, 240)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return content;
}

export async function runStructuredIntelligenceAnalysis(params: {
  userPrompt: string;
  rawNote: string;
  sourceScope?: string;
  systemPrompt?: string;
  maxTokens?: number;
}): Promise<StructuredIntelligenceAnalysis> {
  const content = await callOpenAiStructuredJson({
    systemPrompt: params.systemPrompt ?? STRUCTURED_INTELLIGENCE_SYSTEM_PROMPT,
    userPrompt: params.userPrompt,
    maxTokens: params.maxTokens,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const normalized = normalizeStructuredIntelligencePayload(
    parsed,
    params.rawNote,
    params.sourceScope ?? "field_note",
  );
  const result = StructuredIntelligenceAnalysisSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`Structured intelligence shape invalid: ${result.error.message.slice(0, 300)}`);
  }
  return result.data;
}

export const INTELLIGENCE_SAVE_TARGET_LABELS: Record<IntelligenceSaveTarget, string> = {
  organization: "Facility",
  provider: "Provider",
  case: "Case",
  engagement: "Engagement",
};
