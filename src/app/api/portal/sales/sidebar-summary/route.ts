import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { fetchRepAchievementSummary } from "@/lib/surgical-sales/fetchExecutionLeaderboardData";
export const dynamic = "force-dynamic";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addUtcDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  return utcYmd(dt);
}

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const today = utcYmd(new Date());
  const horizon = addUtcDaysYmd(today, 14);

  const [{ data: contactRows }, { data: caseRows }, { data: oppRows }] = await Promise.all([
      supabaseAdmin
        .from("surgical_sales_contacts")
        .select("id")
        .in("role_type", ["surgeon", "physician_assistant"])
        .is("archived_at", null)
        .limit(600),
      supabaseAdmin
        .from("surgical_sales_cases")
        .select("id, case_date, status, case_type, product_id, surgeon_contact_id"),
      supabaseAdmin.from("sales_opportunities").select("id"),
    ]);

  let providersActive = 0;
  for (const row of contactRows || []) {
    if (await repCanAccessContact(uid, row as never)) providersActive++;
  }

  let casesUpcoming = 0;
  let operationalBlockers = 0;
  for (const c of caseRows || []) {
    const st = String((c as { status?: string }).status || "").toLowerCase();
    const cd = (c as { case_date?: string | null }).case_date
      ? String((c as { case_date: string }).case_date).slice(0, 10)
      : null;
    if (cd && cd >= today && cd <= horizon && (st === "scheduled" || st === "confirmed")) {
      casesUpcoming++;
    }
    const active = st !== "cancelled" && st !== "closed";
    if (active && !(c as { surgeon_contact_id?: string | null }).surgeon_contact_id) {
      operationalBlockers++;
    }
    if (st === "billing_review") operationalBlockers++;
  }

  let tasksOpen = 0;
  let tasksOverdue = 0;
  const oppIds = (oppRows || []).map((o) => String((o as { id: string }).id)).filter(Boolean);
  if (oppIds.length > 0) {
    const { data: tasks } = await supabaseAdmin
      .from("sales_tasks")
      .select("due_date")
      .in("opportunity_id", oppIds)
      .is("completed_at", null);
    for (const t of tasks || []) {
      tasksOpen++;
      if (String((t as { due_date?: string }).due_date || "") < today) tasksOverdue++;
    }
  }

  operationalBlockers += tasksOverdue;

  let achievement_badges: Awaited<ReturnType<typeof fetchRepAchievementSummary>>["achievement_badges"] = [];
  let nearest_progress: Awaited<ReturnType<typeof fetchRepAchievementSummary>>["nearest_progress"] = null;
  try {
    const ach = await fetchRepAchievementSummary({ userId: uid, period: "month" });
    achievement_badges = ach.achievement_badges;
    nearest_progress = ach.nearest_progress;
  } catch {
    /* optional profile badges */
  }

  return NextResponse.json({
    ok: true,
    counts: {
      providers_active: providersActive,
      cases_upcoming: casesUpcoming,
      tasks_open: tasksOpen,
      blockers: operationalBlockers,
    },
    profile: {
      achievement_badges,
      achievement_badge_count: achievement_badges.length,
      nearest_badge_progress: nearest_progress,
    },
  });
}
