import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { normalizeClinicalDiscoveryQuestionKey } from "@/lib/surgical-sales/providerClinicalDiscovery";
import {
  buildClinicalDiscoveryUpsertInput,
  isClinicalDiscoveryQuestionKey,
  listClinicalDiscoveryAnswersForProvider,
  touchProviderPlanningUpdatedAt,
  upsertClinicalDiscoveryAnswer,
  type ProviderClinicalDiscoveryAnswer,
} from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { logClinicalDiscoveryAnswerActivities } from "@/lib/surgical-sales/clinicalDiscoveryActivityLog";
import { buildProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchSchema = z
  .object({
    questionKey: z.string().refine((k) => isClinicalDiscoveryQuestionKey(k), "Invalid question key"),
    response: z.string().optional(),
    tags: z.array(z.string()).optional(),
    confidence: z.enum(["low", "medium", "high"]).nullable().optional(),
    sourceCaseId: z.string().uuid().nullable().optional(),
    sourceNotes: z.string().nullable().optional(),
    /** Legacy: flat draft fields from existing UI */
    draft: z.record(z.string(), z.string()).optional(),
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

async function loadProvider(providerId: string, uid: string) {
  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 as const };
  if (!contact) return { error: "Not found", status: 404 as const };
  if (!isProviderRole(String((contact as { role_type?: string }).role_type || ""))) {
    return { error: "Not a provider record.", status: 400 as const };
  }
  if (!(await repCanAccessContact(uid, contact as never))) {
    return { error: "Not found", status: 404 as const };
  }
  return { contact: contact as Record<string, unknown> };
}

export async function GET(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const loaded = await loadProvider(providerId, gate.uid);
  if ("error" in loaded && !("contact" in loaded)) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  try {
    const answers = await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId);
    return NextResponse.json({ ok: true, answers });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load answers" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const loaded = await loadProvider(providerId, gate.uid);
  if ("error" in loaded && !("contact" in loaded)) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const questionKey = normalizeClinicalDiscoveryQuestionKey(parsed.data.questionKey);
  if (!questionKey || !isClinicalDiscoveryQuestionKey(questionKey)) {
    return NextResponse.json({ ok: false, error: "Invalid question key" }, { status: 400 });
  }

  const input = parsed.data.draft
    ? buildClinicalDiscoveryUpsertInput(questionKey, parsed.data.draft)
    : {
        questionKey,
        response: parsed.data.response,
        tags: parsed.data.tags,
        confidence: parsed.data.confidence ?? null,
        sourceCaseId: parsed.data.sourceCaseId ?? null,
        sourceNotes: parsed.data.sourceNotes ?? null,
      };

  try {
    const priorAnswers = await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId);
    const hadPrior = priorAnswers.some((a) => a.questionKey === questionKey);

    const answer = await upsertClinicalDiscoveryAnswer(supabaseAdmin, providerId, gate.uid, input);
    await touchProviderPlanningUpdatedAt(supabaseAdmin, providerId);

    const activityLog = await logClinicalDiscoveryAnswerActivities({
      providerId,
      userId: gate.uid,
      questionKey,
      questionLabel: answer.questionLabel,
      sourceCaseId: answer.sourceCaseId ?? input.sourceCaseId ?? null,
      isCreate: !hadPrior,
    });
    if (!activityLog.ok) {
      return NextResponse.json({ ok: false, error: activityLog.message }, { status: 500 });
    }

    const { data: provider } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("*")
      .eq("id", providerId)
      .single();

    const answers = await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId);

    await logSurgicalSalesCrmAudit({
      actorUserId: gate.uid,
      action: "provider_clinical_discovery_updated",
      meta: { contact_id: providerId, provider_id: providerId, question_key: questionKey },
      req,
    });

    return NextResponse.json({
      ok: true,
      answer,
      answers,
      clinical_discovery_answers: answers,
      provider: provider
        ? { ...(provider as Record<string, unknown>), clinical_discovery_answers: answers }
        : provider,
      planning_completion: buildProviderPlanningCompletion(
        (provider || loaded.contact) as Record<string, unknown>,
      ),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}

export type ClinicalDiscoveryPatchResponse = {
  ok: boolean;
  answer?: ProviderClinicalDiscoveryAnswer;
  answers?: ProviderClinicalDiscoveryAnswer[];
  planning_completion?: ReturnType<typeof buildProviderPlanningCompletion>;
};
