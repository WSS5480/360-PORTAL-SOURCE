import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { deleteCaseOperationalNote } from "@/lib/surgical-sales/deleteCaseOperationalNote";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ caseId: string; noteId: string }> },
) {
  try {
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

    const { caseId, noteId } = await ctx.params;
    if (!UUID_RE.test(caseId) || !UUID_RE.test(noteId)) {
      return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    }

    const result = await deleteCaseOperationalNote({ caseId, noteId, userId: uid });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status ?? 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("[case-note-delete] unexpected failure", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to delete note",
      },
      { status: 500 },
    );
  }
}
