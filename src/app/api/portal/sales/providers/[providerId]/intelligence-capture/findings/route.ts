import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { INTELLIGENCE_CAPTURE_CATEGORY_IDS } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { applyCategoryFindingsToProvider } from "@/lib/surgical-sales/intelligenceCapture/applyCategoryFindings";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { isBulkIntelligenceCaptureHiddenForPilot } from "@/lib/surgical-sales/observationIntelligence/observationPilotFlags";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostSchema = z
  .object({
    categoryId: z.enum(INTELLIGENCE_CAPTURE_CATEGORY_IDS),
    findings: z.array(z.string().min(1).max(4000)).min(1).max(24),
  })
  .strict();

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  // §7b observation pilot: bulk freeform capture is disabled for pilot orgs —
  // defense in depth against stale clients still showing "Note or Dictate".
  if (isBulkIntelligenceCaptureHiddenForPilot()) {
    return NextResponse.json(
      { ok: false, error: "Bulk intelligence capture is disabled during the observation pilot. Use Guided capture." },
      { status: 403 },
    );
  }

  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", gate.uid)
    .maybeSingle();
  const actorName =
    String((profile as { full_name?: string | null } | null)?.full_name ?? "").trim() ||
    String((profile as { email?: string | null } | null)?.email ?? "").trim() ||
    "Rep";

  const result = await applyCategoryFindingsToProvider({
    providerId,
    categoryId: parsed.data.categoryId,
    findings: parsed.data.findings,
    actorUserId: gate.uid,
    actorName,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    savedCount: result.savedCount,
    confirmationMessage: result.confirmationMessage,
    followUpRequired: result.followUpRequired,
    provider: result.provider,
  });
}
