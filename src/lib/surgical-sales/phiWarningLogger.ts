import { supabaseAdmin } from "@/lib/supabase/admin";

export type SurgicalPhiWarningSurface =
  | "case_notes_patch"
  | "case_timeline_note"
  | "case_create_notes"
  | "document_upload_filename"
  | "ai_note_capture";

/**
 * Persists a non-blocking advisory row (kinds + surface only — no raw user text).
 * Swallows errors so callers are never blocked if the table is missing in an environment.
 */
export async function recordSurgicalPhiPatternEvent(params: {
  actorUserId: string;
  caseId: string | null;
  surface: SurgicalPhiWarningSurface;
  kinds: string[];
}): Promise<void> {
  if (!params.kinds.length) return;
  try {
    const { error } = await supabaseAdmin.from("surgical_sales_phi_warning_events").insert({
      actor_user_id: params.actorUserId,
      case_id: params.caseId,
      surface: params.surface,
      detected_kinds: params.kinds,
    });
    if (error) {
      console.warn("[surgical_phi_warning_log]", error.message, { surface: params.surface, kinds: params.kinds });
    }
  } catch (e) {
    console.warn("[surgical_phi_warning_log]", e instanceof Error ? e.message : "insert failed", {
      surface: params.surface,
      kinds: params.kinds,
    });
  }
}
