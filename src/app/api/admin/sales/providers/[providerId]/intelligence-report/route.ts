import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { fetchAdminProviderReportCorpus } from "@/lib/surgical-sales/admin/fetchAdminProviderPreviewData";
import { generateAdminProviderIntelligenceReport } from "@/lib/surgical-sales/admin/generateAdminProviderIntelligenceReport";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { providerId } = await ctx.params;
  try {
    const corpus = await fetchAdminProviderReportCorpus(providerId);
    if (!corpus) {
      return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
    }
    const { report, used_ai } = await generateAdminProviderIntelligenceReport(corpus);
    return NextResponse.json({ ok: true, report, used_ai });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to generate report";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
