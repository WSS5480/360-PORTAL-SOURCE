// src/app/admin/fulfillments/[fulfillmentId]/packing-slip/page.tsx
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ fulfillmentId: string }>;
}) {
  await requireOrdersStaffOrAdmin();

  const resolved = await params;
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    redirect(`/admin/fulfillments?error=${encodeURIComponent("Invalid fulfillmentId")}`);
  }

  // Load fulfillment metadata.packing_slip
  const { data: f, error } = await supabaseAdmin
    .from("fulfillments")
    .select("id, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (error || !f) {
    redirect(
      `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}?error=${encodeURIComponent(
        error?.message || "Fulfillment not found"
      )}`
    );
  }

  const meta: any = typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
  const ps: any = meta?.packing_slip ?? {};

  const bucket = safeStr(ps?.bucket) || "order-private";
  const path = safeStr(ps?.path);

  if (!path) {
    // not generated yet
    redirect(
      `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}?error=${encodeURIComponent(
        "Packing slip not generated yet. Click Generate first."
      )}`
    );
  }

  // Create signed URL and redirect browser to the PDF
  const { data: signed, error: sErr } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);

  if (sErr || !signed?.signedUrl) {
    redirect(
      `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}?error=${encodeURIComponent(
        sErr?.message || "Failed to create signed URL"
      )}`
    );
  }

  redirect(signed.signedUrl);
}
