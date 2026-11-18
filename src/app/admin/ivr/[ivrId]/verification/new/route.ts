import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeEmailList(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    // support comma/newline-separated string
    return v
      .split(/[,\n;]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function applyTemplate(template: string, ctx: Record<string, any>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, path) => {
    const parts = String(path).split(".");
    let cur: any = ctx;
    for (const p of parts) cur = cur?.[p];
    if (cur == null) return "";
    if (Array.isArray(cur)) return cur.join(", ");
    if (typeof cur === "object") return JSON.stringify(cur);
    return String(cur);
  });
}

async function buildPdfBytes(payload: {
  ivr_snapshot: Record<string, any>;
  primary: Record<string, any>;
  secondary: Record<string, any>;
  coverage_summary: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 748;
  const xLabel = 50;
  const xVal = 240;

  const draw = (text: string, x: number, yPos: number, bold = false, size = 10) => {
    page.drawText(text || "", { x, y: yPos, size, font: bold ? fontBold : font });
  };

  const kv = (label: string, value: any) => {
    draw(label, xLabel, y, true, 10);
    draw(value ? String(value) : "—", xVal, y, false, 10);
    y -= 14;
  };

  const s = payload.ivr_snapshot;

  draw("360 Medical — Insurance Verification Results", 50, y, true, 14);
  y -= 22;

  kv("Patient Name:", s.patient_name);
  kv("Date of Birth:", s.dob);
  kv("Status:", s.status);
  kv("Date:", s.date);
  kv("Provider:", s.provider);
  kv("Place of Service:", s.place_of_service);
  kv("Product:", s.product);
  kv("CPT Codes:", s.cpt_codes);
  kv("Facility:", s.facility);
  kv("ICD-10 Diagnosis Codes:", s.icd10_codes);

  y -= 8;
  draw("Primary Insurance", 50, y, true, 12);
  y -= 16;

  const p = payload.primary;
  kv("Primary Insurance Name:", p.insurance_name);
  kv("Results:", p.results);
  kv("Deductible:", p.deductible);
  kv("Deductible Met:", p.deductible_met);
  kv("Out-of-Pocket:", p.out_of_pocket);
  kv("Out-of-Pocket Met:", p.out_of_pocket_met);
  kv("Co-Pay:", p.co_pay);
  kv("Co-Insurance:", p.co_insurance);

  y -= 8;
  draw("Secondary Insurance", 50, y, true, 12);
  y -= 16;

  const sec = payload.secondary;
  kv("Secondary Insurance Name:", sec.insurance_name);
  kv("Results:", sec.results);
  kv("Deductible:", sec.deductible);
  kv("Deductible Met:", sec.deductible_met);
  kv("Out-of-Pocket:", sec.out_of_pocket);
  kv("Out-of-Pocket Met:", sec.out_of_pocket_met);
  kv("Co-Pay:", sec.co_pay);
  kv("Co-Insurance:", sec.co_insurance);

  y -= 8;
  draw("Coverage Summary Results", 50, y, true, 12);
  y -= 16;

  const summary = payload.coverage_summary || "";
  const maxWidth = 512;
  const words = summary.split(/\s+/);
  let lineBuf = "";

  const measure = (t: string) => font.widthOfTextAtSize(t, 10);

  for (const w of words) {
    const next = lineBuf ? `${lineBuf} ${w}` : w;
    if (measure(next) > maxWidth) {
      draw(lineBuf, 50, y, false, 10);
      y -= 14;
      lineBuf = w;
      if (y < 60) break;
    } else {
      lineBuf = next;
    }
  }
  if (lineBuf && y >= 60) draw(lineBuf, 50, y, false, 10);

  return await pdf.save();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ivrId: string }> | { ivrId: string } }
) {
  const admin = await requireAdmin();
  const actorUserId = (admin as any)?.userId || (admin as any)?.user?.id || "";

  const { ivrId } = await Promise.resolve(params);
  if (!UUID_RE.test(ivrId)) {
    return NextResponse.json({ error: "Invalid ivrId" }, { status: 400 });
  }

  const form = await req.formData();

  // Cast to any to avoid stale generated types issues
  const supabase: any = createSupabaseAdminClient();

  // Load IVR fields needed for snapshot/PDF
  const { data: ivr, error: ivrErr } = await supabase
    .from("ivr_requests")
    .select(
      "id,status,created_at,submitted_by_user_id,patient_first_name,patient_last_name,patient_dob,provider_name,facility_name,place_of_service,codes,diagnosis_codes,product"
    )
    .eq("id", ivrId)
    .single();

  if (ivrErr || !ivr) return NextResponse.json({ error: "IVR not found" }, { status: 404 });

  // Resolve submitter login email (TO)
  const userRes = await supabase.auth.admin.getUserById(ivr.submitted_by_user_id);
  const toEmail = userRes?.data?.user?.email || "";
  if (!toEmail) {
    return NextResponse.json({ error: "Unable to resolve submitter email" }, { status: 500 });
  }

  // Pull CC emails from most recent existing verification row (your source of truth)
  const { data: latestV } = await supabase
    .from("ivr_insurance_verifications")
    .select("results_email, results_emails, distributor_email")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const resultsEmailList =
    normalizeEmailList(latestV?.results_email) || normalizeEmailList(latestV?.results_emails);

  const distributorEmail = (latestV?.distributor_email || "").trim();
  const cc = [
    ...resultsEmailList,
    ...(distributorEmail ? [distributorEmail] : []),
  ];

  const templateId = String(form.get("coverage_template_id") || "").trim() || null;
  const coverageSummaryRaw = String(form.get("coverage_summary") || "").trim();

  const patientName = [ivr.patient_first_name, ivr.patient_last_name]
    .map((s: any) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ");

  const ivrSnapshot = {
    patient_name: patientName,
    dob: ivr.patient_dob || "",
    status: ivr.status || "",
    date: ivr.created_at ? String(ivr.created_at) : "",
    provider: ivr.provider_name || "",
    place_of_service: ivr.place_of_service || "",
    product: ivr.product || "",
    cpt_codes: ivr.codes || "",
    facility: ivr.facility_name || "",
    icd10_codes: ivr.diagnosis_codes || "",
  };

  const primary = {
    insurance_name: String(form.get("primary_insurance_name") || "").trim(),
    results: String(form.get("primary_results") || "").trim(),
    deductible: String(form.get("primary_deductible") || "").trim(),
    deductible_met: String(form.get("primary_deductible_met") || "").trim(),
    out_of_pocket: String(form.get("primary_out_of_pocket") || "").trim(),
    out_of_pocket_met: String(form.get("primary_out_of_pocket_met") || "").trim(),
    co_pay: String(form.get("primary_co_pay") || "").trim(),
    co_insurance: String(form.get("primary_co_insurance") || "").trim(),
  };

  const secondary = {
    insurance_name: String(form.get("secondary_insurance_name") || "").trim(),
    results: String(form.get("secondary_results") || "").trim(),
    deductible: String(form.get("secondary_deductible") || "").trim(),
    deductible_met: String(form.get("secondary_deductible_met") || "").trim(),
    out_of_pocket: String(form.get("secondary_out_of_pocket") || "").trim(),
    out_of_pocket_met: String(form.get("secondary_out_of_pocket_met") || "").trim(),
    co_pay: String(form.get("secondary_co_pay") || "").trim(),
    co_insurance: String(form.get("secondary_co_insurance") || "").trim(),
  };

  let coverageSummaryFinal = coverageSummaryRaw;

  if (templateId) {
    const { data: tmpl } = await supabase
      .from("ivr_coverage_templates")
      .select("id,body")
      .eq("id", templateId)
      .eq("is_active", true)
      .maybeSingle();

    if (tmpl?.body) {
      const ctx = { ...ivrSnapshot, primary, secondary };
      const rendered = applyTemplate(tmpl.body, ctx);
      coverageSummaryFinal = coverageSummaryRaw ? `${rendered}\n\n${coverageSummaryRaw}` : rendered;
    }
  }

  const results = {
    ivr_snapshot: ivrSnapshot,
    primary,
    secondary,
    coverage_summary: coverageSummaryFinal,
    coverage_template_id: templateId,
  };

  // Create verification record (stores who we notified for audit)
  const { data: created, error: createErr } = await supabase
    .from("ivr_insurance_verifications")
    .insert({
      ivr_request_id: ivrId,
      created_by_user_id: actorUserId,
      notify_to: toEmail,
      notify_cc: cc,
      results,
      // preserve your recipient fields (source-of-truth)
      results_email: resultsEmailList,
      distributor_email: distributorEmail || null,
    })
    .select("id")
    .single();

  if (createErr || !created) {
    return NextResponse.json({ error: "Failed to create verification" }, { status: 500 });
  }

  await supabase.from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    actor_user_id: actorUserId,
    action: "INSURANCE_VERIFICATION_CREATED",
    metadata: { verification_id: created.id },
  });

  // Generate and store PDF
  const pdfBytes = await buildPdfBytes({
    ivr_snapshot: ivrSnapshot,
    primary,
    secondary,
    coverage_summary: coverageSummaryFinal,
  });

  const bucket = process.env.IVR_PRIVATE_BUCKET || "ivr-private";
  const objectPath = `ivr/${ivrId}/verification/${created.id}/insurance-verification-results.pdf`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (!upErr) {
    await supabase
      .from("ivr_insurance_verifications")
      .update({ pdf_bucket: bucket, pdf_object_path: objectPath })
      .eq("id", created.id);
  }

  // Queue email (NO PHI)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const portalLink = appUrl ? `${appUrl}/portal/ivr` : "/portal/ivr";

  await supabase.from("ivr_email_outbox").insert({
    type: "IVR_VERIFICATION_READY",
    to_email: toEmail,
    cc_emails: cc,
    subject: "360 Medical: Insurance verification results available",
    body_text:
      "Insurance verification results are available in the 360 Medical portal.\n\n" +
      `Sign in to view securely: ${portalLink}\n\n` +
      "No protected health information is included in this email.",
    metadata: { ivr_request_id: ivrId, verification_id: created.id },
  });

  return NextResponse.redirect(urlFromRequest(req, `/admin/ivr/${ivrId}`));
}
