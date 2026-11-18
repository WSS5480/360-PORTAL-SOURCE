// src/app/portal/ivr/new/NewIVRClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { POS_OPTIONS, type PosCode } from "@/lib/ivr/placeOfService";

type ProviderProfile = {
  id: string;
  provider_name: string;
  provider_npi: string | null;
  provider_tax_id: string | null;
  provider_ptan: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  office_contact_name: string | null;
  phone: string | null;
  phone_ext: string | null;
  fax: string | null;
  is_default: boolean;
};

type HospiceAnswer = "YES" | "NO" | "";

type PortalMeResponse = {
  ok: boolean;
  user?: { id?: string; email?: string | null; name?: string | null };
  error?: string;
};

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isBlank(s: string) {
  return !s || !s.trim();
}

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" };
}

function card(): React.CSSProperties {
  return {
    ...baseBorder(),
    borderRadius: 16,
    padding: 14,
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  };
}

function labelStyle(): React.CSSProperties {
  return { fontSize: 12, color: "var(--muted)", fontWeight: 900 };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    ...baseBorder(),
    background: "var(--surface)",
    outline: "none",
    boxSizing: "border-box",
  };
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    ...baseBorder(),
    background: "var(--surface)",
    outline: "none",
    boxSizing: "border-box",
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 12,
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 950,
    background: disabled ? "color-mix(in srgb, var(--brand-600) 45%, #999)" : "var(--brand-600)",
    color: "white",
    boxShadow: "0 14px 30px rgba(0,0,0,0.14)",
  };
}

function softBtn(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    ...baseBorder(),
    background: "var(--surface)",
    fontWeight: 950,
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

function parseCodes(raw: string): string[] {
  return (raw || "")
    .split(/[\n,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function NewIVRClient() {
  // Provider profiles
  const [profiles, setProfiles] = useState<ProviderProfile[]>([]);
  const [profileId, setProfileId] = useState<string>("");
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [profilesLoading, setProfilesLoading] = useState<boolean>(true);

  // Patient (PHI) — required: first/last/dob (unless PDF mode)
  const [patientFirst, setPatientFirst] = useState("");
  const [patientLast, setPatientLast] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [patientAddr, setPatientAddr] = useState("");
  const [patientCity, setPatientCity] = useState("");
  const [patientState, setPatientState] = useState("");
  const [patientZip, setPatientZip] = useState("");

  // Insurance — required (unless PDF mode)
  const [primaryIns, setPrimaryIns] = useState("");
  const [primaryPol, setPrimaryPol] = useState("");
  const [secondaryIns, setSecondaryIns] = useState("");
  const [secondaryPol, setSecondaryPol] = useState("");

  // Facility/POS — required POS (unless PDF mode)
  const [facilityName, setFacilityName] = useState("");
  const [facilityNpi, setFacilityNpi] = useState("");
  const [facilityTaxId, setFacilityTaxId] = useState("");
  const [facilityAddr, setFacilityAddr] = useState("");
  const [facilityCity, setFacilityCity] = useState("");
  const [facilityState, setFacilityState] = useState("");
  const [facilityZip, setFacilityZip] = useState("");
  const [pos, setPos] = useState<PosCode | "">("");
  const [dos, setDos] = useState<string>(() => todayYYYYMMDD()); // defaults to today

  // Services — required (unless PDF mode)
  const [product, setProduct] = useState("");
  const [qcode, setQcode] = useState("");
  const [units, setUnits] = useState<string>("");

  // Codes (arrays in DB; collect as raw text and parse on submit)
  const [icd10Raw, setIcd10Raw] = useState<string>("");
  const [cptRaw, setCptRaw] = useState<string>("");

  // Hospice + PHI attestation — hospice required (unless PDF mode), PHI always required
  const [hospiceEnrolled, setHospiceEnrolled] = useState<HospiceAnswer>("");
  const [phiAttested, setPhiAttested] = useState(false);

  // Results emails / distributor
  const [resultEmail1, setResultEmail1] = useState("");
  const [resultEmail2, setResultEmail2] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [distributorEmail, setDistributorEmail] = useState("");
  const [autofillNote, setAutofillNote] = useState<string | null>(null);

  // Attachments — all optional
  const [ivrPdf, setIvrPdf] = useState<File | null>(null);
  const [insuranceCard, setInsuranceCard] = useState<File | null>(null);
  const [clinicalRecords, setClinicalRecords] = useState<File | null>(null);

  // "Have completed PDF?" decision
  const [hasCompletedPdf, setHasCompletedPdf] = useState<"YES" | "NO" | "">("");

  // Notes
  const [notes, setNotes] = useState("");

  // UX state
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline create provider profile
  const [showCreateProvider, setShowCreateProvider] = useState(false);
  const [createProviderName, setCreateProviderName] = useState("");
  const [createNpi, setCreateNpi] = useState("");
  const [createTaxId, setCreateTaxId] = useState("");
  const [createPtan, setCreatePtan] = useState("");
  const [createAddress1, setCreateAddress1] = useState("");
  const [createAddress2, setCreateAddress2] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createState, setCreateState] = useState("");
  const [createZip, setCreateZip] = useState("");
  const [createContactName, setCreateContactName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPhoneExt, setCreatePhoneExt] = useState("");
  const [createFax, setCreateFax] = useState("");
  const [createIsDefault, setCreateIsDefault] = useState(false);
  const [createProviderError, setCreateProviderError] = useState<string | null>(null);
  const [createProviderSaving, setCreateProviderSaving] = useState(false);

  async function loadProfiles() {
    setProfilesLoading(true);
    setProfilesError(null);

    try {
      const res = await fetch("/api/portal/provider-profiles", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfilesError(json?.error || "Failed to load provider profiles");
        setProfiles([]);
        setProfilesLoading(false);
        return;
      }

      const list: ProviderProfile[] = json.profiles || [];
      setProfiles(list);

      // Auto-select default; else auto-select first if nothing selected
      if (!profileId) {
        const def = list.find((p) => p.is_default);
        if (def) setProfileId(def.id);
        else if (list.length > 0) setProfileId(list[0].id);
      }

      setProfilesLoading(false);
    } catch (e: any) {
      setProfilesError(e?.message || "Failed to load provider profiles");
      setProfiles([]);
      setProfilesLoading(false);
    }
  }

  async function createProviderProfile(e?: React.FormEvent) {
    e?.preventDefault();
    setCreateProviderError(null);

    const missing: string[] = [];
    if (!createProviderName.trim()) missing.push("Provider name");
    if (!createNpi.trim()) missing.push("NPI");
    if (!createTaxId.trim()) missing.push("Tax ID");
    if (!createPtan.trim()) missing.push("PTAN");
    if (!createAddress1.trim()) missing.push("Address 1");
    if (!createCity.trim()) missing.push("City");
    if (!createState.trim()) missing.push("State");
    if (!createZip.trim()) missing.push("Zip");
    if (missing.length) {
      setCreateProviderError(`Missing: ${missing.join(", ")}`);
      return;
    }

    setCreateProviderSaving(true);
    try {
      const res = await fetch("/api/portal/provider-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider_name: createProviderName.trim(),
          provider_npi: createNpi.trim(),
          provider_tax_id: createTaxId.trim(),
          provider_ptan: createPtan.trim(),
          address1: createAddress1.trim(),
          address2: createAddress2.trim() || null,
          city: createCity.trim(),
          state: createState.trim(),
          zip: createZip.trim(),
          office_contact_name: createContactName.trim() || null,
          phone: createPhone.trim() || null,
          phone_ext: createPhoneExt.trim() || null,
          fax: createFax.trim() || null,
          is_default: Boolean(createIsDefault),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateProviderError(json?.error || "Failed to create provider profile");
        return;
      }

      const newProfile = json?.profile;
      setShowCreateProvider(false);
      setCreateProviderName("");
      setCreateNpi("");
      setCreateTaxId("");
      setCreatePtan("");
      setCreateAddress1("");
      setCreateAddress2("");
      setCreateCity("");
      setCreateState("");
      setCreateZip("");
      setCreateContactName("");
      setCreatePhone("");
      setCreatePhoneExt("");
      setCreateFax("");
      setCreateIsDefault(false);
      await loadProfiles();
      if (newProfile?.id) setProfileId(newProfile.id);
    } catch (err: any) {
      setCreateProviderError(err?.message || "Failed to create provider profile");
    } finally {
      setCreateProviderSaving(false);
    }
  }

  async function loadDistributorAutofill() {
    setAutofillNote(null);

    try {
      const res = await fetch("/api/portal/me", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as PortalMeResponse | null;

      if (!res.ok || !json?.ok) {
        setAutofillNote(json?.error || "Couldn’t auto-fill your info (not signed in or no account selected).");
        return;
      }

      const email = (json.user?.email ?? "").trim();
      const name = (json.user?.name ?? "").trim();

      if (email && isBlank(distributorEmail)) setDistributorEmail(email);

      if (name) {
        const currentName = distributorName.trim();
        const currentEmail = distributorEmail.trim();

        const looksLikeEmail =
          (email && currentName.toLowerCase() === email.toLowerCase()) ||
          (currentEmail && currentName.toLowerCase() === currentEmail.toLowerCase()) ||
          currentName.includes("@");

        if (isBlank(currentName) || looksLikeEmail) {
          setDistributorName(name);
        }
      }
    } catch {
      setAutofillNote("Couldn’t auto-fill your info (network error).");
    }
  }

  useEffect(() => {
    loadProfiles();
    loadDistributorAutofill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === profileId) || null,
    [profiles, profileId]
  );

  const pdfMode = hasCompletedPdf === "YES" && Boolean(ivrPdf);

  function validateRequired(): string | null {
    // Stronger guidance if no profiles exist (only matters when NOT in PDF mode)
    if (!pdfMode && !profilesLoading && profiles.length === 0) {
      return "No Provider Profiles exist yet. Please create one before submitting.";
    }

    // PHI authorization is required in BOTH modes
    if (!phiAttested) return "You must confirm you are authorized to submit PHI for this patient.";

    // ✅ PDF-only submission bypasses provider + other required fields
    if (pdfMode) return null;

    // Provider is required for non-PDF mode (routing)
    if (!profileId) return "Please select a Provider Profile (Requesting Provider Information).";

    // Existing required rules (unchanged)
    if (isBlank(patientFirst)) return "Patient first name is required.";
    if (isBlank(patientLast)) return "Patient last name is required.";
    if (isBlank(dob)) return "Patient DOB is required.";

    if (isBlank(primaryIns)) return "Primary insurance is required.";
    if (isBlank(primaryPol)) return "Primary policy # is required.";

    if (!pos) return "Place of service is required.";

    if (isBlank(product)) return "Product is required.";
    if (isBlank(qcode)) return "Q-code is required.";
    if (isBlank(units)) return "Units/cm² is required.";

    const unitsNum = Number(units);
    if (Number.isNaN(unitsNum)) return "Units/cm² must be a number.";
    if (unitsNum <= 0) return "Units/cm² must be greater than 0.";

    // ✅ NEW: codes required (non-PDF mode only)
    const icd10_codes = parseCodes(icd10Raw);
    const cpt_codes = parseCodes(cptRaw);
    if (icd10_codes.length === 0) return "ICD-10 code(s) are required.";
    if (cpt_codes.length === 0) return "CPT code(s) are required.";

    if (!hospiceEnrolled) return "Please answer: Is the patient currently enrolled in hospice care?";

    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    const requiredError = validateRequired();
    if (requiredError) {
      setError(requiredError);
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    const unitsNum = Number(units);
    const resultEmails = [resultEmail1, resultEmail2].map((s) => s.trim()).filter(Boolean);

    const icd10_codes = parseCodes(icd10Raw);
    const cpt_codes = parseCodes(cptRaw);

    // ✅ Payload becomes minimal in PDF mode (do NOT guess required fields)
    const payload: any = pdfMode
      ? {
          // provider_profile_id is OPTIONAL in PDF mode
          ...(profileId ? { provider_profile_id: profileId } : {}),
          phi_authorized: true,
          result_emails: resultEmails,
          distributor_name: distributorName.trim(),
          distributor_email: distributorEmail.trim(),
          notes: notes.trim() || "",
          // Optional even in PDF mode (only send if user typed)
          ...(icd10_codes.length ? { icd10_codes } : {}),
          ...(cpt_codes.length ? { cpt_codes } : {}),
        }
      : {
          patient_first_name: patientFirst.trim(),
          patient_last_name: patientLast.trim(),
          patient_dob: dob,

          patient_address1: patientAddr.trim() || "",
          patient_city: patientCity.trim() || "",
          patient_state: patientState.trim() || "",
          patient_zip: patientZip.trim() || "",

          provider_profile_id: profileId,

          primary_insurance: primaryIns.trim(),
          primary_policy: primaryPol.trim(),
          secondary_insurance: secondaryIns.trim() || "",
          secondary_policy: secondaryPol.trim() || "",

          facility_name: facilityName.trim() || "",
          facility_npi: facilityNpi.trim() || "",
          facility_tax_id: facilityTaxId.trim() || "",
          facility_address1: facilityAddr.trim() || "",
          facility_city: facilityCity.trim() || "",
          facility_state: facilityState.trim() || "",
          facility_zip: facilityZip.trim() || "",
          place_of_service: pos || undefined,
          dos: dos || todayYYYYMMDD(),

          product: product.trim(),
          qcode: qcode.trim(),
          units_cm2: unitsNum,

          // ✅ NEW: arrays for DB
          icd10_codes,
          cpt_codes,

          hospice_enrolled: hospiceEnrolled === "YES",
          phi_authorized: true,

          result_emails: resultEmails,
          distributor_name: distributorName.trim(),
          distributor_email: distributorEmail.trim(),

          notes: notes.trim() || "",
        };

    const form = new FormData();
    form.append("payload", JSON.stringify(payload));
    if (ivrPdf) form.append("ivr_pdf", ivrPdf);
    if (insuranceCard) form.append("insurance_card", insuranceCard);
    if (clinicalRecords) form.append("clinical_records", clinicalRecords);

    try {
      setSubmitting(true);
      setStatus("Submitting…");

      const res = await fetch("/api/portal/ivr", {
        method: "POST",
        body: form,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setStatus(null);
        const detail = json?.detail ? ` — ${json.detail}` : "";
        setError((json?.error || `Submit failed (HTTP ${res.status})`) + detail);
        return;
      }

      // Helpful feedback if email didn’t send
      if (json?.emailSent === false && json?.emailWarning) {
        setStatus(`Submitted (email warning: ${String(json.emailWarning)}) Returning to IVR list…`);
      } else {
        setStatus("Submitted! Returning to IVR list…");
      }

      window.location.href = "/portal/ivr";
    } catch (err: any) {
      setStatus(null);
      setError(err?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const errorRef = useRef<HTMLDivElement>(null);

  return (
    <div style={styles.wrapper}>
      {/* Error display - scroll into view on validation error */}
      <div ref={errorRef} style={{ display: error ? "block" : "none" }}>
        {error ? (
          <div style={styles.errorAlert} role="alert">
            <div style={styles.errorTitle}>Please fix the following</div>
            <div style={styles.errorBody}>{error}</div>
          </div>
        ) : null}
      </div>

      {/* Completed PDF decision */}
      <section style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>Do you already have a completed IVR form PDF?</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.4 }}>
              If yes, upload it below. When a completed PDF is uploaded, it can be used as the source of truth for this request.
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 950, fontSize: 13 }}>
              <input
                type="radio"
                name="hasCompletedPdf"
                value="YES"
                checked={hasCompletedPdf === "YES"}
                onChange={() => setHasCompletedPdf("YES")}
              />
              Yes
            </label>

            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 950, fontSize: 13 }}>
              <input
                type="radio"
                name="hasCompletedPdf"
                value="NO"
                checked={hasCompletedPdf === "NO"}
                onChange={() => setHasCompletedPdf("NO")}
              />
              No
            </label>
          </div>
        </div>

        {hasCompletedPdf === "YES" ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div
              style={{
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--brand-600) 18%, var(--border))",
                background: "color-mix(in srgb, var(--brand-050) 65%, var(--surface))",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 950 }}>Upload completed IVR form PDF</div>

                {ivrPdf ? (
                  <button type="button" onClick={() => setIvrPdf(null)} style={softBtn()}>
                    Clear
                  </button>
                ) : null}
              </div>

              <input type="file" accept="application/pdf" onChange={(e) => setIvrPdf(e.target.files?.[0] ?? null)} />

              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 850 }}>
                {ivrPdf ? (
                  <>
                    Selected: <span style={{ fontWeight: 950, color: "var(--foreground)" }}>{ivrPdf.name}</span>
                  </>
                ) : (
                  <>No PDF selected yet.</>
                )}
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
                With a completed PDF uploaded, the remaining form fields below are optional (you can still fill them out if you want).
                <br />
                <span style={{ fontWeight: 900 }}>Provider Profile is optional in PDF mode (we can route from the PDF).</span>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        {/* Patient */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Patient Information</div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                First name {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <input value={patientFirst} onChange={(e) => setPatientFirst(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                Last name {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <input value={patientLast} onChange={(e) => setPatientLast(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>
              DOB {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
            </label>
            <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" style={{ ...inputStyle(), marginTop: 6 }} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>Address</label>
            <input value={patientAddr} onChange={(e) => setPatientAddr(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 160px) minmax(0, 160px)",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>City</label>
              <input value={patientCity} onChange={(e) => setPatientCity(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>State</label>
              <input value={patientState} onChange={(e) => setPatientState(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Zip</label>
              <input value={patientZip} onChange={(e) => setPatientZip(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
          </div>
        </section>

        {/* Provider */}
        <section style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <div style={{ fontWeight: 950 }}>Requesting Provider Information</div>
            <Link href="/portal/provider-profiles" style={{ fontSize: 13, fontWeight: 950, color: "var(--brand-700)", textDecoration: "none" }}>
              Manage Provider Profiles →
            </Link>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontWeight: 850, lineHeight: 1.4 }}>
            Click <span style={{ fontWeight: 950, color: "var(--foreground)" }}>+ Create</span> to add a profile without leaving this page.
          </div>

          {!profilesLoading && profiles.length === 0 && !pdfMode ? (
            <div style={styles.noProfilesAlert}>
              <div style={styles.noProfilesTitle}>No Provider Profiles found</div>
              <div style={styles.noProfilesBody}>You must create a Provider Profile before submitting.</div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setShowCreateProvider(true)} style={softBtn()}>
                  + Create Provider Profile
                </button>
                <button type="button" onClick={loadProfiles} style={softBtn()}>
                  Refresh list
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>
              Provider Profile{" "}
              {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : <span style={{ marginLeft: 6, opacity: 0.8 }}>(optional if PDF uploaded)</span>}
            </label>

            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: "1 1 360px", minWidth: 260 }}>
                <select
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  disabled={profilesLoading || profiles.length === 0}
                  style={selectStyle()}
                >
                  <option value="">{pdfMode ? "Select (optional)..." : "Select…"}</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.provider_name}
                      {p.is_default ? " (default)" : ""}
                    </option>
                  ))}
                </select>

                {profilesLoading ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>Loading profiles…</div> : null}
                {profilesError ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>{profilesError}</div> : null}
              </div>

              <button type="button" onClick={() => setShowCreateProvider(true)} style={softBtn()}>
                + Create
              </button>

              <button type="button" onClick={loadProfiles} style={softBtn()}>
                Refresh
              </button>
            </div>

            {selectedProfile ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
                Selected: <b style={{ color: "var(--foreground)" }}>{selectedProfile.provider_name}</b> • NPI:{" "}
                {selectedProfile.provider_npi || "—"} • Phone: {selectedProfile.phone || "—"}
              </div>
            ) : null}

            {showCreateProvider ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "color-mix(in srgb, var(--brand-600) 20%, var(--border))",
                  background: "color-mix(in srgb, var(--brand-050) 50%, var(--surface))",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 950, fontSize: 14 }}>Create Provider Profile</div>
                  <button type="button" onClick={() => setShowCreateProvider(false)} style={softBtn()}>
                    Cancel
                  </button>
                </div>
                {createProviderError ? (
                  <div style={{ marginBottom: 12, fontSize: 13, color: "var(--danger)", fontWeight: 900 }}>{createProviderError}</div>
                ) : null}
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
                    <div>
                      <label style={labelStyle()}>Provider name *</label>
                      <input value={createProviderName} onChange={(e) => setCreateProviderName(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={labelStyle()}>NPI *</label>
                      <input value={createNpi} onChange={(e) => setCreateNpi(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
                    <div>
                      <label style={labelStyle()}>Tax ID *</label>
                      <input value={createTaxId} onChange={(e) => setCreateTaxId(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={labelStyle()}>PTAN *</label>
                      <input value={createPtan} onChange={(e) => setCreatePtan(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle()}>Address 1 *</label>
                    <input value={createAddress1} onChange={(e) => setCreateAddress1(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={labelStyle()}>Address 2</label>
                    <input value={createAddress2} onChange={(e) => setCreateAddress2(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 120px) minmax(0, 100px)", gap: 10 }}>
                    <div>
                      <label style={labelStyle()}>City *</label>
                      <input value={createCity} onChange={(e) => setCreateCity(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={labelStyle()}>State *</label>
                      <input value={createState} onChange={(e) => setCreateState(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={labelStyle()}>Zip *</label>
                      <input value={createZip} onChange={(e) => setCreateZip(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
                    <div>
                      <label style={labelStyle()}>Office contact</label>
                      <input value={createContactName} onChange={(e) => setCreateContactName(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={labelStyle()}>Phone</label>
                      <input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
                    <div>
                      <label style={labelStyle()}>Phone ext</label>
                      <input value={createPhoneExt} onChange={(e) => setCreatePhoneExt(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={labelStyle()}>Fax</label>
                      <input value={createFax} onChange={(e) => setCreateFax(e.target.value)} style={{ ...inputStyle(), marginTop: 4 }} />
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={createIsDefault} onChange={(e) => setCreateIsDefault(e.target.checked)} />
                    Set as default for this account
                  </label>
                  <button type="button" onClick={() => createProviderProfile()} disabled={createProviderSaving} style={primaryBtn(createProviderSaving)}>
                    {createProviderSaving ? "Creating…" : "Create Provider Profile"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Insurance */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Insurance Information</div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                Primary insurance {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <input value={primaryIns} onChange={(e) => setPrimaryIns(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                Primary policy # {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <input value={primaryPol} onChange={(e) => setPrimaryPol(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Secondary insurance</label>
              <input value={secondaryIns} onChange={(e) => setSecondaryIns(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Secondary policy #</label>
              <input value={secondaryPol} onChange={(e) => setSecondaryPol(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
          </div>
        </section>

        {/* Facility/POS */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Facility / Place of Service</div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>
              Place of service {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
            </label>
            <select value={pos} onChange={(e) => setPos(e.target.value as any)} style={{ ...selectStyle(), marginTop: 6 }}>
              <option value="">Select…</option>
              {POS_OPTIONS.map((p: { code: string; label: string }) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>Date of service (DOS)</label>
            <input value={dos} onChange={(e) => setDos(e.target.value)} type="date" style={{ ...inputStyle(), marginTop: 6 }} />
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, fontWeight: 800 }}>Defaults to today.</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>Facility name</label>
            <input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Facility NPI</label>
              <input value={facilityNpi} onChange={(e) => setFacilityNpi(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Tax ID</label>
              <input value={facilityTaxId} onChange={(e) => setFacilityTaxId(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>Facility address</label>
            <input value={facilityAddr} onChange={(e) => setFacilityAddr(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 160px) minmax(0, 160px)",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>City</label>
              <input value={facilityCity} onChange={(e) => setFacilityCity(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>State</label>
              <input value={facilityState} onChange={(e) => setFacilityState(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Zip</label>
              <input value={facilityZip} onChange={(e) => setFacilityZip(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
          </div>
        </section>

        {/* Services */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Services</div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle()}>
              Product {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
            </label>
            <input value={product} onChange={(e) => setProduct(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                Q-code {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <input value={qcode} onChange={(e) => setQcode(e.target.value)} style={{ ...inputStyle(), marginTop: 6 }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                Units/cm² {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <input value={units} onChange={(e) => setUnits(e.target.value)} inputMode="decimal" style={{ ...inputStyle(), marginTop: 6 }} />
            </div>

            <div />
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                ICD-10 codes {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <textarea
                value={icd10Raw}
                onChange={(e) => setIcd10Raw(e.target.value)}
                placeholder="One per line or comma-separated"
                style={{ ...inputStyle(), marginTop: 6, minHeight: 88, resize: "vertical" }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.35 }}>
                Enter codes separated by commas or new lines.
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>
                CPT codes {!pdfMode ? <span style={{ color: "var(--danger)" }}>*</span> : null}
              </label>
              <textarea
                value={cptRaw}
                onChange={(e) => setCptRaw(e.target.value)}
                placeholder="One per line or comma-separated"
                style={{ ...inputStyle(), marginTop: 6, minHeight: 88, resize: "vertical" }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.35 }}>
                Enter codes separated by commas or new lines.
              </div>
            </div>
          </div>
        </section>

        {/* Hospice */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Hospice</div>

          <div style={{ marginTop: 12 }}>
            <div style={{ ...labelStyle(), lineHeight: 1.35 }}>
              Is the patient currently enrolled in hospice care?
              {!pdfMode ? <span style={{ color: "var(--danger)" }}> *</span> : <span style={{ marginLeft: 6, opacity: 0.8 }}>(optional if PDF uploaded)</span>}
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
                <input type="radio" name="hospice" value="YES" checked={hospiceEnrolled === "YES"} onChange={() => setHospiceEnrolled("YES")} />
                Yes
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
                <input type="radio" name="hospice" value="NO" checked={hospiceEnrolled === "NO"} onChange={() => setHospiceEnrolled("NO")} />
                No
              </label>
            </div>
          </div>
        </section>

        {/* Results Email / Distributor */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Results Email / Distributor</div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Additional results email #1</label>
              <input value={resultEmail1} onChange={(e) => setResultEmail1(e.target.value)} type="email" style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Additional results email #2</label>
              <input value={resultEmail2} onChange={(e) => setResultEmail2(e.target.value)} type="email" style={{ ...inputStyle(), marginTop: 6 }} />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Distributor name</label>
              <input
                value={distributorName}
                onChange={(e) => setDistributorName(e.target.value)}
                placeholder="Auto-filled if available (editable)"
                style={{ ...inputStyle(), marginTop: 6 }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle()}>Distributor email</label>
              <input
                value={distributorEmail}
                onChange={(e) => setDistributorEmail(e.target.value)}
                type="email"
                placeholder="Auto-filled (editable)"
                style={{ ...inputStyle(), marginTop: 6 }}
              />
            </div>
          </div>

          {autofillNote ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "color-mix(in srgb, var(--warning) 80%, black)", fontWeight: 900 }}>
              {autofillNote}{" "}
              <button type="button" onClick={loadDistributorAutofill} style={{ ...softBtn(), marginLeft: 8 }}>
                Retry
              </button>
            </div>
          ) : null}
        </section>

        {/* Attachments */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Additional Attachments (optional)</div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div>
              <label style={labelStyle()}>Insurance card (image or PDF)</label>
              <div style={{ marginTop: 6 }}>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setInsuranceCard(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div>
              <label style={labelStyle()}>Clinical records (PDF)</label>
              <div style={{ marginTop: 6 }}>
                <input type="file" accept="application/pdf" onChange={(e) => setClinicalRecords(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
            If you attach files, they will be uploaded securely and visible to 360 Medical staff.
          </div>
        </section>

        {/* Notes */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Notes</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle(), marginTop: 10, minHeight: 110, resize: "vertical" }} />
        </section>

        {/* PHI Attestation */}
        <section style={card()}>
          <div style={{ fontWeight: 950 }}>Authorization (Required)</div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12 }}>
            <input type="checkbox" checked={phiAttested} onChange={(e) => setPhiAttested(e.target.checked)} style={{ marginTop: 3 }} />
            <div style={{ fontSize: 13, lineHeight: 1.35 }}>
              <div style={{ fontWeight: 900 }}>
                I confirm that I am authorized to disclose and submit this patient’s protected health information (PHI) to 360 Medical for insurance verification purposes.
                <span style={{ color: "var(--danger)" }}> *</span>
              </div>
              <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800 }}>If you are not authorized, do not submit this request.</div>
            </div>
          </label>
        </section>

        {/* Submit */}
        <div style={{ display: "grid", gap: 10 }}>
          <button type="submit" disabled={submitting} style={primaryBtn(submitting)}>
            {submitting ? "Submitting…" : pdfMode ? "Submit (PDF)" : "Submit"}
          </button>

          {status ? <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 850 }}>{status}</div> : null}
          {error ? <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 900 }}>{error}</div> : null}
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 },

  errorAlert: {
    ...baseBorder(),
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
    background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
    borderColor: "color-mix(in srgb, var(--danger) 28%, var(--border))",
    boxShadow: "var(--shadow-1)",
  },

  errorTitle: { fontWeight: 950, fontSize: 14, color: "var(--danger)", marginBottom: 8 },

  errorBody: { fontSize: 14, lineHeight: 1.4, color: "var(--foreground)" },

  noProfilesAlert: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--danger) 26%, var(--border))",
    background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
  },

  noProfilesTitle: { fontWeight: 950, fontSize: 14, color: "color-mix(in srgb, var(--danger) 80%, black)" },

  noProfilesBody: { marginTop: 6, fontSize: 13, color: "var(--muted)", fontWeight: 800 },
};
