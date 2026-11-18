import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { loadSalesCommandDocumentTree } from "@/lib/sales-command/loadSalesCommandDocumentTree";
import { isSalesCommandDocumentAccessLevel } from "@/lib/sales-command/salesCommandDocumentTypes";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const tree = await loadSalesCommandDocumentTree({ isInternalSalesRep: true, isTerritoryManager: true, isAdmin: true });
    return NextResponse.json({ ok: true, tree });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load documents" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const name = safeStr(body?.name);
  const description = safeStr(body?.description || "") || null;
  const parentId = safeStr(body?.parent_id || "") || null;
  const accessLevel = safeStr(body?.access_level || "admin_only");

  if (!name) return NextResponse.json({ ok: false, error: "Folder name is required" }, { status: 400 });
  if (!isSalesCommandDocumentAccessLevel(accessLevel)) {
    return NextResponse.json({ ok: false, error: "Invalid access level" }, { status: 400 });
  }
  if (parentId && !UUID_RE.test(parentId)) {
    return NextResponse.json({ ok: false, error: "Invalid parent folder" }, { status: 400 });
  }

  if (parentId) {
    const { data: parent, error: parentErr } = await supabaseAdmin
      .from("sales_command_document_folders")
      .select("id")
      .eq("id", parentId)
      .maybeSingle();
    if (parentErr) return NextResponse.json({ ok: false, error: parentErr.message }, { status: 500 });
    if (!parent) return NextResponse.json({ ok: false, error: "Parent folder not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("sales_command_document_folders")
    .insert({
      name,
      description,
      parent_id: parentId,
      access_level: accessLevel,
    })
    .select("id, parent_id, name, description, access_level, sort_order, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, folder: data });
}
