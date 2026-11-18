import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FACILITY_TYPES = ["hospital", "asc", "clinic", "practice", "distributor", "other"] as const;
const FACILITY_STATUSES = ["active", "inactive", "prospect"] as const;

const CreateSchema = z.object({
  name: z.string().trim().min(1, "Facility name is required").max(400),
  surgical_crm_type: z.enum(FACILITY_TYPES),
  surgical_crm_status: z.enum(FACILITY_STATUSES).optional().default("prospect"),
  surgical_crm_billing_city: z.string().trim().max(120).optional().nullable(),
  surgical_crm_billing_state: z.string().trim().max(80).optional().nullable(),
  surgical_crm_phone: z.string().trim().max(80).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const { data: row, error } = await supabaseAdmin
    .from("sales_organizations")
    .insert({
      name: data.name,
      discount_percent: 40,
      surgical_crm_type: data.surgical_crm_type,
      surgical_crm_status: data.surgical_crm_status,
      surgical_crm_billing_city: data.surgical_crm_billing_city || null,
      surgical_crm_billing_state: data.surgical_crm_billing_state || null,
      surgical_crm_phone: data.surgical_crm_phone || null,
      surgical_crm_created_by: auth.ctx.userId,
      surgical_crm_updated_at: new Date().toISOString(),
    })
    .select("id, name, surgical_crm_type, surgical_crm_status, surgical_crm_billing_state")
    .single();

  if (error || !row?.id) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Facility create failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, facility: row });
}
