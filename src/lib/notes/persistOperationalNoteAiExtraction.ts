import { supabaseAdmin } from "@/lib/supabase/admin";

function isMissingAiExtractionColumn(message: string): boolean {
  return /ai_extraction_json does not exist/i.test(message);
}

/** Persist note extraction when the column exists; no-op if migration not applied yet. */
export async function persistOperationalNoteAiExtraction(
  noteId: string,
  extraction: unknown,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("sales_operational_notes")
    .update({ ai_extraction_json: extraction })
    .eq("id", noteId);

  if (error && !isMissingAiExtractionColumn(error.message ?? "")) {
    throw new Error(error.message);
  }
}
