import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function splitList(raw: string): string[] {
  return raw
    .split(/[,\n;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumericOrNull(v: string): number | null {
  const s = (v || "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isValidUtcYmd(y: number, mo: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === mo && dt.getUTCDate() === d;
}

function toYmd(y: number, mo: number, d: number): string {
  const mm = String(mo).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Accepts:
 *  - YYYY-MM-DD
 *  - MM/DD/YYYY
 *  - MM-DD-YYYY
 * Returns YYYY-MM-DD or null.
 */
function parseDateFlexible(raw: string): { value: string | null; invalidRaw: string | null } {
  const s = (raw || "").trim();
  if (!s) return { value: null, invalidRaw: null };

  // YYYY-MM-DD
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (isValidUtcYmd(y, mo, d)) return { value: s, invalidRaw: null };
    return { value: null, invalidRaw: s };
  }

  // MM/DD/YYYY
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    const y = Number(m[3]);
    if (isValidUtcYmd(y, mo, d)) return { value: toYmd(y, mo, d), invalidRaw: null };
    return { value: null, invalidRaw: s };
  }

  // MM-DD-YYYY
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
  if (m) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    const y = Number(m[3]);
    if (isValidUtcYmd(y, mo, d)) return { value: toYmd(y, mo, d), invalidRaw: null };
    return { value: null, invalidRaw: s };
  }

  return { value: null, invalidRaw: s };
}

async function uploadOne(supabase: any, bucket: string, objectPath: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (upErr) throw upErr;
}

function normEmail(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

type SelectedPerson =
  | { kind: "ACCOUNT_USER"; id: string } // account_contacts.id
  | { kind: "PORTAL_MEMBER"; id: string } // auth.users.id
  | null;

function parseSelectedPerson(raw: string): SelectedPerson {
  const s = String(raw || "").trim();
  if (!s) return null;
  const idx = s.indexOf(":");
  if (idx <= 0) return null;

  const kind = s.slice(0, idx);
  const id = s.slice(idx + 1);
  if (!UUID_RE.test(id)) return null;

  if (kind === "ACCOUNT_USER") return { kind: "ACCOUNT_USER", id };
  if (kind === "PORTAL_MEMBER") return { kind: "PORTAL_MEMBER", id };
  return null;
}

async function resolveRecipientEmailFromSelectedPerson(supabase: any, selectedPersonRaw: string): Promise<string | null> {
  const sel = parseSelectedPerson(selectedPersonRaw);
  if (!sel) return null;

  if (sel.kind === "ACCOUNT_USER") {
    const { data, error } = await supabase.from("account_contacts").select("email").eq("id", sel.id).single();
    if (error) return null;
    return normEmail(data?.email) || null;
  }

  if (sel.kind === "PORTAL_MEMBER") {
    const getUserById = (supabase as any)?.auth?.admin?.getUserById;
    if (typeof getUserById !== "function") return null;

    try {
      const res = await (supabase as any).auth.admin.getUserById(sel.id);
      const email = normEmail(res?.data?.user?.email);
      return email || null;
    } catch {
      return null;
    }
  }

  return null;
}

async function findOrCreateAccountContact(opts: {
  supabase: any;
  accountId: string;
  actorUserId: string;
  email: string;
  fullName?: string;
}) {
  const { supabase, accountId, actorUserId, email, fullName } = opts;
  const e = normEmail(email);
  if (!e) return null;

  const existing = await supabase
    .from("account_contacts")
    .select("id,email")
    .eq("account_id", accountId)
    .eq("email", e)
    .maybeSingle();

  if (!existing.error && existing.data?.id) return existing.data;

  const created = await supabase
    .from("account_contacts")
    .insert({
      account_id: accountId,
      email: e,
      full_name: (fullName || "").trim() || null,
      created_by_user_id: actorUserId,
    })
    .select("id,email")
    .single();

  if (created.error) throw created.error;
  return created.data;
}

/**
 * Identifier logic (match your verification route):
 * FIRST3 + LAST3 + DOB(YYYYMMDD) + -SUFFIX4(from ivr uuid)
 * Example: JOHSMI-19900102-3F2A
 */
function normalizeLetters3(raw: string): string {
  const letters = (raw || "").toUpperCase().replace(/[^A-Z]/g, "");
  const first3 = letters.slice(0, 3);
  return (first3 + "XXX").slice(0, 3);
}

function ivrIdSuffix4(ivrId: string): string {
  const s = (ivrId || "").replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (s.length >= 4) return s.slice(0, 4);
  return (s + "0000").slice(0, 4);
}

function buildIvrIdentifier(patientFirst: string, patientLast: string, patientDobIso: string, ivrId: string): string {
  const f3 = normalizeLetters3(patientFirst);
  const l3 = normalizeLetters3(patientLast);
  const dobDigits = (patientDobIso || "").replace(/-/g, ""); // YYYYMMDD
  return `${f3}${l3}-${dobDigits}-${ivrIdSuffix4(ivrId)}`;
}

/**
 * ✅ Provider profile resolution:
 * - Prefer posted provider_profile_id
 * - Else use account default (is_default = true)
 * - Else use most recently updated
 */
async function resolveProviderProfileForAccount(opts: {
  supabase: any;
  accountId: string;
  postedProviderProfileId: string | null;
}): Promise<null | {
  id: string;
  provider_name: string;
  provider_npi: string | null;
  provider_tax_id: string | null;
  provider_ptan: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  office_contact_name: string | null;
  phone: string | null;
  phone_ext: string | null;
  fax: string | null;
}> {
  const { supabase, accountId, postedProviderProfileId } = opts;

  // If the form posted a provider_profile_id, use it (but ensure it belongs to the account).
  if (postedProviderProfileId && UUID_RE.test(postedProviderProfileId)) {
    const { data, error } = await supabase
      .from("account_provider_profiles")
      .select(
        "id,provider_name,provider_npi,provider_tax_id,provider_ptan,address1,city,state,zip,office_contact_name,phone,phone_ext,fax,account_id"
      )
      .eq("id", postedProviderProfileId)
      .maybeSingle();

    if (!error && data && String(data.account_id) === accountId) {
      return {
        id: data.id,
        provider_name: data.provider_name,
        provider_npi: data.provider_npi,
        provider_tax_id: data.provider_tax_id,
        provider_ptan: data.provider_ptan,
        address1: data.address1,
        city: data.city,
        state: data.state,
        zip: data.zip,
        office_contact_name: data.office_contact_name,
        phone: data.phone,
        phone_ext: data.phone_ext,
        fax: data.fax,
      };
    }
  }

  // Default provider for account
  {
    const { data, error } = await supabase
      .from("account_provider_profiles")
      .select("id,provider_name,provider_npi,provider_tax_id,provider_ptan,address1,city,state,zip,office_contact_name,phone,phone_ext,fax")
      .eq("account_id", accountId)
      .eq("is_default", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) {
      return {
        id: data.id,
        provider_name: data.provider_name,
        provider_npi: data.provider_npi,
        provider_tax_id: data.provider_tax_id,
        provider_ptan: data.provider_ptan,
        address1: data.address1,
        city: data.city,
        state: data.state,
        zip: data.zip,
        office_contact_name: data.office_contact_name,
        phone: data.phone,
        phone_ext: data.phone_ext,
        fax: data.fax,
      };
    }
  }

  // Fallback: most recently updated profile
  {
    const { data, error } = await supabase
      .from("account_provider_profiles")
      .select("id,provider_name,provider_npi,provider_tax_id,provider_ptan,address1,city,state,zip,office_contact_name,phone,phone_ext,fax")
      .eq("account_id", accountId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) {
      return {
        id: data.id,
        provider_name: data.provider_name,
        provider_npi: data.provider_npi,
        provider_tax_id: data.provider_tax_id,
        provider_ptan: data.provider_ptan,
        address1: data.address1,
        city: data.city,
        state: data.state,
        zip: data.zip,
        office_contact_name: data.office_contact_name,
        phone: data.phone,
        phone_ext: data.phone_ext,
        fax: data.fax,
      };
    }
  }

  return null;
}

export async function POST(req: Request) {
  const admin = await requireAdminOrStaff();
  const actorUserId = (admin as any)?.userId || (admin as any)?.user?.id || (admin as any)?.id || "";
  if (!actorUserId) return NextResponse.json({ error: "Missing actor user id" }, { status: 401 });

  const form = await req.formData();
  const supabase: any = createSupabaseAdminClient();

  const accountId = String(form.get("account_id") || "").trim();
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ error: "Invalid account_id" }, { status: 400 });
  }

  const selectedPersonRaw = String(form.get("selected_person") || "").trim();
  const selectedPerson = parseSelectedPerson(selectedPersonRaw);

  const newUserEmail = normEmail(form.get("new_user_email"));
  const newUserName = String(form.get("new_user_full_name") || "").trim();

  let submitted_by_user_id: string | null = null;
  let contact_id: string | null = null;

  let recipientEmail: string | null = null;

  if (newUserEmail) {
    try {
      const c = await findOrCreateAccountContact({
        supabase,
        accountId,
        actorUserId,
        email: newUserEmail,
        fullName: newUserName,
      });

      contact_id = c?.id || null;
      recipientEmail = normEmail(c?.email) || null;
      submitted_by_user_id = null;
    } catch (e: any) {
      return NextResponse.json({ error: "Failed to create user record", detail: e?.message || e }, { status: 500 });
    }
  } else {
    if (selectedPerson?.kind === "PORTAL_MEMBER") {
      submitted_by_user_id = selectedPerson.id;
      contact_id = null;
    } else if (selectedPerson?.kind === "ACCOUNT_USER") {
      contact_id = selectedPerson.id;
      submitted_by_user_id = null;
    }

    recipientEmail = await resolveRecipientEmailFromSelectedPerson(supabase, selectedPersonRaw);
  }

  if (!recipientEmail || (!submitted_by_user_id && !contact_id)) {
    return NextResponse.json(
      {
        error: "A recipient user is required. Select an existing user or click “New User” and enter name + email.",
      },
      { status: 400 }
    );
  }

  const resultsEmails = splitList(String(form.get("results_emails") || ""));
  const distributorEmail = normEmail(form.get("distributor_email"));

  const icd10_codes = splitList(String(form.get("icd10_codes") || ""));
  const cpt_codes = splitList(String(form.get("cpt_codes") || ""));
  const unitsCm2 = parseNumericOrNull(String(form.get("units_cm2") || ""));

  const dob = parseDateFlexible(String(form.get("patient_dob") || ""));
  const dos = parseDateFlexible(String(form.get("dos") || ""));

  let notes = String(form.get("notes") || "").trim();
  const invalidNotes: string[] = [];
  if (dob.invalidRaw) invalidNotes.push(`Invalid DOB entered: "${dob.invalidRaw}"`);
  if (dos.invalidRaw) invalidNotes.push(`Invalid DOS entered: "${dos.invalidRaw}"`);
  if (invalidNotes.length) notes = (notes ? notes + "\n\n" : "") + invalidNotes.join("\n");

  // Required checks
  const patientFirst = String(form.get("patient_first_name") || "").trim();
  const patientLast = String(form.get("patient_last_name") || "").trim();
  const primaryInsurance = String(form.get("primary_insurance") || "").trim();
  const primaryPolicy = String(form.get("primary_policy") || "").trim();
  const product = String(form.get("product") || "").trim();
  const pos = String(form.get("place_of_service") || "").trim();

  const missing: string[] = [];
  if (!patientFirst) missing.push("patient_first_name");
  if (!patientLast) missing.push("patient_last_name");
  if (!dob.value) missing.push("patient_dob");
  if (!primaryInsurance) missing.push("primary_insurance");
  if (!primaryPolicy) missing.push("primary_policy");
  if (!product) missing.push("product");
  if (!pos) missing.push("place_of_service");
  if (!icd10_codes.length) missing.push("icd10_codes");
  if (!cpt_codes.length) missing.push("cpt_codes");

  if (missing.length) {
    return NextResponse.json(
      { error: "Missing required fields", missing, dob_invalid_format: !!dob.invalidRaw },
      { status: 400 }
    );
  }

  // ✅ Resolve provider profile + snapshot fields
  const postedProviderProfileId = String(form.get("provider_profile_id") || "").trim() || null;
  const providerProfile = await resolveProviderProfileForAccount({
    supabase,
    accountId,
    postedProviderProfileId,
  });

  // If you want provider required at intake, enforce it here.
  if (!providerProfile?.id) {
    return NextResponse.json(
      { error: "Missing provider profile for this account. Add a provider profile or set a default provider profile." },
      { status: 400 }
    );
  }

  const insertPayload: any = {
    account_id: accountId,
    status: "NEW",

    created_by_user_id: actorUserId,

    submitted_by_user_id,
    contact_id,

    patient_first_name: patientFirst,
    patient_last_name: patientLast,
    patient_dob: dob.value,
    patient_address1: String(form.get("patient_address1") || "").trim() || null,
    patient_city: String(form.get("patient_city") || "").trim() || null,
    patient_state: String(form.get("patient_state") || "").trim() || null,
    patient_zip: String(form.get("patient_zip") || "").trim() || null,

    primary_insurance: primaryInsurance,
    primary_policy: primaryPolicy,
    secondary_insurance: String(form.get("secondary_insurance") || "").trim() || null,
    secondary_policy: String(form.get("secondary_policy") || "").trim() || null,

    facility_name: String(form.get("facility_name") || "").trim() || null,
    facility_npi: String(form.get("facility_npi") || "").trim() || null,
    facility_tax_id: String(form.get("facility_tax_id") || "").trim() || null,
    facility_address1: String(form.get("facility_address1") || "").trim() || null,
    facility_city: String(form.get("facility_city") || "").trim() || null,
    facility_state: String(form.get("facility_state") || "").trim() || null,
    facility_zip: String(form.get("facility_zip") || "").trim() || null,

    place_of_service: (pos || null) as any,
    dos: dos.value,

    product: product || null,
    qcode: String(form.get("qcode") || "").trim() || null,
    product_size: String(form.get("product_size") || "").trim() || null,
    units_cm2: unitsCm2,

    icd10_codes,
    cpt_codes,

    result_emails: resultsEmails.length ? resultsEmails : [],
    distributor_email: distributorEmail || null,
    distributor_name: String(form.get("distributor_name") || "").trim() || null,

    // ✅ link + snapshot from account_provider_profiles
    provider_profile_id: providerProfile.id,
    provider_name: providerProfile.provider_name || null,
    provider_npi: providerProfile.provider_npi || null,
    provider_tax_id: providerProfile.provider_tax_id || null,
    provider_ptan: providerProfile.provider_ptan || null,
    provider_address1: providerProfile.address1 || null,
    provider_city: providerProfile.city || null,
    provider_state: providerProfile.state || null,
    provider_zip: providerProfile.zip || null,
    office_contact_name: providerProfile.office_contact_name || null,
    office_phone: providerProfile.phone || null,
    office_phone_ext: providerProfile.phone_ext || null,
    office_fax: providerProfile.fax || null,

    notes: notes || null,
  };

  // 1) Create IVR
  const { data: created, error: createErr } = await supabase
    .from("ivr_requests")
    .insert(insertPayload)
    .select("id, ivr_identifier")
    .single();

  if (createErr || !created?.id) {
    return NextResponse.json({ error: "Failed to create IVR", detail: createErr }, { status: 500 });
  }

  // 2) Generate + set ivr_identifier immediately (intake behavior fix)
  const existingIdentifier = String(created.ivr_identifier || "").trim();
  let computedIdentifier: string | null = null;

  if (!existingIdentifier) {
    computedIdentifier = buildIvrIdentifier(patientFirst, patientLast, dob.value!, created.id);

    const { error: idErr } = await supabase
      .from("ivr_requests")
      .update({ ivr_identifier: computedIdentifier })
      .eq("id", created.id);

    if (idErr) {
      return NextResponse.json(
        {
          error: "IVR created but failed to set identifier",
          detail: idErr,
          ivr_id: created.id,
        },
        { status: 500 }
      );
    }
  }

  const notifyCc = [...resultsEmails, ...(distributorEmail ? [distributorEmail] : [])].filter(Boolean);

  // 3) Create verification row (prefill email recipients)
  await supabase.from("ivr_insurance_verifications").insert({
    ivr_request_id: created.id,
    created_by_user_id: actorUserId,
    notify_to: recipientEmail,
    notify_cc: notifyCc,
    results_emails: resultsEmails,
    distributor_email: distributorEmail || null,
  });

  // 4) Audit
  await supabase.from("ivr_audit_log").insert({
    ivr_request_id: created.id,
    actor_user_id: actorUserId,
    action: "ADMIN_IVR_INTAKE_CREATED",
    metadata: {
      cc_count: notifyCc.length,
      created_new_user: newUserEmail ? "yes" : "no",
      submitter_kind: submitted_by_user_id ? "PORTAL_MEMBER" : contact_id ? "ACCOUNT_USER" : null,
      ivr_identifier_set: computedIdentifier ? "yes" : "no",
      ivr_identifier: computedIdentifier || existingIdentifier || null,
      provider_profile_id: providerProfile?.id || null,
      provider_is_default_used: postedProviderProfileId ? "no" : "maybe",
    },
  });

  // 5) Uploads
  const bucket = process.env.IVR_PRIVATE_BUCKET || "ivr-private";
  const uploads: Array<{ key: string; fileType: string; multiple?: boolean }> = [
    { key: "ivr_pdf", fileType: "IVR_PDF" },
    { key: "insurance_card", fileType: "INSURANCE_CARD" },
    { key: "clinical_records", fileType: "CLINICAL_RECORDS", multiple: true },
  ];

  for (const u of uploads) {
    if (u.multiple) {
      const files = form.getAll(u.key).filter((x) => x instanceof File) as File[];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!f?.name) continue;

        const objectPath = `ivr/${created.id}/uploads/${Date.now()}_${i}_${f.name}`;
        await uploadOne(supabase, bucket, objectPath, f);

        await supabase.from("ivr_files").insert({
          ivr_request_id: created.id,
          bucket,
          object_path: objectPath,
          file_type: u.fileType,
          uploaded_by_user_id: actorUserId,
        });
      }
    } else {
      const f = form.get(u.key);
      if (!(f instanceof File) || !f?.name) continue;

      const objectPath = `ivr/${created.id}/uploads/${Date.now()}_${f.name}`;
      await uploadOne(supabase, bucket, objectPath, f);

      await supabase.from("ivr_files").insert({
        ivr_request_id: created.id,
        bucket,
        object_path: objectPath,
        file_type: u.fileType,
        uploaded_by_user_id: actorUserId,
      });
    }
  }

  // 6) Redirect to detail
  return NextResponse.redirect(urlFromRequest(req, `/admin/ivr/${created.id}`), 303);
}
