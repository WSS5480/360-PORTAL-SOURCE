import { after, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import {
  CreateOperationalNoteClientSchema,
  createOperationalNote,
  mergeNoteInputWithContext,
  operationalNoteContextFromCaseRow,
} from "@/lib/notes";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { recordSurgicalPhiPatternEvent } from "@/lib/surgical-sales/phiWarningLogger";
import { processCaseNoteCapture } from "@/lib/surgical-sales/processCaseNoteCapture";
import { resolveObservationCaptureFeedback } from "@/lib/surgical-sales/observationCaptureFeedback";
import { resolveProductSupportCaptureFeedback } from "@/lib/surgical-sales/productSupportCaptureFeedback";
import { isUniversalFactsReadModelEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelFlag";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CaseNotePostSchema = CreateOperationalNoteClientSchema.extend({
  capture_mode: z.enum(["voice", "quick"]).optional(),
});

async function markActivityIntelligenceProcessing(input: {
  activityId?: string | null;
  noteId: string;
  processing: boolean;
  error?: string | null;
}) {
  const activityId = String(input.activityId ?? "").trim();
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
        intelligence_processing: input.processing,
        ...(input.error ? { intelligence_error: input.error } : {}),
      },
    })
    .eq("id", activityId);
}

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await ctx.params;
  if (!UUID_RE.test(caseId)) {
    return NextResponse.json({ ok: false, error: "Invalid case id" }, { status: 400 });
  }

  const row = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if ((row as { archived_at?: string | null }).archived_at) {
    return NextResponse.json({ ok: false, error: "Restore the case before adding notes." }, { status: 409 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = CaseNotePostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { capture_mode: captureMode, ...noteInput } = parsed.data;

  const context = operationalNoteContextFromCaseRow(caseId, row, noteInput.workflow_stage ?? null);
  const merged = mergeNoteInputWithContext(noteInput, context);
  const created = await createOperationalNote({ ...merged, userId: uid });

  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.message }, { status: 500 });
  }

  await markActivityIntelligenceProcessing({
    activityId: created.legacyActivityId ?? null,
    noteId: created.note.id,
    processing: true,
  });

  const trimmed = noteInput.body.trim();
  const caseType = String((row as { case_type?: string }).case_type ?? "").trim().toLowerCase();
  const isProductSupportCase = caseType === "product_support";
  const kinds = detectSurgicalPhiPatternKinds(trimmed);
  if (kinds.length) {
    void recordSurgicalPhiPatternEvent({
      actorUserId: uid,
      caseId,
      surface: "case_timeline_note",
      kinds,
    });
  }

  after(async () => {
    try {
      await processCaseNoteCapture({
      caseId,
      caseRow: row as Record<string, unknown>,
      noteId: created.note.id,
      noteBody: trimmed,
      legacyCaseActivityId: created.legacyActivityId ?? null,
      captureMode: captureMode ?? null,
      capturedByUserId: uid,
    });
    } catch (error: unknown) {
      console.error("[case note ai extraction background]", error);
      await markActivityIntelligenceProcessing({
        activityId: created.legacyActivityId ?? null,
        noteId: created.note.id,
        processing: false,
        error: error instanceof Error ? error.message : "Intelligence extraction failed",
      });
    }
  });

  return NextResponse.json({
    ok: true,
    note: created.note,
    legacy_activity_id: created.legacyActivityId ?? null,
    intelligence: null,
    intelligence_processing: true,
    capture_feedback: isUniversalFactsReadModelEnabled()
      ? isProductSupportCase
        ? resolveProductSupportCaptureFeedback({
            caseId,
            noteBody: trimmed,
            readModelEnabled: true,
          })
        : resolveObservationCaptureFeedback({
            caseId,
            noteBody: trimmed,
            readModelEnabled: true,
          })
      : null,
  });
}
