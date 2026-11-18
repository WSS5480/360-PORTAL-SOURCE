// src/app/api/portal/ivr/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { isPortalCustomer } from "@/lib/portal/portalRoles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { buildIvrIdentifier } from "@/lib/ivr/ivrIdentifier";
import { resolveEmailMode, sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function getPrivateBucket(): string {
  // Set in .env.local (recommended): SUPABASE_PRIVATE_BUCKET=ivr-private
  return envStr("SUPABASE_PRIVATE_BUCKET") || "ivr-private";
}

function sanitizeFilename(name: string): string {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type FileType = "IVR_PDF" | "INSURANCE_CARD" | "CLINICAL_RECORDS";

function parseEmails(csv: string): string[] {
  return (csv || "")
    .split(/[,\n;]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function uploadToStorage(args: { bucket: string; objectPath: string; file: File }) {
  const { bucket, objectPath, file } = args;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from(bucket).upload(objectPath, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) throw new Error(error.message);
}

/**
 * Codes:
 * - FULL mode: ICD-10 + CPT are REQUIRED (at least 1 each)
 * - PDF mode: allowed but optional
 */
const CODE_ITEM = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "Empty code is not allowed");

const CODE_ARRAY_REQUIRED = z.array(CODE_ITEM).min(1, "At least one code is required").max(50, "Too many codes (max 50)");
const CODE_ARRAY_OPTIONAL = z.array(CODE_ITEM).max(50, "Too many codes (max 50)").optional();

/**
 * FULL form schema (no completed PDF uploaded)
 */
const FULL_SCHEMA = z
  .object({
    patient_first_name: z.string().min(1, "patient_first_name is required"),
    patient_last_name: z.string().min(1, "patient_last_name is required"),
    patient_dob: z.string().min(8, "patient_dob is required"),

    patient_address1: z.string().optional().or(z.literal("")),
    patient_city: z.string().optional().or(z.literal("")),
    patient_state: z.string().optional().or(z.literal("")),
    patient_zip: z.string().optional().or(z.literal("")),

    provider_profile_id: z.string().uuid("provider_profile_id is required"),

    primary_insurance: z.string().min(1, "primary_insurance is required"),
    primary_policy: z.string().min(1, "primary_policy is required"),
    secondary_insurance: z.string().optional().or(z.literal("")),
    secondary_policy: z.string().optional().or(z.literal("")),

    facility_name: z.string().optional().or(z.literal("")),
    facility_npi: z.string().optional().or(z.literal("")),
    facility_tax_id: z.string().optional().or(z.literal("")),
    facility_address1: z.string().optional().or(z.literal("")),
    facility_city: z.string().optional().or(z.literal("")),
    facility_state: z.string().optional().or(z.literal("")),
    facility_zip: z.string().optional().or(z.literal("")),
    place_of_service: z.enum(["11", "12", "22", "24", "31", "32", "OTHER"]),
    dos: z.string().optional().or(z.literal("")),

    product: z.string().min(1, "product is required"),
    qcode: z.string().min(1, "qcode is required"),
    units_cm2: z.number().positive("units_cm2 must be > 0"),

    // ✅ REQUIRED in FULL mode
    icd10_codes: CODE_ARRAY_REQUIRED,
    cpt_codes: CODE_ARRAY_REQUIRED,

    hospice_enrolled: z.boolean(),
    phi_authorized: z.literal(true),

    result_emails: z.array(z.string().email()).optional(),
    distributor_name: z.string().optional().or(z.literal("")),
    distributor_email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  })
  .strict();

/**
 * PDF-only schema (completed IVR PDF uploaded)
 */
const PDF_SCHEMA = z
  .object({
    provider_profile_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    phi_authorized: z.literal(true),

    // ✅ allowed but optional in PDF mode
    icd10_codes: CODE_ARRAY_OPTIONAL,
    cpt_codes: CODE_ARRAY_OPTIONAL,

    result_emails: z.array(z.string().email()).optional(),
    distributor_name: z.string().optional().or(z.literal("")),
    distributor_email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  })
  .strict();

export async function POST(req: Request) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;

  if (!ctx.currentAccountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 403 });
  }

  // ✅ Portal submit is for CUSTOMER role only (ORDER_CREATOR).
  // Internal staff should not be using /api/portal routes.
  if (!isPortalCustomer(ctx.currentRole)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Forbidden",
        detail: `Role '${ctx.currentRole || "NONE"}' is not permitted to submit IVR requests.`,
      },
      { status: 403 }
    );
  }

  // Auth user (cookie session)
  const supabase = await supabaseServer();
  const { data: authData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = authData.user;
  const submitterEmail = String(user.email || "").trim() || null;

  // Parse request
  const contentType = req.headers.get("content-type") || "";
  let payload: any = null;

  // Files (optional)
  let ivrPdfFile: File | null = null;
  let insuranceCardFile: File | null = null;
  let clinicalRecordFiles: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    const payloadStr = form.get("payload");
    if (typeof payloadStr !== "string") {
      return NextResponse.json({ ok: false, error: "Missing multipart field: payload (JSON string)" }, { status: 400 });
    }

    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON in payload" }, { status: 400 });
    }

    const f1 = form.get("ivr_pdf");
    if (f1 instanceof File) ivrPdfFile = f1;

    const f2 = form.get("insurance_card");
    if (f2 instanceof File) insuranceCardFile = f2;

    const cr = form.getAll("clinical_records");
    clinicalRecordFiles = cr.filter((x): x is File => x instanceof File);
  } else {
    payload = await req.json().catch(() => null);
  }

  const hasIvrPdf = Boolean(ivrPdfFile);

  // Validate payload (PDF upload changes the rules)
  const schema = hasIvrPdf ? PDF_SCHEMA : FULL_SCHEMA;
  const result = schema.safeParse(payload);

  // ✅ You said you don't like "parsed" – renamed to result/validated for clarity.
  if (!result.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const data = result.data;

  if (data.phi_authorized !== true) {
    return NextResponse.json({ ok: false, error: "PHI authorization is required to submit." }, { status: 400 });
  }

  const rawProvider = (data as any).provider_profile_id;
  const providerProfileId =
    typeof rawProvider === "string" && rawProvider.trim() && rawProvider.trim() !== "" ? rawProvider.trim() : null;

  // Provider snapshot (optional in PDF mode; required in FULL mode)
  let providerSnapshot: Record<string, any> = {};
  if (providerProfileId) {
    const { data: profile } = await supabaseAdmin
      .from("account_provider_profiles")
      .select("*")
      .eq("id", providerProfileId)
      .eq("account_id", ctx.currentAccountId)
      .single();

    if (!profile) {
      return NextResponse.json({ ok: false, error: "Invalid provider profile" }, { status: 400 });
    }

    providerSnapshot = {
      provider_profile_id: profile.id,
      provider_name: profile.provider_name,
      provider_npi: profile.provider_npi,
      provider_tax_id: profile.provider_tax_id,
      provider_ptan: profile.provider_ptan,
      provider_address1: profile.address1,
      provider_city: profile.city,
      provider_state: profile.state,
      provider_zip: profile.zip,
      office_contact_name: profile.office_contact_name,
      office_phone: profile.phone,
      office_phone_ext: profile.phone_ext,
      office_fax: profile.fax,
    };
  }

  // Normalize fields that exist only in FULL_SCHEMA
  const full = data as any;

  const dosValue = !hasIvrPdf && typeof full.dos === "string" && full.dos.trim() ? full.dos.trim() : todayYYYYMMDD();

  // Build IVR identifier (only when we actually have patient fields)
  const ivrIdentifier = hasIvrPdf
    ? null
    : buildIvrIdentifier({
        patient_first_name: full.patient_first_name ?? null,
        patient_last_name: full.patient_last_name ?? null,
        patient_dob: full.patient_dob ?? null,
      });

  const icd10Codes: string[] | null = Array.isArray((data as any).icd10_codes) ? ((data as any).icd10_codes as string[]) : null;
  const cptCodes: string[] | null = Array.isArray((data as any).cpt_codes) ? ((data as any).cpt_codes as string[]) : null;

  // Create IVR request row
  const { data: ivrRow, error: ivrErr } = await supabaseAdmin
    .from("ivr_requests")
    .insert({
      account_id: ctx.currentAccountId,
      submitted_by_user_id: user.id,
      status: "NEW",

      // If PDF-only, these stay null — PDF is the source of truth.
      patient_first_name: hasIvrPdf ? null : full.patient_first_name,
      patient_last_name: hasIvrPdf ? null : full.patient_last_name,
      patient_dob: hasIvrPdf ? null : full.patient_dob,

      ivr_identifier: ivrIdentifier,

      patient_address1: hasIvrPdf ? null : full.patient_address1 || null,
      patient_city: hasIvrPdf ? null : full.patient_city || null,
      patient_state: hasIvrPdf ? null : full.patient_state || null,
      patient_zip: hasIvrPdf ? null : full.patient_zip || null,

      primary_insurance: hasIvrPdf ? null : full.primary_insurance || null,
      primary_policy: hasIvrPdf ? null : full.primary_policy || null,
      secondary_insurance: hasIvrPdf ? null : full.secondary_insurance || null,
      secondary_policy: hasIvrPdf ? null : full.secondary_policy || null,

      facility_name: hasIvrPdf ? null : full.facility_name || null,
      facility_npi: hasIvrPdf ? null : full.facility_npi || null,
      facility_tax_id: hasIvrPdf ? null : full.facility_tax_id || null,
      facility_address1: hasIvrPdf ? null : full.facility_address1 || null,
      facility_city: hasIvrPdf ? null : full.facility_city || null,
      facility_state: hasIvrPdf ? null : full.facility_state || null,
      facility_zip: hasIvrPdf ? null : full.facility_zip || null,
      place_of_service: hasIvrPdf ? null : full.place_of_service || null,
      dos: hasIvrPdf ? null : dosValue,

      product: hasIvrPdf ? null : full.product || null,
      qcode: hasIvrPdf ? null : full.qcode || null,
      units_cm2: hasIvrPdf ? null : (full.units_cm2 ?? null),

      // ✅ New: codes
      // FULL mode: required by schema
      // PDF mode: optional, store if provided
      icd10_codes: icd10Codes ?? null,
      cpt_codes: cptCodes ?? null,

      // PDF-only: do NOT assume hospice; keep null
      hospice_enrolled: hasIvrPdf ? null : Boolean(full.hospice_enrolled),
      phi_authorized: true,
      phi_authorized_at: new Date().toISOString(),

      result_emails: (data as any).result_emails ?? null,
      distributor_name: (data as any).distributor_name || null,
      distributor_email: (data as any).distributor_email || null,
      notes: (data as any).notes || null,

      ...providerSnapshot,
    })
    .select("id,status,created_at,ivr_identifier")
    .single();

  if (ivrErr || !ivrRow?.id) {
    const errMsg = ivrErr?.message || "Unknown error";
    console.error("[IVR submit] ivr_requests insert failed:", errMsg, ivrErr);
    return NextResponse.json(
      { ok: false, error: "Request failed", detail: errMsg },
      { status: 500 }
    );
  }

  const ivrId = String(ivrRow.id);

  // Upload files (optional)
  const insertedFiles: any[] = [];
  const bucket = getPrivateBucket();
  const basePrefix = `ivr/${ctx.currentAccountId}/${ivrId}`;

  async function handleOne(file: File, fileType: FileType) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = sanitizeFilename(file.name || `${fileType}.bin`);
    const objectPath = `${basePrefix}/${fileType}/${ts}-${safeName}`;

    await uploadToStorage({ bucket, objectPath, file });

    const { data: row, error: insErr } = await supabaseAdmin
      .from("ivr_files")
      .insert({
        ivr_request_id: ivrId,
        bucket,
        object_path: objectPath,
        file_type: fileType,
        uploaded_by_user_id: user.id,
      })
      .select("*")
      .single();

    if (insErr || !row) {
      throw new Error(insErr?.message || "Failed to insert ivr_files row");
    }

    insertedFiles.push(row);
  }

  // Only attempt uploads if multipart
  if (contentType.includes("multipart/form-data")) {
    if (ivrPdfFile) await handleOne(ivrPdfFile, "IVR_PDF");
    if (insuranceCardFile) await handleOne(insuranceCardFile, "INSURANCE_CARD");
    for (const f of clinicalRecordFiles) await handleOne(f, "CLINICAL_RECORDS");
  }

  // Email (submitter + staff) — best-effort (never blocks success)
  let emailSentToSubmitter = false;
  let emailSentToStaff = false;
  let emailWarning: string | null = null;

  try {
    const mode = resolveEmailMode();
    if (mode !== "graph") {
      emailWarning = `EMAIL_MODE is '${mode}' — email not sent.`;
    } else {
      if (!submitterEmail) throw new Error("Submitter email is missing on auth user.");

      const appUrl = envStr("NEXT_PUBLIC_APP_URL") || envStr("APP_BASE_URL") || "http://localhost:3000";
      const link = `${appUrl}/portal/ivr/${encodeURIComponent(ivrId)}`;
      const shortId = ivrId.slice(0, 8);

      // ✅ Use identifier ONLY (no patient name, no full UUID request id)
      // If identifier is missing (PDF-only mode), fallback to IVR-<SHORTID>
      const friendlyIdent = String(ivrRow.ivr_identifier || "").trim() || `IVR-${shortId.toUpperCase()}`;

      const identLine = `<p style="margin:0 0 10px 0"><b>IVR Identifier:</b> ${friendlyIdent}</p>`;

      // A) Submitter confirmation
      await sendEmail({
        to: submitterEmail,
        subject: `360 Medical — IVR request submitted (${friendlyIdent})`,
        html:
          `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">` +
          `<h2 style="margin:0 0 8px 0">IVR request submitted</h2>` +
          `<p style="margin:0 0 10px 0">We received your insurance verification request and our team will review it.</p>` +
          identLine +
          `<p style="margin:0 0 12px 0"><a href="${link}">View your request in the portal</a></p>` +
          (hasIvrPdf ? `<p style="margin:0 0 10px 0;color:#444">A completed IVR form PDF was uploaded with this request.</p>` : ``) +
          `<hr style="border:none;border-top:1px solid #e6e6e6;margin:14px 0" />` +
          `<p style="margin:0;color:#666;font-size:12px">If you did not submit this request, please reply to this email.</p>` +
          `</div>`,
        replyTo: envStr("EMAIL_REPLY_TO") || undefined,
        emailType: "ivr",
      });

      emailSentToSubmitter = true;

      // B) 360 staff notification
      const staffTo = parseEmails(envStr("IVR_STAFF_NOTIFY_TO"));
      if (staffTo.length > 0) {
        let accountDisplayName = ctx.currentAccountName;
        if (!accountDisplayName && ctx.currentAccountId) {
          const { data: acct } = await supabaseAdmin.from("accounts").select("name").eq("id", ctx.currentAccountId).maybeSingle();
          accountDisplayName = acct?.name ?? ctx.currentAccountId;
        } else if (!accountDisplayName) {
          accountDisplayName = ctx.currentAccountId ?? "—";
        }
        for (const staffEmail of staffTo) {
          await sendEmail({
            to: staffEmail,
            subject: `NEW IVR request submitted (${friendlyIdent})`,
            html:
              `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">` +
              `<h2 style="margin:0 0 8px 0">New IVR request submitted</h2>` +
              `<p style="margin:0 0 10px 0"><b>Account:</b> ${accountDisplayName}</p>` +
              `<p style="margin:0 0 10px 0"><b>Submitted by:</b> ${submitterEmail}</p>` +
              identLine +
              `<p style="margin:0 0 12px 0"><a href="${link}">Open in portal</a></p>` +
              (hasIvrPdf ? `<p style="margin:0 0 10px 0;color:#444"><b>PDF:</b> Completed IVR form uploaded.</p>` : ``) +
              `<p style="margin:0;color:#666;font-size:12px">Automated notification from 360 Portal.</p>` +
              `</div>`,
            replyTo: envStr("EMAIL_REPLY_TO") || undefined,
            emailType: "ivr",
          });
        }
        emailSentToStaff = true;
      }
    }
  } catch (e: any) {
    emailWarning = "Email delivery failed.";
    console.warn("IVR submit: email send failed");
  }

  return NextResponse.json({
    ok: true,
    ivr: ivrRow,
    files: insertedFiles,
    email: {
      sentToSubmitter: emailSentToSubmitter,
      sentToStaff: emailSentToStaff,
      warning: emailWarning,
    },
  });
}
