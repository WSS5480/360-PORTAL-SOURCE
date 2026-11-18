import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { authorizeOutboundWorker, outboundDeliveryEnabled } from "@/lib/integrations/outbound/workerAuth";
import { runOutboundWorker } from "@/lib/integrations/outbound/runOutboundWorker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!authorizeOutboundWorker(req.headers.get("authorization"), process.env.INTEGRATION_WORKER_SECRET)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!outboundDeliveryEnabled(process.env.INTEGRATION_OUTBOUND_ENABLED)) {
    return NextResponse.json({ ok: true, processed: 0, delivered: 0, skipped: "outbound_disabled" });
  }

  try {
    const result = await runOutboundWorker(createSupabaseAdminClient(), {
      workerId: `cron-${Date.now()}`,
      limit: 10,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "worker failed";
    return NextResponse.json({ ok: false, error: message.slice(0, 180) }, { status: 500 });
  }
}
