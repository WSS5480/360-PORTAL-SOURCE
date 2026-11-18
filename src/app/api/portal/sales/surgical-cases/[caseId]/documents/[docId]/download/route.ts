import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { createSignedUrlForCaseDocument, getSurgicalCaseDocumentsBucket } from "@/lib/surgical-sales/surgicalCaseDocumentStorage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string; docId: string }> }) {
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

  const { data: doc, error } = await supabaseAdmin
    .from("surgical_sales_case_documents")
    .select("id, case_id, storage_key, file_url")
    .eq("id", docId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  const storageKey = (doc as { storage_key?: string | null }).storage_key;
  const fileUrl = (doc as { file_url?: string | null }).file_url;
  if (fileUrl) {
    return NextResponse.json({ ok: true, url: fileUrl, kind: "external" });
  }
  if (!storageKey) {
    return NextResponse.json({ ok: false, error: "No file stored for this document" }, { status: 400 });
  }

  const bucket = getSurgicalCaseDocumentsBucket();
  const signed = await createSignedUrlForCaseDocument({ bucket, storageKey, expiresInSeconds: 120 });
  if (!signed.ok) {
    return NextResponse.json({ ok: false, error: signed.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signed.signedUrl, kind: "signed" });
}
