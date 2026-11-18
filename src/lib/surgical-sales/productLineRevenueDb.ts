import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_PRODUCT_LINE_REVENUE_LINE,
  PRODUCT_LINE_REVENUE_MIGRATION,
  PRODUCT_LINE_REVENUE_REGIONS,
  buildProductLineYearView,
  type ProductLineClosedRow,
  type ProductLineQuotaRow,
  type ProductLineRevenueRegion,
  type ProductLineRevenueSource,
  type ProductLineYearView,
} from "@/lib/surgical-sales/productLineRevenue";

export class ProductLineRevenueSchemaMissingError extends Error {
  constructor() {
    super(
      `BioTissue revenue tables are missing. Apply ${PRODUCT_LINE_REVENUE_MIGRATION} in the Supabase SQL editor, then reload.`,
    );
    this.name = "ProductLineRevenueSchemaMissingError";
  }
}

type QuotaDbRow = {
  product_line: string;
  year: number;
  month: number;
  amount: number | string;
};

type ClosedDbRow = {
  product_line: string;
  year: number;
  month: number;
  region: string;
  amount: number | string;
  source: string;
  notes: string | null;
  updated_at?: string | null;
};

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /does not exist/i.test(message) ||
    /schema cache/i.test(message) ||
    /sales_product_line_(quotas|closed)/i.test(message)
  );
}

function throwIfMissing(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (isMissingRelation(error)) throw new ProductLineRevenueSchemaMissingError();
  throw new Error(error.message || "Failed to load product-line revenue");
}

function parseSource(raw: string): ProductLineRevenueSource {
  if (raw === "import" || raw === "derived" || raw === "manual") return raw;
  return "manual";
}

function parseRegion(raw: string): ProductLineRevenueRegion | null {
  return PRODUCT_LINE_REVENUE_REGIONS.includes(raw as ProductLineRevenueRegion)
    ? (raw as ProductLineRevenueRegion)
    : null;
}

function toQuotaRow(row: QuotaDbRow): ProductLineQuotaRow {
  return {
    product_line: String(row.product_line),
    year: Number(row.year),
    month: Number(row.month),
    amount: Number(row.amount),
  };
}

function toClosedRow(row: ClosedDbRow): ProductLineClosedRow | null {
  const region = parseRegion(String(row.region));
  if (!region) return null;
  return {
    product_line: String(row.product_line),
    year: Number(row.year),
    month: Number(row.month),
    region,
    amount: Number(row.amount),
    source: parseSource(String(row.source || "manual")),
    notes: row.notes ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function fetchProductLineYearView(input: {
  productLine?: string;
  year: number;
  now?: Date;
}): Promise<ProductLineYearView> {
  const productLine = (input.productLine || DEFAULT_PRODUCT_LINE_REVENUE_LINE).trim() || DEFAULT_PRODUCT_LINE_REVENUE_LINE;

  const [quotaRes, closedRes] = await Promise.all([
    supabaseAdmin
      .from("sales_product_line_quotas")
      .select("product_line, year, month, amount")
      .eq("product_line", productLine)
      .order("year", { ascending: true })
      .order("month", { ascending: true }),
    supabaseAdmin
      .from("sales_product_line_closed")
      .select("product_line, year, month, region, amount, source, notes, updated_at")
      .eq("product_line", productLine)
      .order("year", { ascending: true })
      .order("month", { ascending: true }),
  ]);

  throwIfMissing(quotaRes.error);
  throwIfMissing(closedRes.error);

  const quotas = ((quotaRes.data || []) as QuotaDbRow[]).map(toQuotaRow);
  const closed = ((closedRes.data || []) as ClosedDbRow[])
    .map(toClosedRow)
    .filter((row): row is ProductLineClosedRow => row != null);

  const availableYears = [...new Set([...quotas.map((r) => r.year), ...closed.map((r) => r.year), input.year])];

  return buildProductLineYearView({
    productLine,
    year: input.year,
    quotas,
    closed,
    availableYears,
    now: input.now,
  });
}

export async function saveProductLineMonthClosed(input: {
  productLine?: string;
  year: number;
  month: number;
  rgv: number;
  laredo: number;
  userId: string;
}): Promise<ProductLineYearView> {
  const productLine = (input.productLine || DEFAULT_PRODUCT_LINE_REVENUE_LINE).trim() || DEFAULT_PRODUCT_LINE_REVENUE_LINE;
  const nowIso = new Date().toISOString();
  const rows = [
    { region: "RGV" as const, amount: input.rgv },
    { region: "Laredo" as const, amount: input.laredo },
  ].map((part) => ({
    product_line: productLine,
    year: input.year,
    month: input.month,
    region: part.region,
    amount: part.amount,
    source: "manual",
    notes: "Entered on admin BioTissue revenue page",
    updated_by_user_id: input.userId,
    updated_at: nowIso,
  }));

  const { error } = await supabaseAdmin.from("sales_product_line_closed").upsert(rows, {
    onConflict: "product_line,year,month,region",
  });
  throwIfMissing(error);

  return fetchProductLineYearView({ productLine, year: input.year });
}
