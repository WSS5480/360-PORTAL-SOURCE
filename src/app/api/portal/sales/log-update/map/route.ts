import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import { loadLogUpdateMappingContext } from "@/lib/surgical-sales/loadLogUpdateMappingContext";
import {
  buildParseResultFromDebriefFacts,
  runOpenAiDebriefFactExtraction,
} from "@/lib/surgical-sales/debriefIntelligencePipeline";
import { buildKeywordFallbackParseResult } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import {
  buildIntelligenceCaptureScopeFromEngagement,
  buildIntelligencePropagationTargets,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import {
  buildLogUpdateParseWithUniversalFacts,
  legacyExtractionFromDipFacts,
} from "@/lib/surgical-sales/universalExtractor/buildLogUpdateParseWithUniversalFacts";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && !v.trim() ? null : v),
  z.string().uuid().nullable().optional(),
);

const BodySchema = z
  .object({
    rawNote: z.string().min(1).max(16000),
    providerId: optionalUuid,
    organizationId: optionalUuid,
    engagementId: optionalUuid,
    productFocus: z.string().max(200).optional().nullable(),
    context: z
      .object({
        providerId: z.string().optional(),
        providerLabel: z.string().optional(),
        organizationId: z.string().optional(),
        organizationLabel: z.string().optional(),
        engagementId: z.string().optional(),
        engagementTypeLabel: z.string().optional(),
        engagementType: z.string().optional(),
        productFocus: z.string().optional(),
        scopeLocked: z.boolean().optional(),
        declaredSourceType: z
          .enum(["field_note", "observation_case", "debrief", "evaluation", "outcome"])
          .optional(),
        composeTitle: z.string().optional(),
        composeSubtitle: z.string().optional(),
        reviewSaveCta: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const rawNote = body.rawNote.trim();
  const providerId = body.providerId ?? body.context?.providerId ?? null;
  const organizationId = body.organizationId ?? body.context?.organizationId ?? null;
  const engagementId = body.engagementId ?? body.context?.engagementId ?? null;

  const mappingContext = await loadLogUpdateMappingContext({
    actorUserId: uid,
    rawNote,
    providerId,
    organizationId,
    engagementId,
    productFocus: body.productFocus ?? body.context?.productFocus ?? null,
  });

  if (!mappingContext) {
    return NextResponse.json(
      { ok: false, mapping_failed: true, error: "Could not load mapping context for this note." },
      { status: 400 },
    );
  }

  const captureContext: AiNoteCaptureContext | undefined = body.context
    ? {
        providerId: body.context.providerId,
        providerLabel: body.context.providerLabel,
        organizationId: body.context.organizationId,
        organizationLabel: body.context.organizationLabel,
        engagementId: body.context.engagementId,
        engagementTypeLabel: body.context.engagementTypeLabel,
        engagementType: body.context.engagementType,
        productFocus: body.context.productFocus,
        scopeLocked: body.context.scopeLocked,
        declaredSourceType: body.context.declaredSourceType,
        composeTitle: body.context.composeTitle,
        composeSubtitle: body.context.composeSubtitle,
        reviewSaveCta: body.context.reviewSaveCta,
      }
    : providerId
      ? { providerId }
      : undefined;

  try {
    const factExtraction = await runOpenAiDebriefFactExtraction(mappingContext);
    let parse: LogUpdateParseResult = buildParseResultFromDebriefFacts({
      sourceText: rawNote,
      facts: factExtraction.facts,
      context: captureContext,
      existingFields: mappingContext.existingKnownFields,
      mappingSource: "openai",
    });

    const providerIdForUf = mappingContext.providerId ?? providerId;
    let universalFactCaptureId: string | null = null;
    if (providerIdForUf) {
      const ufResult = await buildLogUpdateParseWithUniversalFacts({
        rawNote,
        userId: uid,
        providerId: providerIdForUf,
        dipLogUpdate: parse,
        existingFields: mappingContext.existingKnownFields,
        organizationId: mappingContext.organizationId ?? organizationId,
        engagementId: mappingContext.engagementId ?? engagementId,
        productFocus: mappingContext.productFocus ?? body.productFocus ?? body.context?.productFocus ?? null,
        engagementType: mappingContext.engagementType,
        engagementTypeLabel: body.context?.engagementTypeLabel ?? null,
        providerLabel: mappingContext.providerName ?? body.context?.providerLabel ?? null,
        legacyExtraction: legacyExtractionFromDipFacts(factExtraction.facts),
      });
      parse = ufResult.parse;
      universalFactCaptureId = ufResult.universalFactCaptureId;
    }

    const scope =
      engagementId && UUID_RE.test(engagementId)
        ? buildIntelligenceCaptureScopeFromEngagement({
            engagementId,
            providerId: mappingContext.providerId,
            organizationId: mappingContext.organizationId,
            providerLabel: mappingContext.providerName,
            organizationLabel: mappingContext.organizationName,
            engagementType: mappingContext.engagementType ?? undefined,
            productLine: mappingContext.productFocus,
          })
        : null;

    const propagation_targets = scope
      ? buildIntelligencePropagationTargets({
          scope,
          logUpdate: parse,
          engagementNotesSaved: false,
        })
      : [];

    const providerRow = providerId
      ? (
          await supabaseAdmin
            .from("surgical_sales_contacts")
            .select("*")
            .eq("id", providerId)
            .maybeSingle()
        ).data
      : null;

    // Source-of-truth hierarchy: the outcome the rep explicitly selected at
    // engagement completion outranks AI-extracted workflow signals during
    // review (e.g. observation approval is workflow state, not new intel).
    let engagementOutcomeId: string | null = null;
    if (engagementId && UUID_RE.test(engagementId)) {
      const { data: engagementRow } = await supabaseAdmin
        .from("surgical_sales_engagements")
        .select("debrief_intelligence_snapshot")
        .eq("id", engagementId)
        .maybeSingle();
      engagementOutcomeId =
        readStartMissionSnapshot(engagementRow?.debrief_intelligence_snapshot)?.outcome_id ?? null;
    }

    const extraction_review = buildDebriefIntelligenceExtractionReview({
      review: parse,
      discoveryContext: mappingContext.discoveryContext ?? null,
      providerContact: providerRow as Record<string, unknown> | null,
    });

    return NextResponse.json({
      ok: true,
      parse,
      facts: factExtraction.facts,
      rejected_facts: factExtraction.rejectedFacts,
      mapping_source: "openai",
      scope,
      propagation_targets,
      extraction_review,
      discovery_context: mappingContext.discoveryContext ?? null,
      provider_contact_snapshot: providerRow,
      engagement_outcome_id: engagementOutcomeId,
      universal_fact_capture_id: universalFactCaptureId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "AI mapping failed";
    console.error("[log-update/map] OpenAI mapping failed:", message);

    if (/OPENAI_API_KEY not configured/i.test(message)) {
      return NextResponse.json({
        ok: false,
        mapping_failed: true,
        error: "OpenAI is not configured on the server. Add OPENAI_API_KEY to .env.local and restart the dev server.",
      });
    }

    const fallback = buildKeywordFallbackParseResult(rawNote, captureContext, mappingContext.existingKnownFields);
    const providerIdForUf = mappingContext.providerId ?? providerId;
    let universalFactCaptureId: string | null = null;
    let parse: LogUpdateParseResult = fallback;
    if (providerIdForUf) {
      const ufResult = await buildLogUpdateParseWithUniversalFacts({
        rawNote,
        userId: uid,
        providerId: providerIdForUf,
        dipLogUpdate: fallback,
        existingFields: mappingContext.existingKnownFields,
        organizationId: mappingContext.organizationId ?? organizationId,
        engagementId: mappingContext.engagementId ?? engagementId,
        productFocus: mappingContext.productFocus ?? body.productFocus ?? body.context?.productFocus ?? null,
        engagementType: mappingContext.engagementType,
        engagementTypeLabel: body.context?.engagementTypeLabel ?? null,
        providerLabel: mappingContext.providerName ?? body.context?.providerLabel ?? null,
      });
      parse = ufResult.parse;
      universalFactCaptureId = ufResult.universalFactCaptureId;
    }
    const scope =
      engagementId && UUID_RE.test(engagementId)
        ? buildIntelligenceCaptureScopeFromEngagement({
            engagementId,
            providerId: mappingContext.providerId,
            organizationId: mappingContext.organizationId,
            providerLabel: mappingContext.providerName,
            organizationLabel: mappingContext.organizationName,
            engagementType: mappingContext.engagementType ?? undefined,
            productLine: mappingContext.productFocus,
          })
        : null;

    return NextResponse.json({
      ok: true,
      parse,
      mapping_source: "keyword_fallback",
      mapping_warning: message,
      scope,
      propagation_targets: scope
        ? buildIntelligencePropagationTargets({
            scope,
            logUpdate: parse,
            engagementNotesSaved: false,
          })
        : [],
      universal_fact_capture_id: universalFactCaptureId,
    });
  }
}
