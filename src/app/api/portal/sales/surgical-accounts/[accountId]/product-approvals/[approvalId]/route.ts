import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import {
  ORG_PRODUCT_APPROVAL_STATUSES,
  orgProductApprovalStatusSideEffects,
  type OrgProductApprovalStatus,
} from "@/lib/surgical-sales/organizationProductApprovals";
import { loadOrganizationProductApprovals } from "@/lib/surgical-sales/loadOrganizationProductApprovals";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchSchema = z
  .object({
    status: z.enum(ORG_PRODUCT_APPROVAL_STATUSES).optional(),
    champion_contact_id: z.string().uuid().nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ accountId: string; approvalId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { accountId, approvalId } = await ctx.params;
  if (!UUID_RE.test(accountId) || !UUID_RE.test(approvalId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const canView = await repCanViewSurgicalAccount(uid, accountId);
  if (!canView) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("sales_organization_product_approvals")
    .select("id, organization_id, status, submitted_at, approved_at")
    .eq("id", approvalId)
    .eq("organization_id", accountId)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const p = parsed.data;
  if (!p.status && p.champion_contact_id === undefined && p.notes === undefined) {
    return NextResponse.json({ ok: false, error: "No changes provided." }, { status: 400 });
  }

  if (p.champion_contact_id) {
    const { data: champion, error: championErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id")
      .eq("id", p.champion_contact_id)
      .maybeSingle();
    if (championErr) return NextResponse.json({ ok: false, error: championErr.message }, { status: 500 });
    if (!champion) return NextResponse.json({ ok: false, error: "Champion contact not found." }, { status: 404 });
  }

  const prev = existing as {
    status: OrgProductApprovalStatus;
    submitted_at: string | null;
    approved_at: string | null;
  };
  const nextStatus = (p.status ?? prev.status) as OrgProductApprovalStatus;
  const nowIso = new Date().toISOString();
  const dates = orgProductApprovalStatusSideEffects(nextStatus, prev, nowIso);

  const patch: Record<string, unknown> = { updated_at: nowIso };
  if (p.status !== undefined) {
    patch.status = nextStatus;
    patch.submitted_at = dates.submitted_at;
    patch.approved_at = dates.approved_at;
  }
  if (p.champion_contact_id !== undefined) patch.champion_contact_id = p.champion_contact_id;
  if (p.notes !== undefined) patch.notes = p.notes;

  const { error: updateErr } = await supabaseAdmin
    .from("sales_organization_product_approvals")
    .update(patch)
    .eq("id", approvalId)
    .eq("organization_id", accountId);
  if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });

  const approvals = await loadOrganizationProductApprovals(accountId);
  const updated = approvals.find((a) => a.id === approvalId);
  return NextResponse.json({ ok: true, approval: updated ?? null });
}
