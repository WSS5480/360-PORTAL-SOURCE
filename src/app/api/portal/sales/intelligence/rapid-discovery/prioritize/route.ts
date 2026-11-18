import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { prioritizeRapidDiscoveryWithOpenAi } from "@/lib/surgical-sales/openAiIntelligenceServices";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  providerName: z.string().min(1).max(200),
  facilityName: z.string().max(200).nullable().optional(),
  discoveryStakeholder: z.string().max(80).default("unspecified"),
  questions: z
    .array(
      z.object({
        dbKey: z.string().min(1).max(80),
        fieldLabel: z.string().min(1).max(200),
        proposedScope: z.enum(["organization", "provider", "case"]),
        priorityScore: z.number(),
      }),
    )
    .min(1)
    .max(40),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userIsInternalSalesRep(auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const prioritization = await prioritizeRapidDiscoveryWithOpenAi({
    questions: body.questions,
    providerName: body.providerName,
    facilityName: body.facilityName ?? null,
    discoveryStakeholder: body.discoveryStakeholder,
  });

  return NextResponse.json({
    ok: true,
    prioritization,
    ordered_db_keys: prioritization?.prioritized_db_keys ?? body.questions.map((q) => q.dbKey),
  });
}
