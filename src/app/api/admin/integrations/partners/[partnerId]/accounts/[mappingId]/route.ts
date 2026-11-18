import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ partnerId: string; mappingId: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { partnerId, mappingId } = await params;
  if (!UUID_RE.test(partnerId) || !UUID_RE.test(mappingId)) {
    return NextResponse.json({ ok: false, error: "Mapping not found." }, { status: 404 });
  }

  const sb = createSupabaseAdminClient();
  const { data, error } = await sb
    .from("integration_partner_accounts")
    .delete()
    .eq("id", mappingId)
    .eq("partner_id", partnerId)
    .select("id")
    .maybeSingle();

  if (error || !data) return NextResponse.json({ ok: false, error: "Mapping not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
