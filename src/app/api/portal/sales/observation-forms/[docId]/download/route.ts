import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadObservationFormDocumentForViewer } from "@/lib/surgical-sales/loadObservationFormLibrary";
import { canViewTeamObservationForms } from "@/lib/surgical-sales/observationFormLibrary";
import {
  createSignedUrlForCaseDocument,
  getSurgicalCaseDocumentsBucket,
} from "@/lib/surgical-sales/surgicalCaseDocumentStorage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ docId: string }> }) {
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

  const { docId } = await ctx.params;
  if (!UUID_RE.test(docId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_territory_manager")
    .eq("user_id", uid)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  const loaded = await loadObservationFormDocumentForViewer({
    docId,
    viewerId: uid,
    canViewTeam: canViewTeamObservationForms({ isTerritoryManager: profile?.is_territory_manager === true }),
  });
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.message }, { status: loaded.status });
  }

  const signed = await createSignedUrlForCaseDocument({
    bucket: getSurgicalCaseDocumentsBucket(),
    storageKey: loaded.doc.storage_key || "",
  });
  if (!signed.ok) {
    return NextResponse.json({ ok: false, error: signed.message }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
