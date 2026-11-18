import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExistingCandidateRow = {
  id: string;
  product_id: string;
};

const STATUSES = ["pending", "approved", "rejected"] as const;
const CONFIDENCES = ["high", "medium", "low"] as const;
const KNOWLEDGE_TYPES = [
  "what_it_does",
  "procedures",
  "problems_solved",
  "buying_signals",
  "workflow_pain_points",
  "evaluation_questions",
  "objections",
  "competitors",
  "stakeholders",
  "differentiators",
  "other",
] as const;

function isJsonRequest(req: Request): boolean {
  return req.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  const text = String(value ?? "").trim();
  return (allowed as readonly string[]).includes(text) ? (text as T[number]) : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ candidateId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { candidateId } = await ctx.params;
  const id = String(candidateId ?? "").trim();
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid candidate id" }, { status: 400 });
  }

  const jsonMode = isJsonRequest(req);
  const body = jsonMode ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : null;
  const form = jsonMode ? null : await req.formData();
  const action = String((jsonMode ? body?.action : form?.get("action")) ?? "").trim();
  const requestedStatus =
    oneOf(jsonMode ? body?.status : form?.get("status"), STATUSES) ??
    (action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "restore" ? "pending" : null);
  if (!requestedStatus && !jsonMode) {
    return NextResponse.json({ ok: false, error: "Use approve, reject, or restore." }, { status: 400 });
  }

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("surgical_sales_product_intelligence_candidates")
    .select("id, product_id")
    .eq("id", id)
    .maybeSingle();
  if (existingErr) return NextResponse.json({ ok: false, error: existingErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
  const existingRow = existing as ExistingCandidateRow;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    updated_at: now,
  };

  if (jsonMode) {
    const title = String(body?.title ?? "").trim();
    const content = String(body?.content ?? "").trim();
    const evidence = String(body?.evidence ?? "").trim();
    const adminNotes = String(body?.admin_notes ?? "").trim();
    const confidence = oneOf(body?.confidence, CONFIDENCES);
    const knowledgeType = oneOf(body?.knowledge_type, KNOWLEDGE_TYPES);
    if (title) updates.title = title;
    if (content) updates.content = content;
    updates.evidence = evidence || null;
    updates.admin_notes = adminNotes || null;
    if (confidence) updates.confidence = confidence;
    if (knowledgeType) updates.knowledge_type = knowledgeType;
  } else {
    updates.admin_notes = String(form?.get("admin_notes") ?? "").trim() || null;
  }

  if (requestedStatus) {
    updates.status = requestedStatus;
    updates.reviewed_by_user_id = requestedStatus === "pending" ? null : auth.ctx.userId;
    updates.reviewed_at = requestedStatus === "pending" ? null : now;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("surgical_sales_product_intelligence_candidates")
    .update(updates)
    .eq("id", id)
    .select("id, knowledge_type, title, content, evidence, confidence, status, admin_notes, reviewed_at, created_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (jsonMode) {
    return NextResponse.json({ ok: true, candidate: updated });
  }

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/sales/product-intelligence/${encodeURIComponent(existingRow.product_id)}?reviewed=1`),
    303,
  );
}
