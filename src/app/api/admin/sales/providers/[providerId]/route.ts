import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { fetchAdminProviderPreviewData } from "@/lib/surgical-sales/admin/fetchAdminProviderPreviewData";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { providerId } = await ctx.params;
  try {
    const preview = await fetchAdminProviderPreviewData(providerId);
    if (!preview) {
      return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, preview });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load provider";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
