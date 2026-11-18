import { supabaseAdmin } from "@/lib/supabase/admin";

import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";

import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";

import { rebuildCaseIntelligenceFromNoteBodies } from "@/lib/surgical-sales/rebuildCaseIntelligenceFromNotes";

import { rebuildProviderIntelligenceAfterNoteDelete } from "@/lib/surgical-sales/rebuildProviderIntelligenceAfterNoteDelete";

import { purgeUniversalSurgicalFactsForOperationalNote } from "@/lib/surgical-sales/universalExtractor/persistUniversalSurgicalFacts";

import {

  collectRemainingCaseNotes,

  resolveCaseNoteDeleteTarget,

  type RemainingCaseNote,

} from "@/lib/surgical-sales/resolveCaseNoteDeleteTarget";



export type DeleteCaseOperationalNoteResult =

  | { ok: true }

  | { ok: false; message: string; status?: number };



export async function deleteCaseOperationalNote(input: {

  caseId: string;

  noteId: string;

  userId: string;

}): Promise<DeleteCaseOperationalNoteResult> {

  const caseRow = await loadSurgicalCaseForPortalActor(input.caseId, input.userId);

  if (!caseRow) {

    return { ok: false, message: "Not found", status: 404 };

  }

  if ((caseRow as { archived_at?: string | null }).archived_at) {

    return { ok: false, message: "Restore the case before deleting notes.", status: 409 };

  }



  let target;

  try {

    target = await resolveCaseNoteDeleteTarget({

      caseId: input.caseId,

      noteId: input.noteId,

    });

  } catch (error: unknown) {

    return {

      ok: false,

      message: error instanceof Error ? error.message : "Could not resolve note",

      status: 500,

    };

  }



  if (!target) {

    return { ok: false, message: "Note not found", status: 404 };

  }



  const noteBody = target.noteBody;

  let activityId = target.activityId;



  let remainingNotes: RemainingCaseNote[];

  try {

    remainingNotes = await collectRemainingCaseNotes({

      caseId: input.caseId,

      excludeOperationalNoteId: target.operationalNoteId,

      excludeActivityId: target.activityId,

    });

  } catch (error: unknown) {

    return {

      ok: false,

      message: error instanceof Error ? error.message : "Could not load remaining notes",

      status: 500,

    };

  }



  const remainingBodies = remainingNotes.map((note) => note.body);



  const casePatch = rebuildCaseIntelligenceFromNoteBodies({

    caseType: (caseRow as { case_type?: string }).case_type,

    noteBodies: remainingBodies,

    notes: remainingNotes,

  });



  if (target.operationalNoteId) {
    const ufPurge = await purgeUniversalSurgicalFactsForOperationalNote(target.operationalNoteId);
    if (!ufPurge.ok) {
      return { ok: false, message: ufPurge.message, status: 500 };
    }

    const { error: deleteNoteErr } = await supabaseAdmin

      .from("sales_operational_notes")

      .delete()

      .eq("id", target.operationalNoteId);



    if (deleteNoteErr) {

      return { ok: false, message: deleteNoteErr.message, status: 500 };

    }

  }



  if (!activityId && target.operationalNoteId) {

    const { data: caseActivities } = await supabaseAdmin

      .from("surgical_sales_case_activities")

      .select("id, metadata_json")

      .eq("case_id", input.caseId);

    const linkedActivity = (caseActivities ?? []).find((row) => {

      const metadata = (row as { metadata_json?: Record<string, unknown> }).metadata_json;

      return String(metadata?.note_id ?? "").trim() === target.operationalNoteId;

    });

    activityId = String((linkedActivity as { id?: string } | undefined)?.id ?? "").trim() || null;

  }



  if (activityId) {

    await supabaseAdmin.from("surgical_sales_case_activities").delete().eq("id", activityId);

  }



  const now = new Date().toISOString();

  const { error: caseUpdateErr } = await supabaseAdmin

    .from("surgical_sales_cases")

    .update({ ...casePatch, updated_at: now })

    .eq("id", input.caseId);



  if (caseUpdateErr) {

    return { ok: false, message: caseUpdateErr.message, status: 500 };

  }



  const providerId = String((caseRow as { surgeon_contact_id?: string }).surgeon_contact_id ?? "").trim();

  if (providerId) {

    const { data: providerRow } = await supabaseAdmin

      .from("surgical_sales_contacts")

      .select("*")

      .eq("id", providerId)

      .maybeSingle();



    if (providerRow) {

      const providerPatch = rebuildProviderIntelligenceAfterNoteDelete({

        providerRow: providerRow as Record<string, unknown>,

        deletedNoteBody: noteBody,

        remainingNoteBodies: remainingBodies,

        deletedNoteAiExtraction: target.noteAiExtraction,

        remainingNotes,

      });

      if (Object.keys(providerPatch).length > 0) {

        await supabaseAdmin

          .from("surgical_sales_contacts")

          .update({ ...providerPatch, updated_at: now })

          .eq("id", providerId);

      }

    }

  }



  const preview = noteBody.length > 120 ? `${noteBody.slice(0, 117)}…` : noteBody;

  const log = await logSurgicalCaseActivity({

    caseId: input.caseId,

    userId: input.userId,

    activityType: "case_updated",

    body: `Note deleted — removed captured intelligence from this entry. "${preview}"`,

    metadataJson: {

      action: "note_deleted",

      deleted_note_id: target.operationalNoteId ?? input.noteId,

      deleted_activity_id: activityId || null,

    },

  });

  if (!log.ok) {

    return { ok: false, message: log.message, status: 500 };

  }



  return { ok: true };

}


