import { supabaseAdmin } from "@/lib/supabase/admin";
import { mergeWorkflowFieldValue } from "@/lib/surgical-sales/aiNoteCapture/workflowTargets";
import {
  intelligenceMetadataFromContact,
  mergeProviderWizardFieldsPatch,
} from "@/lib/surgical-sales/providerCreateWizard";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import {
  assertProviderIntelligenceWritableDbKey,
  isProviderIntelligenceDbKey,
} from "@/lib/surgical-sales/providerIntelligenceFields";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  applyIntelligenceFieldMetadataToPatch,
  type IntelligenceCaptureContext,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { discoveryIntelligenceDebug } from "@/lib/surgical-sales/discoveryIntelligenceDebug";
import type { PropagatedIntelligenceSignal } from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import { buildFieldSignalsFromCommit } from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import { buildAcceptedCommercialIntelligenceInput } from "@/lib/surgical-sales/filterAcceptedCommercialIntelligenceInput";
import { applyCommercialIntelligenceToContactPatch } from "@/lib/surgical-sales/applyCommercialIntelligenceToContactPatch";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  assertionAwareIntelligenceEnabled,
  resolveAssertionForCapture,
  resolveAssertionWrite,
  resolveFieldAssertion,
  type IntelligenceAssertion,
} from "@/lib/surgical-sales/intelligenceAssertion";

export type LogUpdateFieldPatch = {
  dbKey: string;
  value: string;
  mergeStrategy: "replace" | "append";
};

/** Extract intelligence field values from an already-loaded provider contact row. */
export function extractProviderIntelligenceFieldValuesFromRow(
  row: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    if (!key.startsWith("provider_") && key !== "influence_level") continue;
    const val = String(row[key] ?? "").trim();
    if (val) out[key] = val;
  }
  return out;
}

export async function loadProviderIntelligenceFieldValues(
  providerId: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (error || !data) return {};
  return extractProviderIntelligenceFieldValuesFromRow(data as Record<string, unknown>);
}

export async function applyLogUpdateToProvider(params: {
  providerId: string;
  actorUserId: string;
  actorName: string;
  sourceText: string;
  saveAsNote: boolean;
  fieldPatches: LogUpdateFieldPatch[];
  captureContext?: IntelligenceCaptureContext;
  fieldEvidence?: Record<string, string>;
  fieldSignals?: Record<string, PropagatedIntelligenceSignal>;
  atomicFacts?: DebriefAtomicFact[];
  proposedContacts?: DebriefProposedContactItem[];
}): Promise<{ ok: true; saved: number } | { ok: false; message: string }> {
  const { providerId, actorUserId, actorName, sourceText, saveAsNote, fieldPatches } = params;
  const captureContext: IntelligenceCaptureContext =
    params.captureContext ?? { source_type: "ai_capture", source_label: "Log update" };

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr || !existing) return { ok: false, message: loadErr?.message || "Provider not found." };
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return { ok: false, message: "Not a provider record." };
  }
  if (!(await repCanAccessContact(actorUserId, existing as never))) {
    return { ok: false, message: "Provider not found." };
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const organizationPlanning: Record<string, string> = {};
  const providerPlanning: Record<string, string> = {};
  let organizationFieldsTouched = 0;
  let providerFieldsTouched = 0;

  // Assertion-aware precedence (C2, flag-gated with C1 stamping): a
  // lower-assertion capture must never replace a higher-assertion field value.
  // Appends are allowed as context; replaces are blocked.
  const assertionAware = assertionAwareIntelligenceEnabled();
  const existingFieldMetadata = assertionAware
    ? intelligenceMetadataFromContact(existing as Record<string, unknown>)
    : {};
  const incomingAssertion = resolveAssertionForCapture(captureContext);
  const assertionSkips: Array<{
    dbKey: string;
    existing: IntelligenceAssertion;
    incoming: IntelligenceAssertion;
  }> = [];

  for (const fp of fieldPatches) {
    const isOrganizationField = isOrganizationIntelligenceDbKey(fp.dbKey);
    if (isOrganizationField) {
      // Organization intelligence is facility-wide; mirrored on contact until account storage ships.
    } else {
      try {
        assertProviderIntelligenceWritableDbKey(fp.dbKey);
      } catch (e: unknown) {
        return { ok: false, message: e instanceof Error ? e.message : "Invalid field." };
      }
      if (!isProviderIntelligenceDbKey(fp.dbKey)) {
        return { ok: false, message: `Unsupported intelligence field: ${fp.dbKey}` };
      }
    }

    const current = String((existing as Record<string, unknown>)[fp.dbKey] ?? "").trim();

    if (assertionAware && !isOrganizationField && current) {
      const existingAssertion = resolveFieldAssertion(existingFieldMetadata[fp.dbKey]);
      const verdict = resolveAssertionWrite({
        existing: existingAssertion,
        incoming: incomingAssertion,
        mergeStrategy: fp.mergeStrategy,
      });
      if (verdict === "blocked_downgrade") {
        assertionSkips.push({
          dbKey: fp.dbKey,
          existing: existingAssertion,
          incoming: incomingAssertion,
        });
        continue;
      }
    }

    const merged = mergeWorkflowFieldValue({
      existing: current,
      proposed: fp.value.trim(),
      mergeStrategy: fp.mergeStrategy,
    });
    if (merged !== current) {
      if (isOrganizationField) {
        organizationPlanning[fp.dbKey] = merged;
        organizationFieldsTouched += 1;
      } else {
        providerPlanning[fp.dbKey] = merged;
        providerFieldsTouched += 1;
      }
    }
  }

  if (assertionSkips.length > 0) {
    discoveryIntelligenceDebug("log-update:assertion-blocked-downgrades", {
      providerId,
      skips: assertionSkips,
    });
  }

  // Stamp evidence metadata even when the field value did not change.
  for (const fp of fieldPatches) {
    const quote = params.fieldEvidence?.[fp.dbKey]?.trim();
    if (!quote) continue;
    if (organizationPlanning[fp.dbKey] || providerPlanning[fp.dbKey]) continue;
    const current = String((existing as Record<string, unknown>)[fp.dbKey] ?? "").trim();
    if (!current) continue;
    if (isOrganizationIntelligenceDbKey(fp.dbKey)) {
      organizationPlanning[fp.dbKey] = current;
    } else if (isProviderIntelligenceDbKey(fp.dbKey)) {
      providerPlanning[fp.dbKey] = current;
    }
  }

  const fieldsTouched = organizationFieldsTouched + providerFieldsTouched;
  const planning = { ...organizationPlanning, ...providerPlanning };

  const fieldSignals =
    params.fieldSignals ??
    buildFieldSignalsFromCommit({
      sourceText,
      fieldPatches,
    });

  discoveryIntelligenceDebug("log-update:apply", {
    providerId,
    fieldPatches: fieldPatches.map((f) => f.dbKey),
    fieldEvidenceKeys: Object.keys(params.fieldEvidence ?? {}),
    providerPlanningKeys: Object.keys(providerPlanning),
    organizationPlanningKeys: Object.keys(organizationPlanning),
  });
  if (Object.keys(organizationPlanning).length > 0) {
    mergeProviderWizardFieldsPatch(patch, organizationPlanning, {
      captureContext: { ...captureContext, source_label: "Organization intelligence" },
      actor: { userId: actorUserId, userName: actorName },
      existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
      existingContact: existing as Record<string, unknown>,
      fieldEvidence: params.fieldEvidence,
      fieldSignals,
    });
  }

  if (Object.keys(providerPlanning).length > 0) {
    mergeProviderWizardFieldsPatch(patch, providerPlanning, {
      captureContext,
      actor: { userId: actorUserId, userName: actorName },
      existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
      existingContact: existing as Record<string, unknown>,
      fieldEvidence: params.fieldEvidence,
      fieldSignals,
    });
  }

  if (fieldPatches.length > 0 || (params.proposedContacts?.length ?? 0) > 0) {
    const commercialPatch = applyCommercialIntelligenceToContactPatch(
      { ...patch, ...(existing as Record<string, unknown>) },
      buildAcceptedCommercialIntelligenceInput({
        existingContact: existing as Record<string, unknown>,
        fieldPatches,
        logUpdate:
          params.atomicFacts != null
            ? ({ atomicFacts: params.atomicFacts, fieldUpdates: [] } as unknown as LogUpdateParseResult)
            : undefined,
        proposedContacts: params.proposedContacts,
        captureContext,
      }),
    );
    Object.assign(patch, {
      provider_commercial_intelligence: commercialPatch.provider_commercial_intelligence,
    });
  }

  if (Object.keys(planning).length > 0) {
    const { error: upErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .update(patch)
      .eq("id", providerId);
    if (upErr) return { ok: false, message: upErr.message };
    discoveryIntelligenceDebug("log-update:saved", {
      providerId,
      patchKeys: Object.keys(patch).filter((k) => k.startsWith("provider_") || k === "provider_intelligence_field_metadata"),
      hasMetadata: patch.provider_intelligence_field_metadata != null,
    });
  } else if (params.fieldEvidence && Object.keys(params.fieldEvidence).length > 0) {
    const evidencePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fieldValues: Record<string, string> = {};
    for (const fp of fieldPatches) {
      const quote = params.fieldEvidence[fp.dbKey]?.trim();
      if (!quote || !isProviderIntelligenceDbKey(fp.dbKey)) continue;
      const proposed = fp.value.trim();
      const current = String((existing as Record<string, unknown>)[fp.dbKey] ?? "").trim();
      const value = proposed || current;
      if (!value) continue;
      fieldValues[fp.dbKey] = value;
      if (!evidencePatch[fp.dbKey]) {
        evidencePatch[fp.dbKey] = value;
      }
    }
    if (Object.keys(fieldValues).length > 0) {
      if (patch.provider_commercial_intelligence) {
        evidencePatch.provider_commercial_intelligence = patch.provider_commercial_intelligence;
      }
      applyIntelligenceFieldMetadataToPatch(evidencePatch, {
        existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
        changedKeys: Object.keys(fieldValues),
        fieldValues,
        captureContext,
        actor: { userId: actorUserId, userName: actorName },
        fieldEvidence: params.fieldEvidence,
        fieldSignals,
      });
      const { error: upErr } = await supabaseAdmin
        .from("surgical_sales_contacts")
        .update(evidencePatch)
        .eq("id", providerId);
      if (upErr) return { ok: false, message: upErr.message };
      discoveryIntelligenceDebug("log-update:evidence-only-saved", {
        providerId,
        keys: Object.keys(fieldValues),
      });
      providerFieldsTouched += Object.keys(fieldValues).length;
    }
  } else if (patch.provider_commercial_intelligence) {
    const commercialPatch = {
      updated_at: new Date().toISOString(),
      provider_commercial_intelligence: patch.provider_commercial_intelligence,
    };
    const { error: upErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .update(commercialPatch)
      .eq("id", providerId);
    if (upErr) return { ok: false, message: upErr.message };
    discoveryIntelligenceDebug("log-update:commercial-intelligence-saved", { providerId });
    providerFieldsTouched += 1;
  }

  let saved = organizationFieldsTouched + providerFieldsTouched;

  const noteBody = sourceText.trim();
  if (saveAsNote && noteBody) {
    const stamped = `[${new Date().toLocaleString()}] ${noteBody}`;
    const prev = String((existing as { access_notes?: string | null }).access_notes || "").trim();
    const next = prev ? `${prev}\n${stamped}` : stamped;
    const { error: noteErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .update({ access_notes: next, updated_at: new Date().toISOString() })
      .eq("id", providerId);
    if (noteErr) return { ok: false, message: noteErr.message };

    const log = await logSurgicalProviderActivity({
      providerId,
      userId: actorUserId,
      activityType: "note_added",
      body: noteBody.slice(0, 2000),
      metadataJson: { log_update: true, field_patches: fieldPatches.length },
    });
    if (!log.ok) return { ok: false, message: log.message };
    saved += 1;
  } else if (fieldsTouched > 0) {
    const scopeLabel =
      organizationFieldsTouched > 0 && providerFieldsTouched > 0
        ? "intelligence"
        : organizationFieldsTouched > 0
          ? "organization intelligence"
          : "provider understanding";
    await logSurgicalProviderActivity({
      providerId,
      userId: actorUserId,
      activityType: "ai_note_capture",
      body: `Log update — ${fieldsTouched} ${scopeLabel} field${fieldsTouched === 1 ? "" : "s"} updated.`,
      metadataJson: {
        log_update: true,
        fields: fieldPatches.map((f) => f.dbKey),
        organization_fields: organizationFieldsTouched,
        provider_fields: providerFieldsTouched,
      },
    });
  }

  if (saved === 0) return { ok: false, message: "Nothing to save." };
  return { ok: true, saved };
}
