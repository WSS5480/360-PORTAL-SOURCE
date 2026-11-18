import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { listActivityEventsForEntity } from "@/lib/activity/activityEventQuery";
import type { ActivityEntityType } from "@/lib/activity/activityEvent";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const QuerySchema = z.object({
  entityType: z.enum(["case", "provider", "opportunity", "organization", "engagement", "task"]),
  entityId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(300).optional(),
});

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    entityType: url.searchParams.get("entityType"),
    entityId: url.searchParams.get("entityId"),
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { entityType, entityId, limit } = parsed.data;
  if (!UUID_RE.test(entityId)) {
    return NextResponse.json({ ok: false, error: "Invalid entity id" }, { status: 400 });
  }

  try {
    const { events, tableAvailable } = await listActivityEventsForEntity({
      entityType: entityType as ActivityEntityType,
      entityId,
      limit,
    });

    return NextResponse.json({
      ok: true,
      events,
      unifiedCount: events.length,
      tableAvailable,
      source: events.length > 0 ? "unified" : "legacy",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load activity events" },
      { status: 500 },
    );
  }
}
