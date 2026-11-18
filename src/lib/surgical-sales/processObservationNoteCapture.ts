import { persistOperationalNoteAiExtraction } from "@/lib/notes/persistOperationalNoteAiExtraction";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";

import {
  observationExtractionFromFactExtraction,
} from "@/lib/surgical-sales/fieldObservationIntelligence";

import { extractObservationFactsHybrid } from "@/lib/surgical-sales/observationIntelligence/extractObservationFactsHybrid";

import { extractObservationFactsV2 } from "@/lib/surgical-sales/observationIntelligence/extractObservationFactsV2";

import { mergeFactsIntoStoredIntelligence } from "@/lib/surgical-sales/observationIntelligence/factsToLegacyEntities";

import { isObservationAiFirstExtractionEnabled } from "@/lib/surgical-sales/observationIntelligence/observationPilotFlags";

import type {
  ObservationFact,
  ObservationFactExtraction,
  ObservationPromotionSkip,
} from "@/lib/surgical-sales/observationIntelligence/observationFactTypes";

import { acceptedObservationFacts } from "@/lib/surgical-sales/observationIntelligence/validateObservationFacts";

import { mergeObservationNoteIntoCaseSnapshot } from "@/lib/surgical-sales/mergeObservationCaseIntelligenceSnapshot";

import { buildLiveObservationPatchesFromExtraction } from "@/lib/surgical-sales/observationNoteEntityMapping";

import {
  buildOpportunityIntelligencePromotionFromObservationExtraction,
  mergeOpportunityIntelligenceContactPatch,
} from "@/lib/surgical-sales/promoteOpportunityIntelligenceFromObservation";

import {
  applyIntelligenceFieldMetadataToPatch,
  parseProviderIntelligenceFieldMetadata,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  attachUniversalCaptureToNoteEnvelope,
  captureUniversalSurgicalIntelligence,
  mapCaseContextToUniversalSource,
  type UniversalCaptureEnvelope,
} from "@/lib/surgical-sales/universalExtractor";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { formatCaseIdentityProviderName } from "@/lib/surgical-sales/buildCaseIdentity";
import { resolveProviderDisplayName } from "@/lib/surgical-sales/observationRepPresentationCopy";

export type ObservationNoteCaptureResult = {
  extraction: ReturnType<typeof observationExtractionFromFactExtraction>;
  factExtraction: ObservationFactExtraction;
  liveFieldPatches: Record<string, string>;
  universalCapture: UniversalCaptureEnvelope | null;
};

async function attachAiExtractionToCaseActivity(input: {
  caseId: string;
  noteId: string;
  legacyCaseActivityId?: string | null;
  storedIntelligence: Record<string, unknown>;
}): Promise<void> {
  let activityId = String(input.legacyCaseActivityId ?? "").trim();

  if (!activityId) {
    const { data: rows } = await supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("id, metadata_json")
      .eq("case_id", input.caseId)
      .order("created_at", { ascending: false })
      .limit(30);

    const match = (rows ?? []).find((row) => {
      const metadata = row.metadata_json;
      if (!metadata || typeof metadata !== "object") return false;
      return String((metadata as Record<string, unknown>).note_id ?? "") === input.noteId;
    });

    activityId = match?.id ? String(match.id) : "";
  }

  if (!activityId) return;

  const { data: activityRow } = await supabaseAdmin
    .from("surgical_sales_case_activities")
    .select("metadata_json")
    .eq("id", activityId)
    .maybeSingle();

  const metadata =
    activityRow?.metadata_json && typeof activityRow.metadata_json === "object"
      ? (activityRow.metadata_json as Record<string, unknown>)
      : {};

  await supabaseAdmin
    .from("surgical_sales_case_activities")
    .update({
      metadata_json: {
        ...metadata,
        note_id: input.noteId,
        ai_extraction: input.storedIntelligence,
        intelligence_processing: false,
      },
    })
    .eq("id", activityId);
}

export async function processObservationNoteCapture(input: {
  caseId: string;
  caseRow: Record<string, unknown>;
  noteId: string;
  noteBody: string;
  legacyCaseActivityId?: string | null;
  capturedByUserId?: string | null;
}): Promise<ObservationNoteCaptureResult | null> {
  if (!isSurgicalObservationCase(input.caseRow.case_type as string | null | undefined)) {
    return null;
  }

  const aiFirstEnabled = isObservationAiFirstExtractionEnabled();

  const factExtraction = aiFirstEnabled
    ? await extractObservationFactsV2(input.noteBody)
    : await extractObservationFactsHybrid(input.noteBody);

  const isValidatedExtraction = Boolean(factExtraction.validation_version);

  // §4 single choke point: every downstream adapter (legacy entities, snapshot,
  // live fields, provider promotion) sees accepted facts only. The persisted
  // envelope keeps the full fact set (suppressed included) for auditability.
  const downstreamEnvelope: ObservationFactExtraction = isValidatedExtraction
    ? { ...factExtraction, facts: acceptedObservationFacts(factExtraction.facts) }
    : factExtraction;

  const storedIntelligence: Record<string, unknown> = isValidatedExtraction
    ? {
        ...mergeFactsIntoStoredIntelligence(downstreamEnvelope),
        facts: factExtraction.facts,
        validation_version: factExtraction.validation_version,
        extraction_ms: factExtraction.extraction_ms,
        legacy_facts: factExtraction.legacy_facts,
      }
    : mergeFactsIntoStoredIntelligence(factExtraction);

  const extraction = observationExtractionFromFactExtraction(downstreamEnvelope);
  const snapshot = mergeObservationNoteIntoCaseSnapshot(
    input.caseRow.observation_workflow_intelligence_snapshot,
    extraction,
  );
  const liveFieldPatches = buildLiveObservationPatchesFromExtraction(extraction, input.caseRow);

  const noteEnvelope: Record<string, unknown> = isValidatedExtraction
    ? {
        ...extraction,
        facts: factExtraction.facts,
        model: factExtraction.model,
        extractedAt: factExtraction.extractedAt,
        validation_version: factExtraction.validation_version,
        extraction_ms: factExtraction.extraction_ms,
        legacy_facts: factExtraction.legacy_facts,
      }
    : {
        ...extraction,
        facts: factExtraction.facts,
        model: factExtraction.model,
        extractedAt: factExtraction.extractedAt,
      };

  const providerId = String(input.caseRow.surgeon_contact_id ?? "").trim();
  let providerRow: Record<string, unknown> | null = null;
  if (providerId) {
    const { data } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("*")
      .eq("id", providerId)
      .maybeSingle();
    providerRow = (data as Record<string, unknown> | null) ?? null;
  }

  const providerLabel =
    (providerRow
      ? formatCaseIdentityProviderName(
          contactDisplayName(providerRow as Parameters<typeof contactDisplayName>[0]),
        )
      : null) ||
    formatCaseIdentityProviderName(resolveProviderDisplayName(input.caseRow) ?? "") ||
    null;

  const universalCapture = await captureUniversalSurgicalIntelligence({
    raw_note: input.noteBody,
    declared_source_type: mapCaseContextToUniversalSource({
      case_type: String(input.caseRow.case_type ?? "observation"),
    }),
    context: {
      case_id: input.caseId,
      provider_id: providerId || undefined,
      organization_id: String(input.caseRow.account_id ?? "").trim() || undefined,
      encounter_id: String(input.caseRow.engagement_id ?? "").trim() || undefined,
      product_context: String(input.caseRow.procedure_type ?? "").trim() || undefined,
      ...(providerLabel ? { provider_display_name: providerLabel } : {}),
    },
    caseRow: input.caseRow,
    providerContact: providerRow,
    operational_note_id: input.noteId,
    created_by_user_id: input.capturedByUserId ?? null,
    legacy_extraction: factExtraction,
  });

  const persistedEnvelope = attachUniversalCaptureToNoteEnvelope(noteEnvelope, universalCapture);

  await persistOperationalNoteAiExtraction(input.noteId, persistedEnvelope);

  await supabaseAdmin
    .from("surgical_sales_cases")
    .update({
      observation_workflow_intelligence_snapshot: snapshot,
      ...liveFieldPatches,
    })
    .eq("id", input.caseId);

  await attachAiExtractionToCaseActivity({
    caseId: input.caseId,
    noteId: input.noteId,
    legacyCaseActivityId: input.legacyCaseActivityId,
    storedIntelligence: universalCapture
      ? {
          ...storedIntelligence,
          universal_capture: universalCapture,
          universal_shadow: universalCapture,
        }
      : storedIntelligence,
  });

  if (providerId && providerRow) {
      const { patches, skips } = buildOpportunityIntelligencePromotionFromObservationExtraction(
        extraction,
        providerRow as Record<string, unknown>,
      );
      const merged = mergeOpportunityIntelligenceContactPatch(
        providerRow as Record<string, unknown>,
        patches,
      );
      const patchBody = Object.fromEntries(
        patches.map((patch) => [patch.dbKey, merged[patch.dbKey]]),
      );
      if (Object.keys(patchBody).length > 0) {
        // Stamp attribution (source, declared source, assertion) on promoted
        // fields — promotion previously wrote values with no metadata trail.
        applyIntelligenceFieldMetadataToPatch(patchBody, {
          existingMetadata: parseProviderIntelligenceFieldMetadata(
            (providerRow as Record<string, unknown>).provider_intelligence_field_metadata,
          ),
          changedKeys: patches.map((patch) => patch.dbKey),
          fieldValues: Object.fromEntries(
            patches.map((patch) => [patch.dbKey, String(merged[patch.dbKey] ?? "")]),
          ),
          captureContext: {
            source_type: "observation",
            source_label: "Observation case promotion",
            source_case_id: input.caseId,
            declared_source_type: "observation_case",
          },
          actor: { userId: "system", userName: "Observation promotion" },
        });
        await supabaseAdmin.from("surgical_sales_contacts").update(patchBody).eq("id", providerId);
      }

      // §5b blocked-promotion logging — v2 only, persisted on the note envelope
      // and the activity ai_extraction so daily diff review can see them.
      if (isValidatedExtraction && skips.length > 0) {
        const promotionSkips: ObservationPromotionSkip[] = skips;
        await persistOperationalNoteAiExtraction(input.noteId, {
          ...noteEnvelope,
          promotion_skips: promotionSkips,
        });
        await attachAiExtractionToCaseActivity({
          caseId: input.caseId,
          noteId: input.noteId,
          legacyCaseActivityId: input.legacyCaseActivityId,
          storedIntelligence: { ...storedIntelligence, promotion_skips: promotionSkips },
        });
      }
  }

  return {
    extraction,
    factExtraction,
    liveFieldPatches: liveFieldPatches as Record<string, string>,
    universalCapture,
  };
}

export type { ObservationFact, ObservationFactExtraction };
