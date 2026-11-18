import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  dedupeUniversalFactsWithinRun,
  type UniversalFactMergeSource,
} from "@/lib/surgical-sales/universalExtractor/dedupeUniversalFactsForDisplay";
import { runUniversalSurgicalExtractionAsync } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import { UNIVERSAL_DECLARED_SOURCE_TYPES } from "@/lib/surgical-sales/universalExtractor/types";
import type { UniversalSurgicalFact } from "@/lib/surgical-sales/universalExtractor/types";
import { isUniversalFactsPanelServerEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsPanelVisible";

export const dynamic = "force-dynamic";

const NoteProbeSchema = z.object({
  raw_note: z.string().min(1).max(8000),
  declared_source_type: z.enum(UNIVERSAL_DECLARED_SOURCE_TYPES),
  probe_label: z.string().max(120).optional(),
});

const BodySchema = z
  .object({
    raw_note: z.string().min(1).max(8000).optional(),
    declared_source_type: z.enum(UNIVERSAL_DECLARED_SOURCE_TYPES).optional(),
    compare_source_types: z.array(z.enum(UNIVERSAL_DECLARED_SOURCE_TYPES)).min(1).max(9).optional(),
    compare_note_probes: z.array(NoteProbeSchema).min(1).max(9).optional(),
  })
  .strict()
  .refine(
    (value) =>
      Boolean(value.compare_note_probes && value.compare_note_probes.length > 0) ||
      Boolean(value.raw_note && value.declared_source_type) ||
      Boolean(value.raw_note && value.compare_source_types && value.compare_source_types.length > 0),
    {
      message: "Provide compare_note_probes, raw_note + declared_source_type, or raw_note + compare_source_types",
    },
  );

function mapExtractionFactsForDisplay(
  facts: UniversalSurgicalFact[],
  sourceType: string,
): UniversalFactMergeSource[] {
  return facts.map((fact, index) => ({
    id: `probe-${sourceType}-${index}`,
    concept: fact.concept,
    normalized_label: fact.normalized_label,
    assertion_level: fact.assertion_level,
    source_type: fact.source_type,
    confidence: fact.confidence,
    evidence_text: fact.evidence_text,
    uncertain: fact.uncertain,
    negated: fact.negated,
  }));
}

async function probeNote(input: {
  rawNote: string;
  declaredSourceType: z.infer<typeof NoteProbeSchema>["declared_source_type"];
  probeLabel?: string;
}) {
  const extraction = await runUniversalSurgicalExtractionAsync({
    raw_note: input.rawNote,
    declared_source_type: input.declaredSourceType,
  });

  return {
    probe_label: input.probeLabel ?? null,
    raw_note: input.rawNote,
    declared_source_type: input.declaredSourceType,
    extraction_model: extraction.model,
    extraction_engine: extraction.extraction_engine ?? "rules",
    facts: dedupeUniversalFactsWithinRun(
      mapExtractionFactsForDisplay(extraction.facts, input.declaredSourceType),
    ),
  };
}

export async function POST(req: Request) {
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

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const probes = await Promise.all(
    (
      body.compare_note_probes?.map((entry) =>
        probeNote({
          rawNote: entry.raw_note.trim(),
          declaredSourceType: entry.declared_source_type,
          probeLabel: entry.probe_label,
        }),
      ) ??
      (() => {
        const rawNote = String(body.raw_note ?? "").trim();
        const sourceTypes =
          body.compare_source_types ??
          (body.declared_source_type ? [body.declared_source_type] : []);
        return sourceTypes.map((declaredSourceType) =>
          probeNote({ rawNote, declaredSourceType }),
        );
      })()
    ),
  );

  return NextResponse.json({
    ok: true,
    probes,
  });
}
