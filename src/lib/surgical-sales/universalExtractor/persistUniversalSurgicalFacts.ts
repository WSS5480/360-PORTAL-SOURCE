import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  UniversalExtractionResult,
  UniversalExtractorContext,
  UniversalSurgicalFact,
} from "@/lib/surgical-sales/universalExtractor/types";

export type UniversalFactScope = {
  provider_id?: string | null;
  organization_id?: string | null;
  case_id?: string | null;
  encounter_id?: string | null;
  operational_note_id?: string | null;
  workflow_stage?: string | null;
  product_context?: string | null;
};

export type PersistUniversalSurgicalFactsInput = {
  extraction: UniversalExtractionResult;
  scope: UniversalFactScope;
  created_by_user_id: string;
  legacy_extraction_summary?: Record<string, unknown> | null;
};

export type PersistUniversalSurgicalFactsResult =
  | { ok: true; capture_id: string; fact_ids: string[] }
  | { ok: false; skipped: true; reason: "disabled" | "missing_table" | "no_user" }
  | { ok: false; skipped: false; message: string };

function isMissingUniversalFactsTable(message: string): boolean {
  return /universal_surgical_fact/i.test(message) && /does not exist/i.test(message);
}

function normalizeUuid(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export function buildUniversalFactRows(
  captureId: string,
  scope: UniversalFactScope,
  facts: UniversalSurgicalFact[],
  suppressed: boolean,
): Array<Record<string, unknown>> {
  const providerId = normalizeUuid(scope.provider_id);
  const organizationId = normalizeUuid(scope.organization_id);
  const caseId = normalizeUuid(scope.case_id);
  const encounterId = normalizeUuid(scope.encounter_id);

  return facts.map((fact) => ({
    capture_id: captureId,
    provider_id: providerId,
    organization_id: organizationId,
    case_id: caseId,
    encounter_id: encounterId,
    concept: fact.concept,
    normalized_label: fact.normalized_label,
    assertion_level: fact.assertion_level,
    source_type: fact.source_type,
    evidence_text: fact.evidence_text,
    confidence: fact.confidence,
    negated: fact.negated,
    uncertain: fact.uncertain,
    suppressed,
    product_mentioned: fact.product_mentioned ?? null,
    person_mentioned: fact.person_mentioned ?? null,
    item_mentioned: fact.item_mentioned ?? null,
    notes: fact.notes ?? null,
  }));
}

export function resolveUniversalFactScope(input: {
  context?: UniversalExtractorContext;
  operational_note_id?: string | null;
  caseRow?: Record<string, unknown>;
}): UniversalFactScope {
  const caseRow = input.caseRow ?? {};
  return {
    provider_id:
      normalizeUuid(input.context?.provider_id) ??
      normalizeUuid(caseRow.surgeon_contact_id as string | null | undefined),
    organization_id:
      normalizeUuid(input.context?.organization_id) ??
      normalizeUuid(caseRow.account_id as string | null | undefined),
    case_id:
      normalizeUuid(input.context?.case_id) ?? normalizeUuid(caseRow.id as string | null | undefined),
    encounter_id:
      normalizeUuid(input.context?.encounter_id) ??
      normalizeUuid(caseRow.engagement_id as string | null | undefined),
    operational_note_id: normalizeUuid(input.operational_note_id),
    workflow_stage: input.context?.workflow_stage ?? null,
    product_context:
      input.context?.product_context ??
      (String(caseRow.procedure_type ?? "").trim() || null),
  };
}

function isOrganizationFkViolation(message: string): boolean {
  return /organization_id_fkey/i.test(message);
}

function scopeWithoutOrganization(scope: UniversalFactScope): UniversalFactScope {
  return { ...scope, organization_id: null };
}

async function insertUniversalCaptureRow(input: {
  extraction: UniversalExtractionResult;
  scope: UniversalFactScope;
  userId: string;
  legacy_extraction_summary?: Record<string, unknown> | null;
}): Promise<
  | { ok: true; captureId: string }
  | { ok: false; skipped: true; reason: "missing_table" }
  | { ok: false; skipped: false; message: string }
> {
  const { extraction, scope, userId, legacy_extraction_summary } = input;

  const { data: captureRow, error: captureErr } = await supabaseAdmin
    .from("universal_surgical_fact_captures")
    .insert({
      raw_note: extraction.raw_note,
      declared_source_type: extraction.declared_source_type,
      extraction_model: extraction.model,
      extraction_ms: extraction.extraction_ms,
      provider_id: normalizeUuid(scope.provider_id),
      organization_id: normalizeUuid(scope.organization_id),
      case_id: normalizeUuid(scope.case_id),
      encounter_id: normalizeUuid(scope.encounter_id),
      operational_note_id: normalizeUuid(scope.operational_note_id),
      workflow_stage: scope.workflow_stage ?? null,
      product_context: scope.product_context ?? null,
      legacy_extraction_summary: legacy_extraction_summary ?? null,
      created_by_user_id: userId,
    })
    .select("id")
    .single();

  if (captureErr || !captureRow?.id) {
    if (isMissingUniversalFactsTable(captureErr?.message ?? "")) {
      return { ok: false, skipped: true, reason: "missing_table" };
    }
    return { ok: false, skipped: false, message: captureErr?.message ?? "Capture insert failed" };
  }

  return { ok: true, captureId: String(captureRow.id) };
}

/** Persist canonical facts to dedicated tables — never touches legacy intelligence SOR. */
export async function persistUniversalSurgicalFacts(
  input: PersistUniversalSurgicalFactsInput,
): Promise<PersistUniversalSurgicalFactsResult> {
  const userId = String(input.created_by_user_id ?? "").trim();
  if (!userId) {
    return { ok: false, skipped: true, reason: "no_user" };
  }

  let scope = input.scope;
  let captureInsert = await insertUniversalCaptureRow({
    extraction: input.extraction,
    scope,
    userId,
    legacy_extraction_summary: input.legacy_extraction_summary,
  });

  if (
    !captureInsert.ok &&
    !captureInsert.skipped &&
    isOrganizationFkViolation(captureInsert.message) &&
    normalizeUuid(scope.organization_id)
  ) {
    scope = scopeWithoutOrganization(scope);
    captureInsert = await insertUniversalCaptureRow({
      extraction: input.extraction,
      scope,
      userId,
      legacy_extraction_summary: input.legacy_extraction_summary,
    });
  }

  if (!captureInsert.ok) {
    if (captureInsert.skipped) {
      return { ok: false, skipped: true, reason: captureInsert.reason };
    }
    return { ok: false, skipped: false, message: captureInsert.message };
  }

  const captureId = captureInsert.captureId;
  const allFactRows = [
    ...buildUniversalFactRows(captureId, scope, input.extraction.facts, false),
    ...buildUniversalFactRows(captureId, scope, input.extraction.suppressed_facts, true),
  ];

  if (allFactRows.length === 0) {
    return { ok: true, capture_id: captureId, fact_ids: [] };
  }

  const { data: factInserts, error: factsErr } = await supabaseAdmin
    .from("universal_surgical_facts")
    .insert(allFactRows)
    .select("id");

  if (factsErr) {
    await supabaseAdmin.from("universal_surgical_fact_captures").delete().eq("id", captureId);
    if (isMissingUniversalFactsTable(factsErr.message ?? "")) {
      return { ok: false, skipped: true, reason: "missing_table" };
    }
    if (isOrganizationFkViolation(factsErr.message ?? "") && normalizeUuid(input.scope.organization_id)) {
      const retryScope = scopeWithoutOrganization(scope);
      const retryRows = [
        ...buildUniversalFactRows(captureId, retryScope, input.extraction.facts, false),
        ...buildUniversalFactRows(captureId, retryScope, input.extraction.suppressed_facts, true),
      ];
      const { data: retryInserts, error: retryErr } = await supabaseAdmin
        .from("universal_surgical_facts")
        .insert(retryRows)
        .select("id");
      if (!retryErr) {
        return {
          ok: true,
          capture_id: captureId,
          fact_ids: (retryInserts ?? []).map((row) => String((row as { id: string }).id)),
        };
      }
    }
    return { ok: false, skipped: false, message: factsErr.message };
  }

  return {
    ok: true,
    capture_id: captureId,
    fact_ids: (factInserts ?? []).map((row) => String((row as { id: string }).id)),
  };
}

export type PurgeUniversalSurgicalFactsForOperationalNoteResult =
  | { ok: true; deleted_capture_count: number }
  | { ok: false; message: string };

/** Remove UF capture runs (and cascaded facts) tied to a deleted operational note. */
export async function purgeUniversalSurgicalFactsForOperationalNote(
  operationalNoteId: string,
): Promise<PurgeUniversalSurgicalFactsForOperationalNoteResult> {
  const noteId = normalizeUuid(operationalNoteId);
  if (!noteId) {
    return { ok: true, deleted_capture_count: 0 };
  }

  const { data: captures, error: selectErr } = await supabaseAdmin
    .from("universal_surgical_fact_captures")
    .select("id")
    .eq("operational_note_id", noteId);

  if (selectErr) {
    if (isMissingUniversalFactsTable(selectErr.message ?? "")) {
      return { ok: true, deleted_capture_count: 0 };
    }
    return { ok: false, message: selectErr.message };
  }

  const captureCount = (captures ?? []).length;
  if (captureCount === 0) {
    return { ok: true, deleted_capture_count: 0 };
  }

  const { error: deleteErr } = await supabaseAdmin
    .from("universal_surgical_fact_captures")
    .delete()
    .eq("operational_note_id", noteId);

  if (deleteErr) {
    if (isMissingUniversalFactsTable(deleteErr.message ?? "")) {
      return { ok: true, deleted_capture_count: 0 };
    }
    return { ok: false, message: deleteErr.message };
  }

  return { ok: true, deleted_capture_count: captureCount };
}
