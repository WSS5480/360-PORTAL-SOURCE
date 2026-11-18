import { formatCaseIdentityProviderName } from "@/lib/surgical-sales/buildCaseIdentity";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { resolveProviderDisplayName } from "@/lib/surgical-sales/observationRepPresentationCopy";
import { runUniversalSurgicalExtractionAsync } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import {
  persistUniversalSurgicalFacts,
  resolveUniversalFactScope,
} from "@/lib/surgical-sales/universalExtractor/persistUniversalSurgicalFacts";
import type {
  UniversalDeclaredSourceType,
  UniversalExtractionResult,
  UniversalExtractorContext,
  UniversalExtractorInput,
} from "@/lib/surgical-sales/universalExtractor/types";
import { isUniversalSurgicalFactsEnabled } from "@/lib/surgical-sales/universalExtractor/universalExtractorFeatureFlag";

export function resolveUniversalFactProviderLabel(input: {
  context?: UniversalExtractorContext;
  caseRow?: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
}): string | null {
  const fromContext = String(input.context?.provider_display_name ?? "").trim();
  if (fromContext) return formatCaseIdentityProviderName(fromContext);

  const fromCase = resolveProviderDisplayName(input.caseRow ?? {});
  if (fromCase) return formatCaseIdentityProviderName(fromCase);

  if (input.providerContact) {
    const fromContact = contactDisplayName(
      input.providerContact as Parameters<typeof contactDisplayName>[0],
    );
    if (fromContact && fromContact !== "—") {
      return formatCaseIdentityProviderName(fromContact);
    }
  }

  return null;
}

export type UniversalCaptureEnvelope = {
  capture_id: string | null;
  fact_ids: string[];
  universal: UniversalExtractionResult;
  legacy_summary?: {
    pipeline: string;
    fact_count: number;
    concepts_or_types: string[];
  };
  persist_skipped?: boolean;
  persist_reason?: string;
};

export type UniversalShadowComparison = UniversalCaptureEnvelope;

/** Map production case/note context to universal declared source. */
export function mapCaseContextToUniversalSource(input: {
  case_type?: string | null;
  capture_mode?: string | null;
  is_debrief_validation?: boolean;
}): UniversalDeclaredSourceType {
  if (input.is_debrief_validation) return "debrief_validation";
  const caseType = String(input.case_type ?? "").trim().toLowerCase();
  if (caseType === "observation") return "observation_case";
  if (caseType === "product_support") return "product_support_case";
  return "discovery_note";
}

function summarizeLegacyExtraction(legacy: unknown): UniversalCaptureEnvelope["legacy_summary"] | undefined {
  if (!legacy || typeof legacy !== "object") return undefined;

  const record = legacy as Record<string, unknown>;

  if (Array.isArray(record.facts)) {
    return {
      pipeline: String(record.model ?? "observation-facts"),
      fact_count: record.facts.length,
      concepts_or_types: record.facts.map((f) => {
        const fact = f as { type?: string; value?: string };
        return `${fact.type ?? "unknown"}:${fact.value ?? ""}`;
      }),
    };
  }

  if (record.productSupport || record.observation) {
    const ps = record.productSupport as { findings?: Array<{ category?: string }> };
    const obs = record.observation as { entities?: Array<{ type?: string }> };
    const types = [
      ...(ps?.findings ?? []).map((f) => f.category ?? "product_support"),
      ...(obs?.entities ?? []).map((e) => e.type ?? "entity"),
    ];
    return {
      pipeline: "product_support_dual",
      fact_count: types.length,
      concepts_or_types: types,
    };
  }

  return undefined;
}

/**
 * Extract canonical universal facts and persist to dedicated tables.
 * Does not mutate or replace legacy provider/case/debrief intelligence.
 */
export async function captureUniversalSurgicalIntelligence(input: {
  raw_note: string;
  declared_source_type: UniversalDeclaredSourceType;
  context?: UniversalExtractorContext;
  caseRow?: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  operational_note_id?: string | null;
  created_by_user_id?: string | null;
  legacy_extraction?: unknown;
}): Promise<UniversalCaptureEnvelope | null> {
  if (!isUniversalSurgicalFactsEnabled()) return null;

  const providerLabel = resolveUniversalFactProviderLabel({
    context: input.context,
    caseRow: input.caseRow,
    providerContact: input.providerContact,
  });
  const context: UniversalExtractorContext = {
    ...input.context,
    ...(providerLabel ? { provider_display_name: providerLabel } : {}),
  };

  const universal = await runUniversalSurgicalExtractionAsync(
    {
      raw_note: input.raw_note,
      declared_source_type: input.declared_source_type,
      context,
    },
    { providerLabel },
  );

  const legacy_summary = summarizeLegacyExtraction(input.legacy_extraction);
  const scope = resolveUniversalFactScope({
    context: input.context,
    operational_note_id: input.operational_note_id,
    caseRow: input.caseRow,
  });

  const userId = String(input.created_by_user_id ?? "").trim();
  let capture_id: string | null = null;
  let fact_ids: string[] = [];
  let persist_skipped = false;
  let persist_reason: string | undefined;

  if (userId) {
    const persisted = await persistUniversalSurgicalFacts({
      extraction: universal,
      scope,
      created_by_user_id: userId,
      legacy_extraction_summary: legacy_summary ?? null,
    });

    if (persisted.ok) {
      capture_id = persisted.capture_id;
      fact_ids = persisted.fact_ids;
    } else if (persisted.skipped) {
      persist_skipped = true;
      persist_reason = persisted.reason;
    } else {
      console.error("[universal surgical facts persist]", persisted.message);
      persist_skipped = true;
      persist_reason = persisted.message;
    }
  } else {
    persist_skipped = true;
    persist_reason = "no_user";
  }

  return {
    capture_id,
    fact_ids,
    universal,
    ...(legacy_summary ? { legacy_summary } : {}),
    ...(persist_skipped ? { persist_skipped, persist_reason } : {}),
  };
}

/** @deprecated Use captureUniversalSurgicalIntelligence — sync wrapper returns null; callers must use async. */
export function runUniversalExtractorShadow(input: {
  raw_note: string;
  declared_source_type: UniversalDeclaredSourceType;
  context?: UniversalExtractorInput["context"];
  legacy_extraction?: unknown;
}): null {
  void input;
  return null;
}

/** Attach universal capture reference to note AI envelope without affecting legacy readers. */
export function attachUniversalCaptureToNoteEnvelope(
  envelope: Record<string, unknown>,
  capture: UniversalCaptureEnvelope | null,
): Record<string, unknown> {
  if (!capture) return envelope;
  return {
    ...envelope,
    universal_capture: capture,
    /** Legacy key retained for comparison tooling. */
    universal_shadow: capture,
  };
}

/** @deprecated Use attachUniversalCaptureToNoteEnvelope */
export function attachUniversalShadowToNoteEnvelope(
  envelope: Record<string, unknown>,
  shadow: UniversalCaptureEnvelope | null,
): Record<string, unknown> {
  return attachUniversalCaptureToNoteEnvelope(envelope, shadow);
}
