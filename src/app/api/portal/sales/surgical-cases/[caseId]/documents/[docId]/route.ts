import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { isInternalPortalAdmin } from "@/lib/sales/isInternalPortalAdmin";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { getSurgicalCaseDocumentsBucket } from "@/lib/surgical-sales/surgicalCaseDocumentStorage";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, ctx: { params: Promise<{ caseId: string; docId: string }> }) {
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

  const { caseId, docId } = await ctx.params;
  if (!UUID_RE.test(caseId) || !UUID_RE.test(docId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const row = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { data: doc, error: dErr } = await supabaseAdmin
    .from("surgical_sales_case_documents")
    .select("id, case_id, document_type, file_name, storage_key")
    .eq("id", docId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (dErr || !doc) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  const uploadedBy = String((doc as { uploaded_by?: string }).uploaded_by ?? "");
  const admin = await isInternalPortalAdmin(uid);
  if (!admin && !(await userIsInternalSalesRep(uid)) && uploadedBy !== uid) {
    return NextResponse.json({ ok: false, error: "Only an internal sales rep, document uploader, or an admin can delete this file." }, { status: 403 });
  }

  const storageKey = (doc as { storage_key?: string | null }).storage_key;
  const fileName = String((doc as { file_name: string }).file_name);
  const docType = String((doc as { document_type: string }).document_type);

  const { error: delErr } = await supabaseAdmin.from("surgical_sales_case_documents").delete().eq("id", docId);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  if (storageKey) {
    const bucket = getSurgicalCaseDocumentsBucket();
    await supabaseAdmin.storage.from(bucket).remove([storageKey]);
  }

  const log = await logSurgicalCaseActivity({
    caseId,
    userId: uid,
    activityType: "document_deleted",
    body: `Removed ${docType.replace(/_/g, " ")}: ${fileName}`,
    metadataJson: { document_id: docId, document_type: docType },
    previousValues: {
      document_id: docId,
      document_type: docType,
      file_name: fileName,
      storage_key: storageKey ?? null,
    },
  });
  if (!log.ok) {
    return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
  }

  await logSurgicalSalesCrmAudit({
    actorUserId: uid,
    action: "case_document_deleted",
    meta: { case_id: caseId, document_id: docId, document_type: docType },
    req: _req,
  });

  return NextResponse.json({ ok: true });
}
