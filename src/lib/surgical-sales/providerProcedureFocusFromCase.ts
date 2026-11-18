import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseClinicalStorageValue } from "@/lib/surgical-sales/debriefClinicalFactExtraction";

function pushExistingProcedureSegment(raw: string, push: (value: string) => void) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  const parsed = parseClinicalStorageValue(trimmed);
  if (parsed?.procedureFocus) {
    const focus = parsed.procedureFocus.trim();
    if (focus && !/[·•]/.test(focus) && !/[a-z][A-Z]/.test(focus)) {
      push(focus);
    }
    return;
  }

  if (/[·•]/.test(trimmed)) return;
  if (/[a-z][A-Z]/.test(trimmed)) return;
  push(trimmed);
}

/** Merge rep-entered case procedure text into provider_procedure_focus (pipe-separated). */
export function mergeRepEnteredProcedureFocus(
  existing: string | null | undefined,
  incoming: string,
): string {
  const trimmed = incoming.trim();
  if (!trimmed) return String(existing ?? "").trim();

  const seen = new Set<string>();
  const segments: string[] = [];

  const push = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    segments.push(value);
  };

  const existingRaw = String(existing ?? "").trim();
  if (existingRaw) {
    for (const part of existingRaw.split(/\||\n/)) {
      pushExistingProcedureSegment(part, push);
    }
  }

  push(trimmed);
  return segments.join(" | ");
}

export async function persistProviderProcedureFocusFromCaseEntry(input: {
  providerId: string;
  procedureType: string;
}): Promise<{ ok: true; merged: string } | { ok: false; message: string }> {
  const providerId = input.providerId.trim();
  const procedureType = input.procedureType.trim();
  if (!providerId || !procedureType) {
    return { ok: false, message: "Missing provider or procedure." };
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, provider_procedure_focus")
    .eq("id", providerId)
    .maybeSingle();

  if (loadErr || !existing) {
    return { ok: false, message: loadErr?.message || "Provider not found." };
  }

  const existingFocus = String(
    (existing as { provider_procedure_focus?: string | null }).provider_procedure_focus ?? "",
  ).trim();
  const merged = mergeRepEnteredProcedureFocus(existingFocus, procedureType);
  if (merged === existingFocus) return { ok: true, merged };

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      provider_procedure_focus: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);

  if (upErr) return { ok: false, message: upErr.message };
  return { ok: true, merged };
}
