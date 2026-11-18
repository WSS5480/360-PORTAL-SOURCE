import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UniversalSurgicalFact } from "@/lib/surgical-sales/universalExtractor/types";

export type UniversalSurgicalFactRow = UniversalSurgicalFact & {
  id: string;
  capture_id: string;
  provider_id: string | null;
  organization_id: string | null;
  case_id: string | null;
  encounter_id: string | null;
  suppressed: boolean;
  created_at: string;
};

export type UniversalSurgicalFactCaptureRow = {
  id: string;
  raw_note: string;
  declared_source_type: string;
  extraction_model: string;
  extraction_ms: number | null;
  provider_id: string | null;
  organization_id: string | null;
  case_id: string | null;
  encounter_id: string | null;
  operational_note_id: string | null;
  workflow_stage: string | null;
  product_context: string | null;
  created_at: string;
  fact_count?: number;
};

function mapFactRow(row: Record<string, unknown>): UniversalSurgicalFactRow {
  return {
    id: String(row.id),
    capture_id: String(row.capture_id),
    provider_id: row.provider_id ? String(row.provider_id) : null,
    organization_id: row.organization_id ? String(row.organization_id) : null,
    case_id: row.case_id ? String(row.case_id) : null,
    encounter_id: row.encounter_id ? String(row.encounter_id) : null,
    concept: row.concept as UniversalSurgicalFactRow["concept"],
    normalized_label: String(row.normalized_label ?? ""),
    assertion_level: row.assertion_level as UniversalSurgicalFactRow["assertion_level"],
    source_type: row.source_type as UniversalSurgicalFactRow["source_type"],
    evidence_text: String(row.evidence_text ?? ""),
    confidence: row.confidence as UniversalSurgicalFactRow["confidence"],
    negated: Boolean(row.negated),
    uncertain: Boolean(row.uncertain),
    suppressed: Boolean(row.suppressed),
    product_mentioned: row.product_mentioned ? String(row.product_mentioned) : undefined,
    person_mentioned: row.person_mentioned ? String(row.person_mentioned) : undefined,
    item_mentioned: row.item_mentioned ? String(row.item_mentioned) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at ?? ""),
  };
}

type ScopeQuery = {
  provider_id?: string;
  organization_id?: string;
  case_id?: string;
  encounter_id?: string;
  include_suppressed?: boolean;
  limit?: number;
};

async function loadFactsByScope(
  column: "provider_id" | "organization_id" | "case_id" | "encounter_id",
  entityId: string,
  opts?: { include_suppressed?: boolean; limit?: number },
): Promise<UniversalSurgicalFactRow[]> {
  const limit = opts?.limit ?? 100;
  let query = supabaseAdmin
    .from("universal_surgical_facts")
    .select("*")
    .eq(column, entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!opts?.include_suppressed) {
    query = query.eq("suppressed", false);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => mapFactRow(row as Record<string, unknown>));
}

/** Facts for provider profile / mission screens. */
export async function loadUniversalFactsForProvider(
  providerId: string,
  opts?: { include_suppressed?: boolean; limit?: number },
): Promise<UniversalSurgicalFactRow[]> {
  return loadFactsByScope("provider_id", providerId, opts);
}

/** Facts for organization screens. */
export async function loadUniversalFactsForOrganization(
  organizationId: string,
  opts?: { include_suppressed?: boolean; limit?: number },
): Promise<UniversalSurgicalFactRow[]> {
  return loadFactsByScope("organization_id", organizationId, opts);
}

/** Facts for surgical case screens. */
export async function loadUniversalFactsForCase(
  caseId: string,
  opts?: { include_suppressed?: boolean; limit?: number },
): Promise<UniversalSurgicalFactRow[]> {
  return loadFactsByScope("case_id", caseId, opts);
}

/** Facts for engagement / debrief / evaluation encounter screens. */
export async function loadUniversalFactsForEncounter(
  encounterId: string,
  opts?: { include_suppressed?: boolean; limit?: number },
): Promise<UniversalSurgicalFactRow[]> {
  return loadFactsByScope("encounter_id", encounterId, opts);
}

/** Load capture events (note-level) for a case with optional fact counts. */
export async function loadUniversalFactCapturesForCase(
  caseId: string,
  limit = 50,
): Promise<UniversalSurgicalFactCaptureRow[]> {
  return loadCapturesByScope("case_id", caseId, limit);
}

export type UniversalFactExtractionRun = {
  capture_id: string;
  declared_source_type: string;
  extraction_model: string;
  created_at: string;
  operational_note_id: string | null;
  facts: UniversalSurgicalFactRow[];
};

function mapCaptureRow(row: Record<string, unknown>): UniversalSurgicalFactCaptureRow {
  return {
    id: String(row.id),
    raw_note: String(row.raw_note ?? ""),
    declared_source_type: String(row.declared_source_type ?? ""),
    extraction_model: String(row.extraction_model ?? ""),
    extraction_ms: row.extraction_ms != null ? Number(row.extraction_ms) : null,
    provider_id: row.provider_id ? String(row.provider_id) : null,
    organization_id: row.organization_id ? String(row.organization_id) : null,
    case_id: row.case_id ? String(row.case_id) : null,
    encounter_id: row.encounter_id ? String(row.encounter_id) : null,
    operational_note_id: row.operational_note_id ? String(row.operational_note_id) : null,
    workflow_stage: row.workflow_stage ? String(row.workflow_stage) : null,
    product_context: row.product_context ? String(row.product_context) : null,
    created_at: String(row.created_at ?? ""),
  };
}

/**
 * When the capture window is smaller than total history, keep breadth across cases
 * first (newest capture per case), then fill remaining slots with other recent notes.
 * Input must be newest-first.
 */
export function selectCapturesPreferringCaseDiversity(
  captures: UniversalSurgicalFactCaptureRow[],
  limit: number,
): UniversalSurgicalFactCaptureRow[] {
  if (limit <= 0) return [];
  if (captures.length <= limit) return captures;

  const selected: UniversalSurgicalFactCaptureRow[] = [];
  const selectedIds = new Set<string>();
  const seenCases = new Set<string>();

  for (const capture of captures) {
    const caseKey = capture.case_id ? `case:${capture.case_id}` : `capture:${capture.id}`;
    if (seenCases.has(caseKey)) continue;
    seenCases.add(caseKey);
    selected.push(capture);
    selectedIds.add(capture.id);
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const capture of captures) {
      if (selectedIds.has(capture.id)) continue;
      selected.push(capture);
      selectedIds.add(capture.id);
      if (selected.length >= limit) break;
    }
  }

  return selected.sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
}

async function loadCapturesByScope(
  column: "provider_id" | "organization_id" | "case_id" | "encounter_id",
  entityId: string,
  limit = 25,
  options?: { diversifyByCase?: boolean },
): Promise<UniversalSurgicalFactCaptureRow[]> {
  const diversifyByCase = Boolean(options?.diversifyByCase);
  // Over-fetch so case-diverse selection can cover older cases that would otherwise
  // fall off a naive newest-N window when one case has many notes.
  const fetchLimit = diversifyByCase ? Math.min(Math.max(limit * 3, limit), 600) : limit;

  const { data, error } = await supabaseAdmin
    .from("universal_surgical_fact_captures")
    .select("*")
    .eq(column, entityId)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  if (error || !data) return [];
  const mapped = data.map((row) => mapCaptureRow(row as Record<string, unknown>));
  return diversifyByCase ? selectCapturesPreferringCaseDiversity(mapped, limit) : mapped.slice(0, limit);
}

async function loadCapturesForScopeQuery(
  input: ScopeQuery & { capture_limit?: number; diversify_by_case?: boolean },
): Promise<UniversalSurgicalFactCaptureRow[]> {
  const limit = input.capture_limit ?? 25;
  const diversify = { diversifyByCase: Boolean(input.diversify_by_case) };
  if (input.case_id) return loadCapturesByScope("case_id", input.case_id, limit);
  if (input.provider_id) {
    return loadCapturesByScope("provider_id", input.provider_id, limit, diversify);
  }
  if (input.encounter_id) return loadCapturesByScope("encounter_id", input.encounter_id, limit);
  if (input.organization_id) {
    return loadCapturesByScope("organization_id", input.organization_id, limit, diversify);
  }
  return [];
}

/** Group fact rows under their parent capture, preserving capture order (newest first). */
export function groupUniversalFactsByCapture(
  captures: UniversalSurgicalFactCaptureRow[],
  facts: UniversalSurgicalFactRow[],
): UniversalFactExtractionRun[] {
  const factsByCapture = new Map<string, UniversalSurgicalFactRow[]>();
  for (const fact of facts) {
    const bucket = factsByCapture.get(fact.capture_id) ?? [];
    bucket.push(fact);
    factsByCapture.set(fact.capture_id, bucket);
  }

  return captures.map((capture) => ({
    capture_id: capture.id,
    declared_source_type: capture.declared_source_type,
    extraction_model: capture.extraction_model,
    created_at: capture.created_at,
    operational_note_id: capture.operational_note_id,
    facts: factsByCapture.get(capture.id) ?? [],
  }));
}

/** Facts grouped by extraction run — newest run first, runs not merged. */
/** Load a single capture run by id — used to hydrate debrief review reopen (Phase 1). */
export async function loadUniversalFactsByCaptureId(
  captureId: string,
  opts?: { include_suppressed?: boolean },
): Promise<UniversalFactExtractionRun | null> {
  const { data: captureRow, error: captureError } = await supabaseAdmin
    .from("universal_surgical_fact_captures")
    .select("*")
    .eq("id", captureId)
    .maybeSingle();

  if (captureError || !captureRow) return null;

  let factsQuery = supabaseAdmin
    .from("universal_surgical_facts")
    .select("*")
    .eq("capture_id", captureId)
    .order("created_at", { ascending: true });

  if (!opts?.include_suppressed) {
    factsQuery = factsQuery.eq("suppressed", false);
  }

  const { data: factsData } = await factsQuery;
  const facts =
    factsData?.map((row) => mapFactRow(row as Record<string, unknown>)) ?? [];
  const capture = mapCaptureRow(captureRow as Record<string, unknown>);
  return groupUniversalFactsByCapture([capture], facts)[0] ?? null;
}

export async function loadUniversalFactsGroupedByCapture(
  input: ScopeQuery & { capture_limit?: number; diversify_by_case?: boolean },
): Promise<UniversalFactExtractionRun[]> {
  const captures = await loadCapturesForScopeQuery(input);
  if (captures.length === 0) return [];

  const captureIds = captures.map((capture) => capture.id);
  let factsQuery = supabaseAdmin
    .from("universal_surgical_facts")
    .select("*")
    .in("capture_id", captureIds)
    .order("created_at", { ascending: true });

  if (!input.include_suppressed) {
    factsQuery = factsQuery.eq("suppressed", false);
  }

  const { data, error } = await factsQuery;
  const facts = error || !data ? [] : data.map((row) => mapFactRow(row as Record<string, unknown>));

  return groupUniversalFactsByCapture(captures, facts);
}

const PROVIDER_FACTS_CHUNK = 200;

/** Batch-load recent UF rows for many providers (admin dashboards, roster summaries). */
export async function loadUniversalFactsForProviderIds(
  providerIds: string[],
  opts?: { include_suppressed?: boolean; limitPerProvider?: number; sinceDays?: number },
): Promise<Map<string, UniversalSurgicalFactRow[]>> {
  const out = new Map<string, UniversalSurgicalFactRow[]>();
  if (providerIds.length === 0) return out;

  const limitPerProvider = opts?.limitPerProvider ?? 12;
  const sinceDays = opts?.sinceDays ?? 90;
  const sinceIso = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  for (let i = 0; i < providerIds.length; i += PROVIDER_FACTS_CHUNK) {
    const slice = providerIds.slice(i, i + PROVIDER_FACTS_CHUNK);
    if (slice.length === 0) break;

    let query = supabaseAdmin
      .from("universal_surgical_facts")
      .select("*")
      .in("provider_id", slice)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(slice.length * limitPerProvider);

    if (!opts?.include_suppressed) {
      query = query.eq("suppressed", false);
    }

    const { data, error } = await query;
    if (error || !data) continue;

    for (const row of data) {
      const fact = mapFactRow(row as Record<string, unknown>);
      const pid = fact.provider_id ? String(fact.provider_id) : "";
      if (!pid) continue;
      const bucket = out.get(pid) ?? [];
      if (bucket.length >= limitPerProvider) continue;
      bucket.push(fact);
      out.set(pid, bucket);
    }
  }

  return out;
}

export async function loadUniversalFacts(input: ScopeQuery): Promise<UniversalSurgicalFactRow[]> {
  if (input.case_id) {
    return loadUniversalFactsForCase(input.case_id, input);
  }
  if (input.provider_id) {
    return loadUniversalFactsForProvider(input.provider_id, input);
  }
  if (input.encounter_id) {
    return loadUniversalFactsForEncounter(input.encounter_id, input);
  }
  if (input.organization_id) {
    return loadUniversalFactsForOrganization(input.organization_id, input);
  }
  return [];
}
