import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  category: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(4000).optional().default(""),
  active: z.boolean().optional().default(true),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Product name is required").max(200).optional(),
  category: z.string().trim().max(120).optional(),
  description: z.string().trim().max(4000).optional(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, category, description, active } = parsed.data;
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_products")
    .insert({
      name,
      category,
      description: description || null,
      active,
      updated_at: new Date().toISOString(),
    })
    .select("id, name, category, active, updated_at")
    .single();

  if (error || !data?.id) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Product create failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product: data });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.name !== undefined) update.name = rest.name;
  if (rest.category !== undefined) update.category = rest.category;
  if (rest.description !== undefined) update.description = rest.description || null;
  if (rest.active !== undefined) update.active = rest.active;

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_products")
    .update(update)
    .eq("id", id)
    .select("id, name, category, active, updated_at")
    .single();

  if (error || !data?.id) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Product update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product: data });
}
