import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLINICAL_DISCOVERY_QUESTION_KEYS,
  clinicalDiscoveryDraftMetaKey,
  getClinicalDiscoveryFieldConfig,
  joinTagsCsv,
  normalizeClinicalDiscoveryQuestionKey,
  normalizeConfidence,
  parseTagsCsv,
  isMeaningfulClinicalDiscoveryResponse,
  PROVIDER_CLINICAL_DISCOVERY_FIELDS,
  type ClinicalDiscoveryConfidence,
  type ClinicalDiscoveryQuestionKey,
} from "@/lib/surgical-sales/providerClinicalDiscovery";

export type ProviderClinicalDiscoveryAnswer = {
  id: string;
  providerId: string;
  questionKey: ClinicalDiscoveryQuestionKey;
  questionLabel: string;
  questionText: string;
  response: string;
  tags: string[];
  confidence: ClinicalDiscoveryConfidence | null;
  sourceCaseId: string | null;
  /** Free-text source when not linked to a case (legacy / UI). */
  sourceNotes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalDiscoveryAnswerRow = {
  id: string;
  provider_id: string;
  question_key: string;
  question_label: string;
  question_text: string;
  response: string;
  tags: string[] | null;
  confidence: string | null;
  source_case_id: string | null;
  source_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClinicalDiscoveryUpsertInput = {
  questionKey: ClinicalDiscoveryQuestionKey;
  response?: string;
  tags?: string[];
  confidence?: ClinicalDiscoveryConfidence | null;
  sourceCaseId?: string | null;
  sourceNotes?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fixed question count for provider-level clinical discovery. */
export const CLINICAL_DISCOVERY_QUESTION_TOTAL = CLINICAL_DISCOVERY_QUESTION_KEYS.length;

export function isClinicalDiscoveryQuestionKey(raw: string): raw is ClinicalDiscoveryQuestionKey {
  return normalizeClinicalDiscoveryQuestionKey(raw) !== null;
}

function mergeDiscoveryAnswers(
  existing: ProviderClinicalDiscoveryAnswer | undefined,
  incoming: ProviderClinicalDiscoveryAnswer,
): ProviderClinicalDiscoveryAnswer {
  if (!existing) return incoming;
  const existingText = String(existing.response ?? "").trim();
  const incomingText = String(incoming.response ?? "").trim();
  const combinedResponse =
    existingText && incomingText && existingText !== incomingText
      ? `${existingText}\n\n${incomingText}`
      : incomingText || existingText;
  const existingMs = new Date(existing.updatedAt).getTime();
  const incomingMs = new Date(incoming.updatedAt).getTime();
  const newer = Number.isFinite(incomingMs) && incomingMs >= existingMs ? incoming : existing;
  const tags = [...new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])])].slice(0, 32);
  return {
    ...newer,
    response: combinedResponse,
    tags,
    confidence: newer.confidence ?? existing.confidence,
    sourceCaseId: newer.sourceCaseId ?? existing.sourceCaseId,
    sourceNotes: newer.sourceNotes ?? existing.sourceNotes,
  };
}

/** Collapse legacy MEDDPICC keys into the five surgical intelligence categories. */
export function normalizeClinicalDiscoveryAnswersList(
  answers: ProviderClinicalDiscoveryAnswer[],
): ProviderClinicalDiscoveryAnswer[] {
  const byKey = new Map<ClinicalDiscoveryQuestionKey, ProviderClinicalDiscoveryAnswer>();
  for (const raw of answers) {
    const canonical = normalizeClinicalDiscoveryQuestionKey(raw.questionKey);
    if (!canonical) continue;
    const field = getClinicalDiscoveryFieldConfig(canonical);
    const normalized: ProviderClinicalDiscoveryAnswer = {
      ...raw,
      questionKey: canonical,
      questionLabel: field.shortLabel,
      questionText: field.question,
    };
    byKey.set(canonical, mergeDiscoveryAnswers(byKey.get(canonical), normalized));
  }
  return CLINICAL_DISCOVERY_QUESTION_KEYS.map((k) => byKey.get(k)).filter(
    (a): a is ProviderClinicalDiscoveryAnswer => Boolean(a),
  );
}

export function rowToClinicalDiscoveryAnswer(row: ClinicalDiscoveryAnswerRow): ProviderClinicalDiscoveryAnswer {
  const conf = normalizeConfidence(row.confidence);
  const canonical =
    normalizeClinicalDiscoveryQuestionKey(row.question_key) ??
    (row.question_key as ClinicalDiscoveryQuestionKey);
  const field = PROVIDER_CLINICAL_DISCOVERY_FIELDS.find((f) => f.questionKey === canonical);
  return {
    id: row.id,
    providerId: row.provider_id,
    questionKey: canonical,
    questionLabel: field?.shortLabel ?? row.question_label,
    questionText: field?.question ?? row.question_text,
    response: String(row.response ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    confidence: conf || null,
    sourceCaseId: row.source_case_id ? String(row.source_case_id) : null,
    sourceNotes: row.source_notes ? String(row.source_notes) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function answersByQuestionKey(
  answers: ProviderClinicalDiscoveryAnswer[],
): Partial<Record<ClinicalDiscoveryQuestionKey, ProviderClinicalDiscoveryAnswer>> {
  const map: Partial<Record<ClinicalDiscoveryQuestionKey, ProviderClinicalDiscoveryAnswer>> = {};
  for (const a of normalizeClinicalDiscoveryAnswersList(answers)) map[a.questionKey] = a;
  return map;
}

export function isClinicalDiscoveryAnswerComplete(answer: ProviderClinicalDiscoveryAnswer | undefined): boolean {
  return isMeaningfulClinicalDiscoveryResponse(answer?.response);
}

export function countClinicalDiscoveryAnswersComplete(
  answers: ProviderClinicalDiscoveryAnswer[],
): { filled: number; total: number } {
  const total = CLINICAL_DISCOVERY_QUESTION_KEYS.length;
  const byKey = answersByQuestionKey(answers);
  let filled = 0;
  for (const key of CLINICAL_DISCOVERY_QUESTION_KEYS) {
    if (isClinicalDiscoveryAnswerComplete(byKey[key])) filled += 1;
  }
  return { filled, total };
}

export type ClinicalDiscoveryInsightHighlight = {
  questionKey: ClinicalDiscoveryQuestionKey;
  label: string;
  snippet: string;
  tags: string[];
  confidence: ClinicalDiscoveryConfidence | null;
};

function truncateInsightSnippet(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** Most recently updated completed answers for compact intelligence surfaces. */
export function topClinicalDiscoveryInsightsFromAnswers(
  answers: ProviderClinicalDiscoveryAnswer[],
  limit = 3,
  snippetMax = 120,
): ClinicalDiscoveryInsightHighlight[] {
  return answers
    .filter((a) => isClinicalDiscoveryAnswerComplete(a))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
    .map((a) => {
      const field = getClinicalDiscoveryFieldConfig(a.questionKey);
      return {
        questionKey: a.questionKey,
        label: a.questionLabel?.trim() || field.shortLabel,
        snippet: truncateInsightSnippet(String(a.response ?? ""), snippetMax),
        tags: (a.tags ?? []).slice(0, 4),
        confidence: a.confidence,
      };
    });
}

export function clinicalDiscoveryPreviewFromAnswers(
  answers: ProviderClinicalDiscoveryAnswer[],
  maxLen = 72,
): string {
  const { filled, total } = countClinicalDiscoveryAnswersComplete(answers);
  if (filled <= 0) return `${filled} of ${total} complete`;
  const first = answers.find((a) => isClinicalDiscoveryAnswerComplete(a));
  const snippet = first ? String(first.response).trim() : "";
  const base = `${filled} of ${total} complete`;
  if (!snippet) return base;
  const short = snippet.length > maxLen ? `${snippet.slice(0, maxLen - 1)}…` : snippet;
  return `${base} · ${short}`;
}

function trimMax(s: string, max: number): string {
  const t = s.trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max) : t;
}

function parseSourceCaseId(raw: string): string | null {
  const t = raw.trim();
  return UUID_RE.test(t) ? t : null;
}

export function buildClinicalDiscoveryUpsertInput(
  questionKey: ClinicalDiscoveryQuestionKey | string,
  draft: Record<string, string>,
): ClinicalDiscoveryUpsertInput {
  const canonical = normalizeClinicalDiscoveryQuestionKey(questionKey);
  if (!canonical) throw new Error(`Invalid question key: ${questionKey}`);
  const sourceRaw = String(draft[clinicalDiscoveryDraftMetaKey(canonical, "sourceNotes")] ?? "").trim();
  const sourceCaseFromDraft = String(
    draft[clinicalDiscoveryDraftMetaKey(canonical, "sourceCaseId")] ?? "",
  ).trim();
  return {
    questionKey: canonical,
    response: String(draft[canonical] ?? ""),
    tags: parseTagsCsv(draft[clinicalDiscoveryDraftMetaKey(canonical, "tags")] ?? ""),
    confidence: normalizeConfidence(draft[clinicalDiscoveryDraftMetaKey(canonical, "confidence")]) || null,
    sourceCaseId: parseSourceCaseId(sourceCaseFromDraft) || parseSourceCaseId(sourceRaw),
    sourceNotes: sourceRaw && !parseSourceCaseId(sourceRaw) ? sourceRaw : null,
  };
}

export function hydrateClinicalDiscoveryDraftFromAnswers(
  answers: ProviderClinicalDiscoveryAnswer[],
): Record<string, string> {
  const draft: Record<string, string> = {};
  const byKey = answersByQuestionKey(answers);
  for (const field of PROVIDER_CLINICAL_DISCOVERY_FIELDS) {
    const answer = byKey[field.questionKey];
    draft[field.questionKey] = String(answer?.response ?? "");
    draft[clinicalDiscoveryDraftMetaKey(field.questionKey, "confidence")] =
      answer?.confidence ?? "";
    draft[clinicalDiscoveryDraftMetaKey(field.questionKey, "tags")] = joinTagsCsv(answer?.tags ?? []);
    draft[clinicalDiscoveryDraftMetaKey(field.questionKey, "sourceCaseId")] =
      answer?.sourceCaseId ?? "";
    draft[clinicalDiscoveryDraftMetaKey(field.questionKey, "sourceNotes")] =
      answer?.sourceNotes ?? "";
  }
  return draft;
}

/** Keys sent via legacy planning patch on the provider contact. */
export function isLegacyClinicalDiscoveryPlanningKey(key: string): boolean {
  if (key.startsWith("provider_clinical_discovery_")) return true;
  return isClinicalDiscoveryQuestionKey(key) || key.endsWith("_confidence") || key.endsWith("_tags")
    || key.endsWith("_source") || key.endsWith("_sourceCaseId") || key.endsWith("_sourceNotes");
}

export function splitClinicalDiscoveryFromPlanningFields(
  fields: Record<string, string | null> | undefined,
): {
  contactFields: Record<string, string | null>;
  upserts: ClinicalDiscoveryUpsertInput[];
} {
  const contactFields: Record<string, string | null> = {};
  const upserts: ClinicalDiscoveryUpsertInput[] = [];
  if (!fields) return { contactFields, upserts };

  const draft: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (isLegacyClinicalDiscoveryPlanningKey(k)) {
      draft[k] = v === null ? "" : String(v);
    } else {
      contactFields[k] = v;
    }
  }

  for (const field of PROVIDER_CLINICAL_DISCOVERY_FIELDS) {
    const { questionKey, legacyContactColumn } = field;
    const touched =
      draft[questionKey] !== undefined
      || draft[legacyContactColumn] !== undefined
      || draft[clinicalDiscoveryDraftMetaKey(questionKey, "confidence")] !== undefined
      || draft[`${legacyContactColumn}_confidence`] !== undefined
      || draft[clinicalDiscoveryDraftMetaKey(questionKey, "tags")] !== undefined
      || draft[`${legacyContactColumn}_tags`] !== undefined
      || draft[clinicalDiscoveryDraftMetaKey(questionKey, "sourceCaseId")] !== undefined
      || draft[clinicalDiscoveryDraftMetaKey(questionKey, "sourceNotes")] !== undefined
      || draft[`${legacyContactColumn}_source`] !== undefined;
    if (!touched) continue;
    upserts.push(buildClinicalDiscoveryUpsertInput(questionKey, mapLegacyDraftKeys(draft, questionKey)));
  }

  return { contactFields, upserts };
}

function mapLegacyDraftKeys(
  draft: Record<string, string>,
  questionKey: ClinicalDiscoveryQuestionKey,
): Record<string, string> {
  const field = getClinicalDiscoveryFieldConfig(questionKey);
  const legacy = field.legacyContactColumn;
  const out: Record<string, string> = { ...draft };
  if (draft[legacy] !== undefined && out[questionKey] === undefined) {
    out[questionKey] = draft[legacy];
  }
  const legacyConf = `${legacy}_confidence`;
  const legacyTags = `${legacy}_tags`;
  const legacySource = `${legacy}_source`;
  if (draft[legacyConf] !== undefined) {
    out[clinicalDiscoveryDraftMetaKey(questionKey, "confidence")] = draft[legacyConf];
  }
  if (draft[legacyTags] !== undefined) {
    out[clinicalDiscoveryDraftMetaKey(questionKey, "tags")] = draft[legacyTags];
  }
  if (draft[legacySource] !== undefined) {
    out[clinicalDiscoveryDraftMetaKey(questionKey, "sourceNotes")] = draft[legacySource];
  }
  return out;
}

export function clinicalDiscoveryLastUpdatedAt(
  answers: ProviderClinicalDiscoveryAnswer[],
): string | null {
  let latest: string | null = null;
  for (const a of answers) {
    if (!isClinicalDiscoveryAnswerComplete(a)) continue;
    const iso = String(a.updatedAt || "").trim();
    if (!iso) continue;
    if (!latest || new Date(iso).getTime() > new Date(latest).getTime()) latest = iso;
  }
  return latest;
}

export async function listClinicalDiscoveryAnswersByProviderIds(
  admin: SupabaseClient,
  providerIds: string[],
): Promise<Map<string, ProviderClinicalDiscoveryAnswer[]>> {
  const map = new Map<string, ProviderClinicalDiscoveryAnswer[]>();
  if (!providerIds.length) return map;
  const CHUNK = 120;
  for (let i = 0; i < providerIds.length; i += CHUNK) {
    const slice = providerIds.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("provider_clinical_discovery_answers")
      .select("*")
      .in("provider_id", slice);
    if (error) throw new Error(error.message);
    for (const row of (data || []) as ClinicalDiscoveryAnswerRow[]) {
      const answer = rowToClinicalDiscoveryAnswer(row);
      const list = map.get(answer.providerId) || [];
      list.push(answer);
      map.set(answer.providerId, list);
    }
  }
  return map;
}

export async function listClinicalDiscoveryAnswersForProvider(
  admin: SupabaseClient,
  providerId: string,
): Promise<ProviderClinicalDiscoveryAnswer[]> {
  const { data, error } = await admin
    .from("provider_clinical_discovery_answers")
    .select("*")
    .eq("provider_id", providerId)
    .order("question_key", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = ((data || []) as ClinicalDiscoveryAnswerRow[]).map(rowToClinicalDiscoveryAnswer);
  return normalizeClinicalDiscoveryAnswersList(rows);
}

export async function upsertClinicalDiscoveryAnswer(
  admin: SupabaseClient,
  providerId: string,
  actorUserId: string,
  input: ClinicalDiscoveryUpsertInput,
): Promise<ProviderClinicalDiscoveryAnswer> {
  const canonical = normalizeClinicalDiscoveryQuestionKey(input.questionKey);
  if (!canonical) throw new Error(`Invalid question key: ${input.questionKey}`);
  const field = getClinicalDiscoveryFieldConfig(canonical);
  input = { ...input, questionKey: canonical };
  const now = new Date().toISOString();
  const response = trimMax(String(input.response ?? ""), 16000);
  const tags = [...new Set((input.tags ?? []).map((t) => trimMax(t, 80)).filter(Boolean))].slice(0, 32);
  const confidence = input.confidence ? normalizeConfidence(input.confidence) || null : null;
  const sourceCaseId = input.sourceCaseId && UUID_RE.test(input.sourceCaseId) ? input.sourceCaseId : null;
  const sourceNotes = input.sourceNotes ? trimMax(input.sourceNotes, 500) : null;

  const { data: existing } = await admin
    .from("provider_clinical_discovery_answers")
    .select("id, created_by, created_at")
    .eq("provider_id", providerId)
    .eq("question_key", canonical)
    .maybeSingle();

  const row = {
    provider_id: providerId,
    question_key: canonical,
    question_label: field.shortLabel,
    question_text: field.question,
    response,
    tags,
    confidence,
    source_case_id: sourceCaseId,
    source_notes: sourceNotes,
    updated_by: actorUserId,
    updated_at: now,
    ...(existing
      ? {}
      : {
          created_by: actorUserId,
          created_at: now,
        }),
  };

  const { data, error } = await admin
    .from("provider_clinical_discovery_answers")
    .upsert(row, { onConflict: "provider_id,question_key" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToClinicalDiscoveryAnswer(data as ClinicalDiscoveryAnswerRow);
}

export async function upsertClinicalDiscoveryAnswers(
  admin: SupabaseClient,
  providerId: string,
  actorUserId: string,
  inputs: ClinicalDiscoveryUpsertInput[],
): Promise<ProviderClinicalDiscoveryAnswer[]> {
  const results: ProviderClinicalDiscoveryAnswer[] = [];
  for (const input of inputs) {
    results.push(await upsertClinicalDiscoveryAnswer(admin, providerId, actorUserId, input));
  }
  return results;
}

export async function touchProviderPlanningUpdatedAt(
  admin: SupabaseClient,
  providerId: string,
): Promise<void> {
  const { error } = await admin
    .from("surgical_sales_contacts")
    .update({
      provider_planning_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);
  if (error) throw new Error(error.message);
}
