import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  DEFAULT_PREPARE_BRIEFING_SOURCE,
  generatePrepareBriefing,
  type PrepareBriefingSource,
} from "@/lib/surgical-sales/engagements/prepareBriefing";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RefreshBodySchema = z
  .object({
    source: z.enum(["rules", "ai"]).optional(),
  })
  .strict();

export async function POST(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { engagementId } = await ctx.params;
  if (!UUID_RE.test(engagementId)) {
    return NextResponse.json({ ok: false, error: "Invalid engagement id" }, { status: 400 });
  }

  let source: PrepareBriefingSource = DEFAULT_PREPARE_BRIEFING_SOURCE;
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = RefreshBodySchema.safeParse(raw);
    if (parsed.success && parsed.data.source) {
      source = parsed.data.source;
    }
  } catch {
    /* empty body → default rules */
  }

  const result = await generatePrepareBriefing({
    engagementId,
    userId: uid,
    source,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.message },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    prepare: result.prepare,
    source: result.source,
    refreshed_at: result.refreshed_at,
  });
}
