// src/app/admin/ivr/[ivrId]/download/[fileID]/route.ts
import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type CtxA = { params: { ivrId: string; fileID: string } };
type CtxB = { params: Promise<{ ivrId: string; fileID: string }> };

async function getParams(ctx: any): Promise<{ ivrId: string; fileID: string }> {
  const maybeParams = ctx?.params;
  const resolved = typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
  return {
    ivrId: safeStr(resolved?.ivrId),
    // IMPORTANT: this folder is [fileID] (capital D), so we must read fileID here.
    fileID: safeStr(resolved?.fileID),
  };
}

export async function GET(req: Request, ctx: CtxA | CtxB) {
  await requireIvrTeamOrAdmin();

  const { ivrId, fileID } = await getParams(ctx);

  if (!ivrId || !isUuid(ivrId)) {
    return NextResponse.json({ error: "Invalid ivrId" }, { status: 400 });
  }
  if (!fileID || !isUuid(fileID)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  // Load file row
  const { data: file, error: fileErr } = await sb
    .from("ivr_files")
    .select("id, ivr_request_id, bucket, object_path")
    .eq("id", fileID)
    .maybeSingle();

  if (fileErr) return NextResponse.json({ error: fileErr.message }, { status: 500 });
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Enforce that the file belongs to this IVR (prevents cross-IVR access)
  if (safeStr(file.ivr_request_id) !== ivrId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bucket = safeStr(file.bucket);
  const path = safeStr(file.object_path);

  if (!bucket || !path) {
    return NextResponse.json({ error: "File missing bucket/object_path" }, { status: 500 });
  }

  // Create signed URL and redirect to it (so the browser downloads/opens the file)
  const { data: signed, error: signErr } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 10);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
