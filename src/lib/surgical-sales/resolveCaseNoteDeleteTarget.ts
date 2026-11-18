import { supabaseAdmin } from "@/lib/supabase/admin";

export type CaseNoteDeleteTarget = {
  operationalNoteId: string | null;
  activityId: string | null;
  noteBody: string;
  /** Stored extraction envelope of the note being deleted (§6b rebuild gate). */
  noteAiExtraction: unknown | null;
};

type OperationalNoteRow = {
  id: string;
  body?: string | null;
  case_id?: string | null;
  legacy_case_activity_id?: string | null;
  ai_extraction_json?: unknown | null;
};

type CaseActivityRow = {
  id: string;
  body?: string | null;
  activity_type?: string | null;
  metadata_json?: Record<string, unknown> | null;
};

function readMetadataNoteId(metadata: Record<string, unknown> | null | undefined): string {
  return String(metadata?.note_id ?? "").trim();
}

function isNoteActivity(row: CaseActivityRow): boolean {
  return String(row.activity_type ?? "").trim().toLowerCase() === "note";
}

/** Resolve a delete request id to an operational note and/or legacy case activity row. */
export async function resolveCaseNoteDeleteTarget(input: {
  caseId: string;
  noteId: string;
}): Promise<CaseNoteDeleteTarget | null> {
  const { data: noteRow, error: noteErr } = await supabaseAdmin
    .from("sales_operational_notes")
    .select("*")
    .eq("id", input.noteId)
    .maybeSingle();

  if (noteErr) {
    throw new Error(noteErr.message);
  }

  if (noteRow) {
    const row = noteRow as OperationalNoteRow;
    if (String(row.case_id ?? "") !== input.caseId) return null;
    return {
      operationalNoteId: row.id,
      activityId: String(row.legacy_case_activity_id ?? "").trim() || null,
      noteBody: String(row.body ?? "").trim(),
      noteAiExtraction: row.ai_extraction_json ?? null,
    };
  }

  const { data: activityById, error: activityByIdErr } = await supabaseAdmin
    .from("surgical_sales_case_activities")
    .select("id, body, activity_type, metadata_json")
    .eq("id", input.noteId)
    .eq("case_id", input.caseId)
    .maybeSingle();

  if (activityByIdErr) {
    throw new Error(activityByIdErr.message);
  }

  if (activityById && isNoteActivity(activityById as CaseActivityRow)) {
    const activity = activityById as CaseActivityRow;
    const linkedNoteId = readMetadataNoteId(activity.metadata_json ?? null);
    return {
      operationalNoteId: linkedNoteId || null,
      activityId: activity.id,
      noteBody: String(activity.body ?? "").trim(),
      noteAiExtraction: activity.metadata_json?.ai_extraction ?? null,
    };
  }

  const { data: caseActivities, error: activitiesErr } = await supabaseAdmin
    .from("surgical_sales_case_activities")
    .select("id, body, activity_type, metadata_json")
    .eq("case_id", input.caseId);

  if (activitiesErr) {
    throw new Error(activitiesErr.message);
  }

  const linkedActivity = (caseActivities ?? []).find((row) => {
    const activity = row as CaseActivityRow;
    if (!isNoteActivity(activity)) return false;
    return readMetadataNoteId(activity.metadata_json ?? null) === input.noteId;
  }) as CaseActivityRow | undefined;

  if (!linkedActivity) return null;

  return {
    operationalNoteId: input.noteId,
    activityId: linkedActivity.id,
    noteBody: String(linkedActivity.body ?? "").trim(),
    noteAiExtraction: linkedActivity.metadata_json?.ai_extraction ?? null,
  };
}

export type RemainingCaseNote = {
  body: string;
  /** Stored extraction envelope for the note (§6b rebuild gate). */
  aiExtraction: unknown | null;
};

/** Remaining notes (body + stored extraction) for intelligence rebuild after delete. */
export async function collectRemainingCaseNotes(input: {
  caseId: string;
  excludeOperationalNoteId?: string | null;
  excludeActivityId?: string | null;
}): Promise<RemainingCaseNote[]> {
  const { data: operationalNotes, error: notesErr } = await supabaseAdmin
    .from("sales_operational_notes")
    .select("*")
    .eq("case_id", input.caseId)
    .order("created_at", { ascending: true });

  if (notesErr) {
    throw new Error(notesErr.message);
  }

  const linkedActivityIds = new Set(
    (operationalNotes ?? [])
      .map((row) => String((row as { legacy_case_activity_id?: string | null }).legacy_case_activity_id ?? "").trim())
      .filter(Boolean),
  );

  const operationalRemaining: RemainingCaseNote[] = (operationalNotes ?? [])
    .filter((row) => String((row as { id: string }).id) !== input.excludeOperationalNoteId)
    .map((row) => ({
      body: String((row as { body?: string }).body ?? "").trim(),
      aiExtraction: (row as { ai_extraction_json?: unknown }).ai_extraction_json ?? null,
    }))
    .filter((note) => Boolean(note.body));

  if (operationalRemaining.length > 0 || (operationalNotes ?? []).length > 0) {
    return operationalRemaining;
  }

  const { data: activities, error: activitiesErr } = await supabaseAdmin
    .from("surgical_sales_case_activities")
    .select("id, body, activity_type, created_at, metadata_json")
    .eq("case_id", input.caseId)
    .order("created_at", { ascending: true });

  if (activitiesErr) {
    throw new Error(activitiesErr.message);
  }

  return (activities ?? [])
    .filter((row) => String((row as { activity_type?: string }).activity_type ?? "").trim().toLowerCase() === "note")
    .filter((row) => String((row as { id: string }).id) !== input.excludeActivityId)
    .filter((row) => !linkedActivityIds.has(String((row as { id: string }).id)))
    .map((row) => ({
      body: String((row as { body?: string }).body ?? "").trim(),
      aiExtraction:
        ((row as { metadata_json?: Record<string, unknown> | null }).metadata_json?.ai_extraction as unknown) ??
        null,
    }))
    .filter((note) => Boolean(note.body));
}

/** Remaining note bodies for intelligence rebuild after delete. */
export async function collectRemainingCaseNoteBodies(input: {
  caseId: string;
  excludeOperationalNoteId?: string | null;
  excludeActivityId?: string | null;
}): Promise<string[]> {
  const notes = await collectRemainingCaseNotes(input);
  return notes.map((note) => note.body);
}
