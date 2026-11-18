import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { insertSurgicalCaseBundle } from "@/lib/surgical-sales/createSurgicalCase";
import { loadDocumentTypesForCase } from "@/lib/surgical-sales/caseDocumentWorkflow";
import { buildSurgicalCaseDataWarnings } from "@/lib/surgical-sales/surgicalCaseIntegrity";
import { resolveQuickSurgicalCaseLine } from "@/lib/surgical-sales/resolveQuickSurgicalCaseLine";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { assertProviderLinkedToOrganization } from "@/lib/surgical-sales/crmEntityRelationships";
import { isCaseDateInThePast } from "@/lib/surgical-sales/casePerformedStatus";

export const dynamic = "force-dynamic";

const CASE_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "docs_needed",
  "billing_review",
  "invoiced",
  "closed",
  "cancelled",
] as const;

const QuickCreateSchema = z
  .object({
    account_id: z.string().uuid(),
    case_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    case_time: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? null : v),
      z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/)
        .nullable()
        .optional()
    ),
    product_id: z.string().uuid(),
    surgeon_contact_id: z.string().uuid(),
    expected_revenue: z.number().nonnegative().max(1e12).nullable().optional(),
    confirm_duplicate: z.boolean().optional(),
    status: z.enum(CASE_STATUSES).optional(),
  })
  .strict();

export async function POST(req: Request) {
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

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }

  const parsed = QuickCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const canUseAccount = await repCanViewSurgicalAccount(uid, p.account_id);
  if (!canUseAccount) {
    return NextResponse.json({ ok: false, error: "Account not available for this user" }, { status: 403 });
  }

  const surgeonId = p.surgeon_contact_id;
  const surgeonCheck = await assertProviderLinkedToOrganization(surgeonId, p.account_id);
  if (surgeonCheck) {
    return NextResponse.json({ ok: false, error: surgeonCheck }, { status: 400 });
  }

  const { data: prod, error: pErr } = await supabaseAdmin
    .from("surgical_sales_products")
    .select("id, active")
    .eq("id", p.product_id)
    .maybeSingle();
  if (pErr || !prod || !(prod as { active?: boolean }).active) {
    return NextResponse.json({ ok: false, error: "Product not found or inactive" }, { status: 400 });
  }

  const line = await resolveQuickSurgicalCaseLine({
    repUserId: uid,
    accountId: p.account_id,
    productId: p.product_id,
  });
  if (!line.ok) {
    return NextResponse.json({ ok: false, error: line.message }, { status: 400 });
  }

  let status = p.status ?? "scheduled";
  if (status === "scheduled" && isCaseDateInThePast(p.case_date)) {
    status = "completed";
  }
  const revenue = p.expected_revenue != null && p.expected_revenue !== undefined ? p.expected_revenue : 0;

  const bundle = await insertSurgicalCaseBundle(
    {
      account_id: p.account_id,
      surgeon_contact_id: surgeonId,
      sales_rep_id: uid,
      case_date: p.case_date,
      case_time: p.case_time ?? null,
      procedure_type: null,
      product_id: p.product_id,
      status,
      expected_revenue: revenue,
      notes: null,
      sku_id: line.sku_id,
      expected_quantity: line.expected_quantity,
    },
    uid
  );

  if (!bundle.ok) {
    return NextResponse.json({ ok: false, error: bundle.message }, { status: 500 });
  }

  const docTypes = await loadDocumentTypesForCase(bundle.caseId);
  const warnings = buildSurgicalCaseDataWarnings({
    status,
    hasPurchaseOrder: docTypes.has("purchase_order"),
    expectedRevenue: revenue,
    surgeonContactId: surgeonId,
  });

  return NextResponse.json({
    ok: true,
    case: { id: bundle.caseId, case_number: bundle.caseNumber },
    ...(warnings.length ? { warnings } : {}),
  });
}
