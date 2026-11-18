/**
 * Persist a category finding — merges mapped intelligence without exposing mapping to the rep.
 */

import { applyCommercialIntelligenceToContactPatch } from "@/lib/surgical-sales/applyCommercialIntelligenceToContactPatch";
import { buildAcceptedCommercialIntelligenceInput } from "@/lib/surgical-sales/filterAcceptedCommercialIntelligenceInput";
import { buildFieldSignalsFromCommit } from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { mapCategoryFinding } from "@/lib/surgical-sales/intelligenceCapture/mapCategoryFinding";
import {
  mergeIntelligenceFieldMetadata,
  type IntelligenceCaptureContext,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { isProviderIntelligenceDbKey } from "@/lib/surgical-sales/providerIntelligenceFields";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";

export type ApplyCategoryFindingResult =
  | {
      ok: true;
      confirmationMessage: string;
      followUpRequired: boolean;
      savedFields: number;
      provider: Record<string, unknown>;
    }
  | { ok: false; message: string };

export async function applyCategoryFindingToProvider(input: {
  providerId: string;
  categoryId: IntelligenceCaptureCategoryId;
  finding: string;
  actorUserId: string;
  actorName: string;
}): Promise<ApplyCategoryFindingResult> {
  const mapped = mapCategoryFinding({
    categoryId: input.categoryId,
    finding: input.finding,
  });
  if (!mapped) {
    return { ok: false, message: "Enter what you learned before saving." };
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (loadErr || !existing) {
    return { ok: false, message: loadErr?.message || "Provider not found." };
  }
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return { ok: false, message: "Not a provider record." };
  }
  if (!(await repCanAccessContact(input.actorUserId, existing as never))) {
    return { ok: false, message: "Provider not found." };
  }

  const captureContext: IntelligenceCaptureContext = {
    source_type: "profile",
    source_label: "Field intelligence",
  };

  const contactFields: Record<string, string> = {};
  for (const patch of mapped.fieldPatches) {
    if (!isProviderIntelligenceDbKey(patch.dbKey)) continue;
    const current = String((existing as Record<string, unknown>)[patch.dbKey] ?? "").trim();
    if (patch.mergeStrategy === "append" && current) {
      contactFields[patch.dbKey] = `${current}\n${patch.value.trim()}`.trim();
    } else {
      contactFields[patch.dbKey] = patch.value.trim();
    }
  }

  const existingMetadata =
    (existing as Record<string, unknown>).provider_intelligence_field_metadata;
  const metadata = mergeIntelligenceFieldMetadata({
    existing:
      typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
        ? (existingMetadata as never)
        : {},
    changedKeys: [...new Set([...Object.keys(contactFields), ...Object.keys(mapped.fieldEvidence)])],
    fieldValues: { ...(existing as Record<string, string>), ...contactFields },
    captureContext,
    actor: { userId: input.actorUserId, userName: input.actorName },
    fieldEvidence: mapped.fieldEvidence,
    fieldSignals: buildFieldSignalsFromCommit({
      sourceText: input.finding,
      fieldPatches: mapped.fieldPatches,
    }),
    fieldDiscoveryMapping: mapped.fieldDiscoveryMapping,
  });

  let patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    ...contactFields,
    provider_intelligence_field_metadata: metadata,
  };

  patch = applyCommercialIntelligenceToContactPatch(
    { ...patch, ...(existing as Record<string, unknown>) },
    buildAcceptedCommercialIntelligenceInput({
      existingContact: existing as Record<string, unknown>,
      fieldPatches: mapped.fieldPatches,
    }),
  );

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", input.providerId);
  if (upErr) return { ok: false, message: upErr.message };

  await logSurgicalProviderActivity({
    providerId: input.providerId,
    userId: input.actorUserId,
    activityType: "clinical_discovery_updated",
    body: `Field intelligence captured (${input.categoryId.replace(/_/g, " ")})`,
    metadataJson: { category_id: input.categoryId },
  }).catch(() => undefined);

  const { data: updated, error: reloadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (reloadErr || !updated) {
    return { ok: false, message: reloadErr?.message || "Could not reload provider." };
  }

  return {
    ok: true,
    confirmationMessage: mapped.confirmationMessage,
    followUpRequired: mapped.followUpRequired,
    savedFields: Object.keys(contactFields).length,
    provider: updated as Record<string, unknown>,
  };
}
