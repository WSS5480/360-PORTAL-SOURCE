import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { suggestCompanyWebsiteSpecialties } from "@/lib/admin/companyWebsiteSpecialtySuggestions";

export const dynamic = "force-dynamic";

const Schema = z.object({
  website: z.string().trim().min(1).max(500),
  companyName: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "A website is required" }, { status: 400 });
  }

  try {
    const result = await suggestCompanyWebsiteSpecialties({
      website: parsed.data.website,
      companyName: parsed.data.companyName,
    });
    return NextResponse.json({
      ok: true,
      suggestions: result.suggestions,
      productSuggestions: result.productSuggestions,
      matched: result.matched,
      productMatched: result.productMatched,
      siteUrl: result.siteUrl,
      method: result.method,
      pagesScanned: result.pagesScanned,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not analyze the website";
    const status = message.startsWith("HTTP ") ? 502 : message.includes("valid public website") ? 400 : 502;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
