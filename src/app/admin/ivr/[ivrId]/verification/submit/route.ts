import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { convertDocxToPdf } from "@/lib/ivr/convertDocxToPdf";
import { sendEmail } from "@/lib/email/sendEmail";
import { generateVerificationDocx } from "@/lib/ivr/generateVerificationDocx";
import { buildIvrIdentifier as buildIvrIdentifierLib } from "@/lib/ivr/ivrIdentifier";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function splitList(raw: string): string[] {
  return raw
    .split(/[,\n;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeStr(v: FormDataEntryValue | null): string {
  return (typeof v === "string" ? v : "").trim();
}

function asCsv(v: unknown): string {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return (v ?? "").toString();
}

function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = (raw ?? "").trim().toLowerCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Strict ISO date validation:
 * - requires YYYY-MM-DD
 * - ensures actual calendar date (no 1952-04-43)
 * Returns a normalized YYYY-MM-DD or null.
 */
function isoDateStrictOrNull(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;

  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }

  return `${m[1]}-${m[2]}-${m[3]}`;
}

async function readStoragePdfAsBuffer(
  supabase: any,
  bucket: string,
  path: string
): Promise<Buffer | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return null;
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function bad(msg: string, req: Request, ivrId: string) {
  const url = urlFromRequest(req, `/admin/ivr/${ivrId}/verification`);
  url.searchParams.set("err", msg);
  return NextResponse.redirect(url, 303);
}

/**
 * ✅ Guard against wrong posted values.
 * If "patient name" fields look like dates or coverage-summary text, fall back to DB values.
 * This specifically prevents "good through / rerun" from showing as the patient name.
 */
function looksLikeIsoDate(s: string): boolean {
  return !!isoDateStrictOrNull((s || "").trim());
}

function looksLikeCoverageSummaryText(s: string): boolean {
  const t = (s || "").trim();
  if (!t) return true;

  // too long for a name part
  if (t.length > 40) return true;

  // ISO date posted into name field (e.g., good_through / rerun_on)
  if (looksLikeIsoDate(t)) return true;

  // common phrases from your templates
  if (/good through|rerun|benefits|eligibility|out[-\s]?of[-\s]?network|prior authorization|not a guarantee/i.test(t)) {
    return true;
  }

  // sentences / punctuation (names generally shouldn't contain these)
  if ((t.match(/[.!?]/g) || []).length >= 1) return true;

  return false;
}

function cleanNamePart(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function pickNamePart(formVal: string, dbVal: string | null | undefined): string {
  const fv = cleanNamePart(formVal);
  if (fv && !looksLikeCoverageSummaryText(fv)) return fv;

  const dv = cleanNamePart(dbVal || "");
  if (dv && !looksLikeCoverageSummaryText(dv)) return dv;

  return "";
}

function pickDobIso(formVal: string, dbVal: string | null | undefined): string | null {
  const fromForm = isoDateStrictOrNull(formVal);
  if (fromForm) return fromForm;
  const fromDb = isoDateStrictOrNull(dbVal || "");
  return fromDb;
}

type IvrRow = {
  id: string;
  status: string;

  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_dob: string | null;

  provider_name: string | null;
  place_of_service: string | null;

  product: string | null;
  qcode: string | null;
  units_cm2: number | null;

  cpt_codes: string[] | null;
  facility_name: string | null;
  icd10_codes: string[] | null;

  primary_insurance: string | null;
  secondary_insurance: string | null;

  result_emails: string[] | null;
  distributor_email: string | null;

  ivr_identifier?: string | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ivrId: string }> | { ivrId: string } }
) {
  const auth = await requireIvrTeamOrAdmin();
  const actorUserId =
    (auth as { user?: { id?: string }; userId?: string })?.user?.id ||
    (auth as { userId?: string }).userId ||
    "";

  const { ivrId } = await Promise.resolve(ctx.params);
  if (!ivrId || !UUID_RE.test(ivrId)) {
    return NextResponse.json({ error: "Invalid ivrId" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const form = await req.formData();

  const mode = safeStr(form.get("mode")) || "generate"; // "generate" | "send"

  const { data: ivr, error: ivrErr } = await (supabase as any)
    .from("ivr_requests")
    .select("*")
    .eq("id", ivrId)
    .single();

  if (ivrErr || !ivr) {
    return NextResponse.json(
      { error: "IVR not found", detail: ivrErr },
      { status: 404 }
    );
  }

  const ivrRow = ivr as IvrRow;

  // Load latest verification (if exists)
  const { data: latest } = await (supabase as any)
    .from("ivr_insurance_verifications")
    .select("*")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestVerificationId: string | null =
    (latest?.id as string | null) || null;

  const bucket =
    safeStr((latest?.pdf_bucket as any)) ||
    process.env.IVR_PRIVATE_BUCKET ||
    "ivr-private";

  // ========= MODE: SEND (Step 3) =========
  if (mode === "send") {
    if (!latest || !latestVerificationId) {
      return bad(
        "No verification record exists yet. Generate the PDF first.",
        req,
        ivrId
      );
    }

    // Use form values when provided (so user can update To/CC before sending without regenerating)
    const formNotifyTo = safeStr(form.get("notify_to"));
    const formNotifyCc = splitList(safeStr(form.get("notify_cc")));
    const notifyTo = formNotifyTo || safeStr((latest?.notify_to as any) ?? "");
    const notifyCc = formNotifyCc.length > 0
      ? formNotifyCc
      : (Array.isArray(latest?.notify_cc) ? (latest?.notify_cc as string[]) : []);
    const pdfPath = safeStr((latest?.pdf_object_path as any) ?? "");

    if (!notifyTo)
      return bad(
        "Missing Notify To. Go back and set recipients, then generate again.",
        req,
        ivrId
      );
    if (!pdfPath)
      return bad(
        "No verification PDF exists yet. Generate the PDF first.",
        req,
        ivrId
      );

    const attachBuf = await readStoragePdfAsBuffer(
      supabase as any,
      bucket,
      pdfPath
    );
    if (!attachBuf)
      return bad("Failed to load the stored PDF from storage.", req, ivrId);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_BASE_URL ||
      req.url.split("/admin/")[0];

    const portalLink = `${baseUrl}/portal`;

    const submissionExtras = [
      ...(Array.isArray(ivrRow.result_emails) ? ivrRow.result_emails : []),
      ...(ivrRow.distributor_email ? [ivrRow.distributor_email] : []),
    ];

    const to = uniq([notifyTo]);
    const cc = uniq([...notifyCc, ...submissionExtras]).filter(
      (e) => !to.includes(e)
    );

    // Use identifier if available, else ivrId
    const fileTag = cleanNamePart(ivrRow.ivr_identifier || "") || ivrId;

    // Persist updated recipients so they don't disappear on next load
    await (supabase as any)
      .from("ivr_insurance_verifications")
      .update({ notify_to: notifyTo, notify_cc: notifyCc })
      .eq("id", latestVerificationId);

    const brandBlue = "#0b5cab";
    await sendEmail({
      to,
      cc,
      emailType: "ivr",
      subject: "360 Medical — Insurance Verification Results",
      text:
        `Insurance verification results are available.\n\n` +
        `The verification PDF is attached.\n\n` +
        `Secure portal link:\n${portalLink}\n\n` +
        `This email does not include patient information in the message body.`,
      html:
        `<p style="font-family:sans-serif;font-size:14px;line-height:1.5;margin:0 0 12px">Insurance verification results are available.</p>` +
        `<p style="font-family:sans-serif;font-size:14px;line-height:1.5;margin:0 0 12px">The verification PDF is attached.</p>` +
        `<p style="font-family:sans-serif;font-size:14px;line-height:1.5;margin:0 0 16px">` +
        `<a href="${portalLink.replace(/"/g, "&quot;")}" style="text-decoration:none;background:${brandBlue};color:white;padding:10px 14px;border-radius:10px;font-weight:800;font-size:13px;display:inline-block">Open 360 Portal</a>` +
        `</p>` +
        `<p style="font-family:sans-serif;font-size:12px;color:#64748b;margin:0">This email does not include patient information in the message body.</p>`,
      attachments: [
        {
          filename: `360_Verification_${fileTag}.pdf`,
          contentType: "application/pdf",
          contentBytesBase64: attachBuf.toString("base64"),
        },
      ],
    });

    await (supabase as any).from("ivr_audit_log").insert({
      ivr_request_id: ivrId,
      actor_user_id: actorUserId,
      action: "INSURANCE_VERIFICATION_EMAIL_SENT",
      metadata: { pdf: "yes" },
    });

    const url = urlFromRequest(req, `/admin/ivr/${ivrId}/verification`);
    url.searchParams.set("flash", "Email sent (PDF attached).");
    return NextResponse.redirect(url, 303);
  }

  // ========= MODE: GENERATE (Step 1) =========
  const notifyTo = safeStr(form.get("notify_to"));
  const notifyCc = splitList(safeStr(form.get("notify_cc")));

  if (!notifyTo) return bad("Notify To is required.", req, ivrId);

  const ivrStatus = safeStr(form.get("ivr_status")) || "COMPLETED";
  if (ivrStatus !== "COMPLETED" && ivrStatus !== "DENIED") {
    return bad("Invalid decision. Choose Approved or Denied.", req, ivrId);
  }

  // ✅ patient name guard (+ ISO date detection + DB fallback)
  const patient_first_name_raw = safeStr(form.get("patient_first_name"));
  const patient_last_name_raw = safeStr(form.get("patient_last_name"));

  const patient_first_name = pickNamePart(patient_first_name_raw, ivrRow.patient_first_name);
  const patient_last_name = pickNamePart(patient_last_name_raw, ivrRow.patient_last_name);

  const patient_dob_raw = safeStr(form.get("patient_dob"));
  const patient_dob = pickDobIso(patient_dob_raw, ivrRow.patient_dob);

  const provider_name = safeStr(form.get("provider_name"));
  const facility_name = safeStr(form.get("facility_name"));
  const product = safeStr(form.get("product"));
  const qcode = safeStr(form.get("qcode"));
  const place_of_service = safeStr(form.get("place_of_service"));

  const dos_raw = safeStr(form.get("dos"));
  const dos = isoDateStrictOrNull(dos_raw);

  const icd10_codes_raw = safeStr(form.get("icd10_codes"));
  const cpt_codes_raw = safeStr(form.get("cpt_codes"));

  const primary_insurance = safeStr(form.get("primary_insurance"));
  const secondary_insurance = safeStr(form.get("secondary_insurance"));

  const icd10_codes = splitList(icd10_codes_raw);
  const cpt_codes = splitList(cpt_codes_raw);

  const header_date_raw =
    safeStr(form.get("header_date")) || new Date().toISOString().slice(0, 10);
  const header_date = isoDateStrictOrNull(header_date_raw);

  const p_name = safeStr(form.get("p_name")) || primary_insurance;
  const p_results = safeStr(form.get("p_results"));
  const p_deductible = safeStr(form.get("p_deductible"));
  const p_deductible_met = safeStr(form.get("p_deductible_met"));
  const p_oop = safeStr(form.get("p_oop"));
  const p_oop_met = safeStr(form.get("p_oop_met"));
  const p_copay = safeStr(form.get("p_copay"));
  const p_coinsurance = safeStr(form.get("p_coinsurance"));

  const missing: string[] = [];
  if (!patient_first_name) missing.push("Patient first name");
  if (!patient_last_name) missing.push("Patient last name");
  if (!patient_dob) missing.push("Patient DOB (must be YYYY-MM-DD and valid)");
  if (!provider_name) missing.push("Provider");
  if (!facility_name) missing.push("Facility");
  if (!product) missing.push("Product");
  if (!qcode) missing.push("Q code");
  if (!place_of_service) missing.push("POS");
  if (!primary_insurance) missing.push("Primary insurance");
  if (icd10_codes.length === 0) missing.push("ICD-10 codes");
  if (cpt_codes.length === 0) missing.push("CPT codes");
  if (!header_date) missing.push("PDF date (must be YYYY-MM-DD and valid)");

  if (!p_name) missing.push("Primary insurance name");
  if (!p_results) missing.push("Primary results");
  if (!p_deductible) missing.push("Primary deductible");
  if (!p_deductible_met) missing.push("Primary deductible met");
  if (!p_oop) missing.push("Primary out-of-pocket");
  if (!p_oop_met) missing.push("Primary out-of-pocket met");
  if (!p_copay) missing.push("Primary co-pay");
  if (!p_coinsurance) missing.push("Primary co-insurance");

  if (missing.length)
    return bad(`Missing required fields: ${missing.join(", ")}`, req, ivrId);

  const existingIdentifier = cleanNamePart((ivrRow as any).ivr_identifier || "");
  const computedIdentifier = buildIvrIdentifierLib({
    patient_first_name,
    patient_last_name,
    patient_dob: patient_dob!,
  });
  const shouldSetIdentifier = !existingIdentifier && computedIdentifier;

  const { error: stErr } = await (supabase as any)
    .from("ivr_requests")
    .update({ status: ivrStatus })
    .eq("id", ivrId);

  if (stErr) return bad("Failed to update IVR status.", req, ivrId);

  const updatePayload: Record<string, any> = {
    patient_first_name,
    patient_last_name,
    patient_dob,
    provider_name,
    facility_name,
    product,
    qcode: qcode || null,
    place_of_service,
    dos: dos || null,
    icd10_codes,
    cpt_codes,
    primary_insurance,
    secondary_insurance,
  };

  if (shouldSetIdentifier && computedIdentifier) {
    updatePayload.ivr_identifier = computedIdentifier;
  }

  const { error: updErr } = await (supabase as any)
    .from("ivr_requests")
    .update(updatePayload)
    .eq("id", ivrId);

  if (updErr) {
    return bad(
      `Failed to update IVR request fields: ${updErr.message || "unknown error"}`,
      req,
      ivrId
    );
  }

  let verificationId: string | null = (latest?.id as string | null) || null;

  if (!verificationId) {
    const { data: createdV, error: vErr } = await (supabase as any)
      .from("ivr_insurance_verifications")
      .insert({
        ivr_request_id: ivrId,
        created_by_user_id: actorUserId,
        notify_to: notifyTo,
        notify_cc: notifyCc,
        results: {},
      })
      .select("id")
      .single();

    if (vErr || !createdV)
      return bad("Failed to create verification row.", req, ivrId);
    verificationId = createdV.id as string;
  }

  const header_status = ivrStatus === "DENIED" ? "DENIED" : "COMPLETED";

  const results = {
    generator_version: "professional-docx-v5",
    header_status,
    header_date: header_date!,

    patient_first_name,
    patient_last_name,
    patient_dob: patient_dob!,
    provider_name,
    facility_name,
    product,
    dos: dos || "",
    place_of_service,
    icd10_codes,
    cpt_codes,
    primary_insurance,
    secondary_insurance,

    p_name,
    p_results,
    p_deductible,
    p_deductible_met,
    p_oop,
    p_oop_met,
    p_copay,
    p_coinsurance,

    s_name: safeStr(form.get("s_name")) || secondary_insurance,
    s_results: safeStr(form.get("s_results")),
    s_deductible: safeStr(form.get("s_deductible")),
    s_deductible_met: safeStr(form.get("s_deductible_met")),
    s_oop: safeStr(form.get("s_oop")),
    s_oop_met: safeStr(form.get("s_oop_met")),
    s_copay: safeStr(form.get("s_copay")),
    s_coinsurance: safeStr(form.get("s_coinsurance")),

    coverage_summary: safeStr(form.get("coverage_summary")),
  };

  const patientName = `${patient_first_name} ${patient_last_name}`.trim();

  const docxBuf = await generateVerificationDocx({
    status: header_status,
    date: header_date!,

    patient_name: patientName || "—",
    patient_dob: patient_dob!,

    provider: provider_name,
    place_of_service: place_of_service,

    product: product,
    qcode: qcode || (ivrRow.qcode ?? "").toString(),
    units_cm2: ivrRow.units_cm2 != null ? String(ivrRow.units_cm2) : "",

    cpt_codes: asCsv(cpt_codes),
    facility: facility_name,
    icd10_codes: asCsv(icd10_codes),

    primary: {
      name: p_name,
      results: p_results,
      deductible: p_deductible,
      deductible_met: p_deductible_met,
      oop: p_oop,
      oop_met: p_oop_met,
      copay: p_copay,
      coinsurance: p_coinsurance,
    },
    secondary: {
      name: safeStr((results as any).s_name),
      results: safeStr((results as any).s_results),
      deductible: safeStr((results as any).s_deductible),
      deductible_met: safeStr((results as any).s_deductible_met),
      oop: safeStr((results as any).s_oop),
      oop_met: safeStr((results as any).s_oop_met),
      copay: safeStr((results as any).s_copay),
      coinsurance: safeStr((results as any).s_coinsurance),
    },

    coverage_summary: safeStr((results as any).coverage_summary),
  });

  let pdfBuf: Buffer | null = null;
  let pdfErr: string | null = null;
  try {
    pdfBuf = await convertDocxToPdf(docxBuf);
  } catch (e) {
    pdfErr = (e instanceof Error ? e.message : String(e)) || "Unknown error";
    console.error("[IVR verification] PDF conversion failed:", pdfErr, e);
    pdfBuf = null;
  }

  if (!pdfBuf) {
    const msg = pdfErr
      ? `PDF conversion failed: ${pdfErr}`
      : "PDF conversion failed. Try again.";
    // Truncate for URL param (browsers limit ~2k; keep first 300 chars)
    const msgForUrl = msg.length > 300 ? msg.slice(0, 297) + "…" : msg;
    return bad(msgForUrl, req, ivrId);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const basePath = `ivr/${ivrId}/verification/${verificationId}`;

  const docxPath = `${basePath}/verification_results_${stamp}.docx`;
  const { error: upDocxErr } = await (supabase as any).storage
    .from(bucket)
    .upload(docxPath, docxBuf, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });

  let probeInfo = "";
  if (upDocxErr && /not valid JSON|Unexpected token '<'/.test(upDocxErr.message || "")) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const storageUrl = `${baseUrl.replace(/\/$/, "")}/storage/v1/bucket`;
    try {
      const probe = await fetch(storageUrl, {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        },
      });
      const text = await probe.text();
      const bodyPreview = (text.slice(0, 50) || "(empty)").replace(/[\s\n]+/g, " ");
      probeInfo = ` [Probe status=${probe.status} body=${bodyPreview}]`;
      console.error("[IVR verification] Storage probe:", storageUrl, probe.status, text.slice(0, 200));
    } catch (probeErr) {
      probeInfo = ` [Probe failed: ${probeErr instanceof Error ? probeErr.message : String(probeErr)}]`;
    }
  }

  if (upDocxErr) {
    const detail = upDocxErr?.message || String(upDocxErr);
    console.error("[IVR verification] DOCX upload failed:", detail, "bucket:", bucket);
    const hint =
      /not valid JSON|Unexpected token '<'/.test(detail)
        ? " (Storage may be returning HTML—check that the storage service is running and Kong routes /storage/v1 correctly. For self-hosted, try SUPABASE_STORAGE_URL if storage is on a different URL.)"
        : "";
    return bad(`Failed to upload DOCX: ${detail}${hint}${probeInfo}`, req, ivrId);
  }

  const pdfPath = `${basePath}/verification_results_${stamp}.pdf`;
  const { error: upPdfErr } = await (supabase as any).storage
    .from(bucket)
    .upload(pdfPath, pdfBuf, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (upPdfErr) {
    const detail = upPdfErr?.message || String(upPdfErr);
    console.error("[IVR verification] PDF upload failed:", detail, "bucket:", bucket);
    const hint =
      /not valid JSON|Unexpected token '<'/.test(detail)
        ? " (Storage may be returning HTML—check that the storage service is running and Kong routes /storage/v1 correctly. For self-hosted, try SUPABASE_STORAGE_URL if storage is on a different URL.)"
        : "";
    return bad(`Failed to upload PDF: ${detail}${hint}`, req, ivrId);
  }

  const { error: saveErr } = await (supabase as any)
    .from("ivr_insurance_verifications")
    .update({
      notify_to: notifyTo,
      notify_cc: notifyCc,
      results,
      pdf_bucket: bucket,
      pdf_object_path: pdfPath,
    })
    .eq("id", verificationId);

  if (saveErr) return bad("Failed to save verification.", req, ivrId);

  await (supabase as any).from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    actor_user_id: actorUserId,
    action: "INSURANCE_VERIFICATION_RESULTS_GENERATED",
    metadata: {
      generator: "professional-docx-v5",
      pdf: "yes",
      ivr_identifier_set: shouldSetIdentifier ? "yes" : "no",
    },
  });

  const url = urlFromRequest(req, `/admin/ivr/${ivrId}/verification`);
  url.searchParams.set(
    "flash",
    shouldSetIdentifier
      ? "PDF generated. Identifier created."
      : "PDF generated. Preview it, then send email."
  );
  return NextResponse.redirect(url, 303);
}
