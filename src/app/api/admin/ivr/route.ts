// src/app/api/admin/ivr/route.ts
import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["NEW", "IN_REVIEW", "SUBMITTED", "COMPLETED", "DENIED", "ALL"]);

function safeStr(v: string | null) {
  return (v || "").trim();
}

function ms(s?: string | null): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isoOrNull(s?: string | null): string | null {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function uniqStrings(xs: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const s = String(x || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export async function GET(req: Request) {
  const auth = await requireIvrTeamOrAdmin();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);

  const statusRaw = (url.searchParams.get("status") || "NEW").toUpperCase();
  const status = ALLOWED_STATUSES.has(statusRaw) ? statusRaw : "NEW";

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "50"), 10), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") || "0"), 0);

  const q = safeStr(url.searchParams.get("q"));
  const hasUploads = url.searchParams.get("has_uploads") === "1";
  const hasPdf = url.searchParams.get("has_pdf") === "1";

  const supabaseAdmin: any = createSupabaseAdminClient();

  // Step 1: if searching, resolve matching account_ids by name
  let accountIdsFromSearch: string[] = [];
  if (q) {
    const { data: accs } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .ilike("name", `%${q}%`)
      .limit(200);

    accountIdsFromSearch = (accs ?? []).map((a: any) => a.id).filter(Boolean);
  }

  // Step 2: build IVR query (include submitted_by_user_id + ivr_identifier)
  let ivrQ = supabaseAdmin
    .from("ivr_requests")
    .select(
      `
      id,
      created_at,
      status,
      account_id,
      submitted_by_user_id,
      ivr_identifier,
      patient_first_name,
      patient_last_name,
      primary_insurance,
      primary_policy,
      product,
      qcode,
      place_of_service,
      additional_info_requested_at,
      additional_info_submitted_at,
      accounts:accounts(name)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "ALL") {
    ivrQ = ivrQ.eq("status", status);
  }

  if (q) {
    const orParts: string[] = [
      `ivr_identifier.ilike.%${q}%`,
      `patient_first_name.ilike.%${q}%`,
      `patient_last_name.ilike.%${q}%`,
      `primary_insurance.ilike.%${q}%`,
      `primary_policy.ilike.%${q}%`,
      `product.ilike.%${q}%`,
      `qcode.ilike.%${q}%`,
      `place_of_service.ilike.%${q}%`,
    ];

    if (accountIdsFromSearch.length) {
      orParts.push(`account_id.in.(${accountIdsFromSearch.join(",")})`);
    }

    ivrQ = ivrQ.or(orParts.join(","));
  }

  const { data: ivrs, error: ivrErr, count } = await ivrQ;

  if (ivrErr) {
    return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  }

  const rows = (ivrs ?? []) as any[];
  const ivrIds = rows.map((r) => r.id).filter(Boolean);

  if (ivrIds.length === 0) {
    return NextResponse.json({ ok: true, data: [], count: count ?? 0, limit, offset });
  }

  // Step 2.5: lookup submitter info (name/email) from user_profiles (REAL schema: user_id)
  const submitterIds = uniqStrings(rows.map((r) => r.submitted_by_user_id));
  const submitterById: Record<string, { name: string | null; email: string | null }> = {};

  if (submitterIds.length) {
    const { data: prof } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, email")
      .in("user_id", submitterIds)
      .limit(500);

    for (const p of prof ?? []) {
      const uid = String((p as any).user_id || "").trim();
      if (!uid) continue;
      submitterById[uid] = {
        name: (p as any).full_name ? String((p as any).full_name).trim() : null,
        email: (p as any).email ? String((p as any).email).trim() : null,
      };
    }
  }

  // Step 3: upload counts (ivr_files)
  const { data: fileRows, error: fileErr } = await supabaseAdmin
    .from("ivr_files")
    .select("ivr_request_id")
    .in("ivr_request_id", ivrIds);

  if (fileErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  const uploadCountByIvr: Record<string, number> = {};
  for (const fr of fileRows ?? []) {
    const id = (fr as any).ivr_request_id;
    if (!id) continue;
    uploadCountByIvr[id] = (uploadCountByIvr[id] || 0) + 1;
  }

  // Step 4: latest verification per IVR (pdf presence + id)
  const { data: verRows, error: verErr } = await supabaseAdmin
    .from("ivr_insurance_verifications")
    .select("id, ivr_request_id, created_at, pdf_object_path")
    .in("ivr_request_id", ivrIds)
    .order("created_at", { ascending: false });

  if (verErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  const latestByIvr: Record<string, { id: string; created_at: string | null; has_pdf: boolean }> = {};
  for (const v of verRows ?? []) {
    const id = (v as any).ivr_request_id;
    if (!id || latestByIvr[id]) continue;
    latestByIvr[id] = {
      id: (v as any).id,
      created_at: (v as any).created_at ?? null,
      has_pdf: Boolean((v as any).pdf_object_path),
    };
  }

  // Step 4.5: latest "viewed" per IVR (only needed for unread badge)
  const { data: viewedRows, error: viewedErr } = await supabaseAdmin
    .from("ivr_audit_log")
    .select("ivr_request_id, created_at")
    .in("ivr_request_id", ivrIds)
    .eq("action", "ADDITIONAL_INFO_VIEWED")
    .order("created_at", { ascending: false });

  if (viewedErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  const latestViewedAtByIvr: Record<string, string | null> = {};
  for (const vr of viewedRows ?? []) {
    const id = (vr as any).ivr_request_id;
    if (!id || latestViewedAtByIvr[id]) continue;
    latestViewedAtByIvr[id] = isoOrNull((vr as any).created_at ?? null);
  }

  // Step 5: build output rows
  let out = rows.map((r) => {
    const accountName =
      Array.isArray(r.accounts) && r.accounts.length ? r.accounts[0]?.name ?? null : r.accounts?.name ?? null;

    const latest = latestByIvr[r.id];

    const requestedAt = isoOrNull(r.additional_info_requested_at ?? null);
    const providedAt = isoOrNull(r.additional_info_submitted_at ?? null);
    const viewedAt = latestViewedAtByIvr[r.id] ?? null;

    const reqMs = ms(requestedAt);
    const provMs = ms(providedAt);
    const viewMs = ms(viewedAt);

    const needsAdditionalInfo = Boolean(reqMs) && (!provMs || provMs < reqMs);
    const customerResponded = Boolean(reqMs && provMs && provMs >= reqMs);
    const responseUnread = Boolean(customerResponded && provMs && (!viewMs || viewMs < provMs));

    const submitterId = r.submitted_by_user_id ?? null;
    const submitter = submitterId ? submitterById[String(submitterId)] : undefined;

    return {
      id: r.id,
      created_at: r.created_at ?? null,
      status: r.status ?? null,

      account_id: r.account_id ?? null,
      account_name: accountName,

      submitted_by_user_id: submitterId,
      submitted_by_user_name: submitter?.name ?? null,
      submitted_by_user_email: submitter?.email ?? null,

      ivr_identifier: r.ivr_identifier ?? null,

      patient_first_name: r.patient_first_name ?? null,
      patient_last_name: r.patient_last_name ?? null,

      primary_insurance: r.primary_insurance ?? null,
      product: r.product ?? null,
      place_of_service: r.place_of_service ?? null,

      upload_count: uploadCountByIvr[r.id] || 0,

      has_results_pdf: latest ? latest.has_pdf : false,
      latest_verification_id: latest ? latest.id : null,
      latest_verification_created_at: latest ? latest.created_at : null,

      needs_additional_info: needsAdditionalInfo,
      customer_responded: customerResponded,
      response_unread: responseUnread,
      latest_info_requested_at: requestedAt,
      latest_info_provided_at: providedAt,
      latest_info_viewed_at: viewedAt,
    };
  });

  // Step 6: child-table filters
  if (hasUploads) out = out.filter((r) => (r.upload_count || 0) > 0);
  if (hasPdf) out = out.filter((r) => r.has_results_pdf);

  const correctedCount = hasUploads || hasPdf ? out.length : (count ?? 0);

  return NextResponse.json({
    ok: true,
    data: out,
    count: correctedCount,
    limit,
    offset,
  });
}
