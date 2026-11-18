import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadUniversalFactsGroupedByCapture } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { dedupeUniversalFactsWithinRun } from "@/lib/surgical-sales/universalExtractor/dedupeUniversalFactsForDisplay";
import { isUniversalFactsPanelServerEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsPanelVisible";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const QuerySchema = z
  .object({
    case_id: z.string().regex(UUID_RE).optional(),
    encounter_id: z.string().regex(UUID_RE).optional(),
    provider_id: z.string().regex(UUID_RE).optional(),
    organization_id: z.string().regex(UUID_RE).optional(),
    include_suppressed: z.enum(["0", "1"]).optional(),
    capture_limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.case_id || value.encounter_id || value.provider_id || value.organization_id),
    { message: "Provide case_id, encounter_id, provider_id, or organization_id" },
  );

export async function GET(req: Request) {
  if (!isUniversalFactsPanelServerEnabled()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userIsInternalSalesRep(auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    case_id: url.searchParams.get("case_id") ?? undefined,
    encounter_id: url.searchParams.get("encounter_id") ?? undefined,
    provider_id: url.searchParams.get("provider_id") ?? undefined,
    organization_id: url.searchParams.get("organization_id") ?? undefined,
    include_suppressed: url.searchParams.get("include_suppressed") ?? undefined,
    capture_limit: url.searchParams.get("capture_limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { case_id, encounter_id, provider_id, organization_id, include_suppressed, capture_limit } =
    parsed.data;

  const runs = await loadUniversalFactsGroupedByCapture({
    case_id,
    encounter_id,
    provider_id,
    organization_id,
    include_suppressed: include_suppressed === "1",
    capture_limit,
  });

  return NextResponse.json({
    ok: true,
    runs: runs.map((run) => ({
      capture_id: run.capture_id,
      declared_source_type: run.declared_source_type,
      extraction_model: run.extraction_model,
      created_at: run.created_at,
      operational_note_id: run.operational_note_id,
      facts: dedupeUniversalFactsWithinRun(run.facts).map((row) => ({
        id: row.id,
        concept: row.concept,
        normalized_label: row.normalized_label,
        assertion_level: row.assertion_level,
        source_type: row.source_type,
        confidence: row.confidence,
        uncertain: row.uncertain,
        negated: row.negated,
        evidence_count: row.evidence_count,
        evidence_snippets: row.evidence_snippets,
        merged_fact_ids: row.merged_fact_ids,
      })),
    })),
  });
}
