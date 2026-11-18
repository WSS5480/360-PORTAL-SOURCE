import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import {
  getSurgicalCaseDocumentsBucket,
  surgicalCaseDocumentObjectPath,
  uploadSurgicalCaseDocumentFile,
} from "@/lib/surgical-sales/surgicalCaseDocumentStorage";
import { SURGICAL_CASE_DOCUMENT_TYPES } from "@/lib/surgical-sales/labels";
import { applySurgicalCaseDocumentWorkflow } from "@/lib/surgical-sales/caseDocumentWorkflow";
import { assertAllowedSurgicalCaseDocumentFile } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { recordSurgicalPhiPatternEvent } from "@/lib/surgical-sales/phiWarningLogger";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    return NextResponse.json({ ok: false, error: "Restore the case before uploading documents." }, { status: 409 });
  }

  const form = await req.formData();
  const documentType = String(form.get("document_type") || "").trim().toLowerCase();
  const file = form.get("file");

  const allowedTypes = SURGICAL_CASE_DOCUMENT_TYPES as readonly string[];
  if (!allowedTypes.includes(documentType)) {
    return NextResponse.json({ ok: false, error: "Invalid document_type" }, { status: 400 });
  }
  if (!file || !(file instanceof File) || !file.name) {
    return NextResponse.json({ ok: false, error: "File is required" }, { status: 400 });
  }

  const fileErr = assertAllowedSurgicalCaseDocumentFile(file, documentType);
  if (fileErr) {
    return NextResponse.json({ ok: false, error: fileErr }, { status: 400 });
  }

  const bucket = getSurgicalCaseDocumentsBucket();
  const objectPath = surgicalCaseDocumentObjectPath(caseId, file.name);

  const up = await uploadSurgicalCaseDocumentFile({ bucket, objectPath, file });
  if (!up.ok) {
    return NextResponse.json({ ok: false, error: up.message }, { status: 500 });
  }

  const { data: doc, error: insErr } = await supabaseAdmin
    .from("surgical_sales_case_documents")
    .insert({
      case_id: caseId,
      document_type: documentType,
      file_name: file.name,
      storage_key: objectPath,
      file_url: null,
      uploaded_by: uid,
    })
    .select("id, document_type, file_name, uploaded_by, created_at")
    .single();

  if (insErr || !doc) {
    await supabaseAdmin.storage.from(bucket).remove([objectPath]);
    return NextResponse.json({ ok: false, error: insErr?.message || "Failed to save document" }, { status: 500 });
  }

  const docId = String((doc as { id: string }).id);
  const log = await logSurgicalCaseActivity({
    caseId,
    userId: uid,
    activityType: "document_uploaded",
    body: `Uploaded ${documentType.replace(/_/g, " ")}: ${file.name}`,
    metadataJson: { document_id: docId, document_type: documentType, storage_key: objectPath },
    newValues: {
      document_id: docId,
      document_type: documentType,
      file_name: file.name,
      storage_key: objectPath,
    },
  });
  if (!log.ok) {
    await supabaseAdmin.from("surgical_sales_case_documents").delete().eq("id", docId);
    await supabaseAdmin.storage.from(bucket).remove([objectPath]);
    return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
  }

  await applySurgicalCaseDocumentWorkflow({ caseId, userId: uid, documentType });

  const nameKinds = detectSurgicalPhiPatternKinds(file.name);
  if (nameKinds.length) {
    void recordSurgicalPhiPatternEvent({
      actorUserId: uid,
      caseId,
      surface: "document_upload_filename",
      kinds: nameKinds,
    });
  }

  return NextResponse.json({ ok: true, document: doc });
}
