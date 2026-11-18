import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { deleteProviderActivityItem } from "@/lib/surgical-sales/deleteProviderActivityItem";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const QuerySchema = z.object({
  entityType: z.enum(["provider"]),
  entityId: z.string().uuid(),
});

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> },
) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await ctx.params;
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    entityType: url.searchParams.get("entityType"),
    entityId: url.searchParams.get("entityId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { entityId } = parsed.data;
  if (!UUID_RE.test(entityId) || !String(eventId ?? "").trim()) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const result = await deleteProviderActivityItem({
    providerId: entityId,
    eventId: decodeURIComponent(String(eventId)),
    userId: auth.user.id,
    entityType: "provider",
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status ?? 400 });
  }

  return NextResponse.json({ ok: true });
}
