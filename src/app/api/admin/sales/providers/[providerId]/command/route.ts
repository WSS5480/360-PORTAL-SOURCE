import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { resolveAdminProviderSalesRepId } from "@/lib/surgical-sales/admin/resolveAdminProviderSalesRepId";
import { loadProviderProfilePayload } from "@/lib/surgical-sales/loadProviderProfilePayload";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDeferSections(req: Request): Set<string> {
  const raw = new URL(req.url).searchParams.get("defer") || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const salesRepId = await resolveAdminProviderSalesRepId(providerId);
  if (!salesRepId) {
    return NextResponse.json(
      { ok: false, error: "No assigned sales rep found for this provider." },
      { status: 404 },
    );
  }

  const result = await loadProviderProfilePayload({
    providerId,
    salesRepId,
    defer: parseDeferSections(req),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
