import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadObservationFormLibraryItems } from "@/lib/surgical-sales/loadObservationFormLibrary";
import {
  buildObservationFormLibraryView,
  canViewTeamObservationForms,
} from "@/lib/surgical-sales/observationFormLibrary";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_territory_manager")
    .eq("user_id", uid)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  const canViewTeam = canViewTeamObservationForms({
    isTerritoryManager: profile?.is_territory_manager === true,
  });
  const loaded = await loadObservationFormLibraryItems({ viewerId: uid, canViewTeam });
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.message }, { status: 500 });
  }

  const view = buildObservationFormLibraryView({ items: loaded.items, canViewTeam });
  return NextResponse.json({
    ok: true,
    can_view_team: view.canViewTeam,
    total: view.total,
    groups: view.groups,
  });
}
