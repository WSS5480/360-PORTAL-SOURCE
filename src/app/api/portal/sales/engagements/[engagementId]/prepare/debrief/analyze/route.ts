import { NextResponse } from "next/server";

import { z } from "zod";

import { supabaseServer } from "@/lib/supabase/server";

import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";

import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";

import { formatTacticalDebriefNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";

import { analyzeEngagementDebriefNarrative } from "@/lib/surgical-sales/engagements/analyzeEngagementDebriefNarrative";

import { mergeDebriefCompletionAnalyzeSnapshot } from "@/lib/surgical-sales/engagements/mergeDebriefCompletionSnapshot";



export const dynamic = "force-dynamic";



const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;



const BodySchema = z

  .object({

    narrative: z.string().min(8).max(8000),

  })

  .strict();



function mappingFailedResponse(error: string, status = 500) {

  return NextResponse.json({ ok: false, mapping_failed: true, error }, { status });

}

export async function POST(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {

  try {

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



    const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });

    if (!engagement) {

      return mappingFailedResponse(

        "This engagement was not found. Refresh the page or start a new intro call.",

        404,

      );

    }



    let body: z.infer<typeof BodySchema>;

    try {

      const raw = await req.json();

      const parsed = BodySchema.safeParse(raw);

      if (!parsed.success) {

        return NextResponse.json({ ok: false, error: "Add a bit more detail before analyzing." }, { status: 400 });

      }

      body = parsed.data;

    } catch {

      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

    }



    const result = await analyzeEngagementDebriefNarrative({

      engagement: engagement as Record<string, unknown>,

      narrative: body.narrative.trim(),

      actorUserId: uid,

    });

    if (!result) {

      return mappingFailedResponse("Could not analyze this debrief. Add a bit more detail and try again.");

    }



    if (

      result.isPostObservationProviderDebrief &&

      result.debriefCompletionContext &&

      result.debriefNextStep

    ) {

      const snapshot = mergeDebriefCompletionAnalyzeSnapshot(engagement.debrief_intelligence_snapshot, {

        completionContext: result.debriefCompletionContext,

        validationResults: result.debriefValidationResults,

        nextStep: result.debriefNextStep,

      });

      const { error: snapshotErr } = await supabase

        .from("surgical_sales_engagements")

        .update({ debrief_intelligence_snapshot: snapshot })

        .eq("id", engagementId);

      if (snapshotErr) {

        console.error("[debrief/analyze] snapshot update failed:", snapshotErr.message);

      }

    }



    return NextResponse.json({

      ok: true,

      scope: result.scope,

      analysis: result.analysis,

      facts: result.facts,

      mapping_source: result.mappingSource,

      mapping_warning: result.mappingWarning,

      propagation_targets: result.propagationTargets,

      discovery_context: result.discoveryContext,

      provider_contact_snapshot: result.providerContactSnapshot,

      engagement_outcome_id: result.engagementOutcomeId,

      is_post_observation_provider_debrief: result.isPostObservationProviderDebrief,

      debrief_completion_context: result.debriefCompletionContext,

      debrief_validation_results: result.debriefValidationResults,

      debrief_next_step: result.debriefNextStep,

      debrief_validation_debug: result.debriefValidationDebug,

      universal_fact_capture_id: result.universalFactCaptureId,

      formatted_notes: formatTacticalDebriefNotes({

        narrative: body.narrative.trim(),

        insights: result.analysis.insights,

      }),

    });

  } catch (e: unknown) {

    const message = e instanceof Error ? e.message : "Analyze failed";

    console.error("[debrief/analyze]", e);

    return mappingFailedResponse(message);

  }

}
