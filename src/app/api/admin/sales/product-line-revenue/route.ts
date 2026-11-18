import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { DEFAULT_PRODUCT_LINE_REVENUE_LINE } from "@/lib/surgical-sales/productLineRevenue";
import {
  ProductLineRevenueSchemaMissingError,
  fetchProductLineYearView,
  saveProductLineMonthClosed,
} from "@/lib/surgical-sales/productLineRevenueDb";

export const dynamic = "force-dynamic";

const YearSchema = z.coerce.number().int().min(2000).max(2100);
const SaveSchema = z.object({
  productLine: z.string().trim().min(1).max(80).optional(),
  year: YearSchema,
  month: z.number().int().min(1).max(12),
  rgv: z.number().nonnegative().max(1e9),
  laredo: z.number().nonnegative().max(1e9),
});

function fail(error: unknown) {
  if (error instanceof ProductLineRevenueSchemaMissingError) {
    return NextResponse.json({ ok: false, error: error.message, needs_migration: true }, { status: 503 });
  }
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "Failed to load BioTissue revenue" },
    { status: 500 },
  );
}

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const yearParsed = YearSchema.safeParse(url.searchParams.get("year") || new Date().getUTCFullYear());
  if (!yearParsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid year" }, { status: 400 });
  }
  const productLine = (url.searchParams.get("productLine") || DEFAULT_PRODUCT_LINE_REVENUE_LINE).trim();

  try {
    const view = await fetchProductLineYearView({ productLine, year: yearParsed.data });
    return NextResponse.json({ ok: true, view });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const raw = await req.json().catch(() => null);
  const parsed = SaveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter RGV and Laredo amounts as dollars (0 or more)." }, { status: 400 });
  }

  try {
    const view = await saveProductLineMonthClosed({
      productLine: parsed.data.productLine,
      year: parsed.data.year,
      month: parsed.data.month,
      rgv: parsed.data.rgv,
      laredo: parsed.data.laredo,
      userId: auth.ctx.userId,
    });
    return NextResponse.json({ ok: true, view });
  } catch (error) {
    return fail(error);
  }
}
