// src/app/admin/ivr/intake/page.tsx
import Link from "next/link";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import IvrIntakeSelectorsClient from "./ui/IvrIntakeSelectorsClient";
import AdminProviderProfilePickerClient from "./ui/AdminProviderProfilePickerClient";

export const dynamic = "force-dynamic";

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: "rgba(0,0,0,0.2)" };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 8,
    ...baseBorder(),
    fontSize: 14,
    boxSizing: "border-box",
  };
}

function labelStyle(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 };
}

function section(title: string, children: React.ReactNode) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "rgba(0,0,0,0.12)",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>{title}</div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function safeParam(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function safeEmail(v: unknown): string {
  return safeStr(v).trim().toLowerCase();
}

async function loadUserProfilesByUserIds(supabase: any, userIds: string[]) {
  const map = new Map<string, { full_name?: string }>();
  if (!userIds.length) return map;

  // try user_profiles.user_id
  const a = await supabase.from("user_profiles").select("user_id, full_name").in("user_id", userIds);
  if (!a.error && Array.isArray(a.data)) {
    for (const row of a.data) {
      const key = safeStr(row.user_id);
      if (key) map.set(key, { full_name: safeStr(row.full_name) });
    }
    return map;
  }

  // fallback: user_profiles.id
  const b = await supabase.from("user_profiles").select("id, full_name").in("id", userIds);
  if (!b.error && Array.isArray(b.data)) {
    for (const row of b.data) {
      const key = safeStr(row.id);
      if (key) map.set(key, { full_name: safeStr(row.full_name) });
    }
    return map;
  }

  return map;
}

async function loadAuthEmailsByUserIds(adminSb: any, userIds: string[]) {
  const emailById = new Map<string, string>();
  const authAdmin = adminSb?.auth?.admin;
  const getUserById = authAdmin?.getUserById;
  if (typeof getUserById !== "function") return emailById;

  for (const id of userIds) {
    try {
      const res = await authAdmin.getUserById(id);
      const email = safeEmail(res?.data?.user?.email);
      if (email) emailById.set(id, email);
    } catch {
      // ignore
    }
  }

  return emailById;
}

export default async function AdminIvrIntakePage(props: {
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  await requireAdminOrStaff();

  const sp = await Promise.resolve(props.searchParams);
  const selectedAccountId = safeParam((sp as any).account_id);
  const selectedPersonKey = safeParam((sp as any).person);

  const supabase: any = await createSupabaseServerClient();
  const adminSb: any = createSupabaseAdminClient();

  const { data: accounts, error: accountsErr } = await supabase
    .from("accounts")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  // Saved Recipients (name+email) — stored in account_contacts
  const { data: savedRecipients, error: savedRecipientsErr } = selectedAccountId
    ? await supabase
        .from("account_contacts")
        .select("id, full_name, email, created_at")
        .eq("account_id", selectedAccountId)
        .order("created_at", { ascending: false })
    : { data: [] as any[], error: null as any };

  // Portal Members — stored in account_users, linked to auth.users
  let portalMembers: any[] = [];
  let portalMembersErr: any = null;

  if (selectedAccountId) {
    const res = await supabase.from("account_users").select("user_id, role, disabled_at").eq("account_id", selectedAccountId);

    if (res.error) {
      portalMembersErr = res.error;
    } else {
      const rows = res.data || [];
      const userIds = rows.map((r: any) => safeStr(r.user_id)).filter(Boolean);

      const [profilesById, authEmailById] = await Promise.all([
        loadUserProfilesByUserIds(supabase, userIds),
        loadAuthEmailsByUserIds(adminSb, userIds),
      ]);

      portalMembers = rows.map((r: any) => {
        const uid = safeStr(r.user_id);
        const prof = profilesById.get(uid);
        const email = authEmailById.get(uid) || "";
        const name =
          safeStr(prof?.full_name) ||
          (email ? email.split("@")[0] : uid ? `User ${uid.slice(0, 6)}` : "Portal User");

        return {
          user_id: uid,
          role: safeStr(r.role),
          disabled_at: r.disabled_at ?? null,
          display_name: name,
          display_email: email,
        };
      });
    }
  }

  // Build unified people list for the selector client
  const people = [
    ...(savedRecipients || [])
      .filter((u: any) => safeEmail(u.email))
      .map((u: any) => ({
        kind: "ACCOUNT_USER" as const, // "saved recipient"
        id: safeStr(u.id),
        name: safeStr(u.full_name) || safeEmail(u.email) || "Recipient",
        email: safeEmail(u.email),
      })),
    ...(portalMembers || []).map((m: any) => ({
      kind: "PORTAL_MEMBER" as const,
      id: safeStr(m.user_id),
      name: safeStr(m.display_name) || "Portal User",
      email: safeEmail(m.display_email),
      role: safeStr(m.role),
      disabled: Boolean(m.disabled_at),
    })),
  ].filter((p) => p.id);

  // ✅ allow MM-DD-YYYY (preferred), also allow MM/DD/YYYY and YYYY-MM-DD
  const DOB_PATTERN = String.raw`^(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}-\d{2}-\d{2})$`;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>Admin IVR Intake</h1>
          <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            Create an IVR record from an emailed / prefilled PDF (or typed intake). This IVR should match online
            submissions on the detail page.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/admin/ivr" style={{ fontSize: 13 }}>
            ← Back to IVR Queue
          </Link>
        </div>
      </div>

      <form method="post" action="/admin/ivr/intake/submit" encType="multipart/form-data" style={{ marginTop: 14 }}>
        {section(
          "Step 1 — Choose Account + User",
          <>
            {accountsErr ? (
              <div style={{ color: "crimson", fontSize: 13 }}>
                Failed to load accounts: {String(accountsErr?.message || accountsErr)}
              </div>
            ) : null}

            {savedRecipientsErr ? (
              <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
                Failed to load saved recipients: {String(savedRecipientsErr?.message || savedRecipientsErr)}
              </div>
            ) : null}

            {portalMembersErr ? (
              <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
                Failed to load portal members: {String(portalMembersErr?.message || portalMembersErr)}
              </div>
            ) : null}

            <IvrIntakeSelectorsClient
              accounts={(accounts || []) as any}
              selectedAccountId={selectedAccountId}
              people={people as any}
              initialSelectedPersonKey={selectedPersonKey}
              createAccountHref="/admin/ivr/intake/new-account"
            />

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              <strong>Saved Recipients</strong> are name+email records you can invite later.{" "}
              <strong>Portal Members</strong> are real logins tied to the portal.
            </div>
          </>
        )}

        {section(
          "Additional results email(s) (CC)",
          <textarea
            name="results_emails"
            placeholder="comma or newline separated"
            rows={3}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        )}

        {section(
          "Uploads (private, optional)",
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={labelStyle()}>IVR PDF (prefilled)</div>
              <input type="file" name="ivr_pdf" accept="application/pdf" />
            </div>
            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={labelStyle()}>Insurance Card</div>
              <input type="file" name="insurance_card" />
            </div>
            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={labelStyle()}>Clinical Records</div>
              <input type="file" name="clinical_records" multiple />
            </div>
          </div>
        )}

        {section(
          "Patient (required)",
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={labelStyle()}>First Name *</div>
              <input name="patient_first_name" style={inputStyle()} required />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={labelStyle()}>Last Name *</div>
              <input name="patient_last_name" style={inputStyle()} required />
            </div>

            <div style={{ width: 220 }}>
              <div style={labelStyle()}>DOB *</div>
              <input
                name="patient_dob"
                type="text"
                inputMode="numeric"
                placeholder="MM-DD-YYYY"
                pattern={DOB_PATTERN}
                title="Enter DOB as MM-DD-YYYY (preferred). Also accepts MM/DD/YYYY or YYYY-MM-DD."
                style={inputStyle()}
                required
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Format: <strong>MM-DD-YYYY</strong> (preferred). Also accepts <strong>MM/DD/YYYY</strong> or{" "}
                <strong>YYYY-MM-DD</strong>.
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={labelStyle()}>Address</div>
              <input name="patient_address1" style={inputStyle()} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={labelStyle()}>City</div>
              <input name="patient_city" style={inputStyle()} />
            </div>
            <div style={{ width: 120 }}>
              <div style={labelStyle()}>State</div>
              <input name="patient_state" style={inputStyle()} />
            </div>
            <div style={{ width: 140 }}>
              <div style={labelStyle()}>Zip</div>
              <input name="patient_zip" style={inputStyle()} />
            </div>
          </div>
        )}

        {section(
          "Insurance (required)",
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Primary Insurance *</div>
              <input name="primary_insurance" style={inputStyle()} required />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Primary Policy *</div>
              <input name="primary_policy" style={inputStyle()} required />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Secondary Insurance</div>
              <input name="secondary_insurance" style={inputStyle()} />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Secondary Policy</div>
              <input name="secondary_policy" style={inputStyle()} />
            </div>
          </div>
        )}

        {section(
          "Facility + Service (required fields)",
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 220 }}>
              <div style={labelStyle()}>Place of Service (POS Code) *</div>
              <input name="place_of_service" placeholder="e.g. 11" style={inputStyle()} required />
            </div>
            <div style={{ width: 220 }}>
              <div style={labelStyle()}>Date of Service (DOS)</div>
              <input name="dos" type="date" style={inputStyle()} />
            </div>
          </div>
        )}

        {section(
          "Product + Codes (required fields)",
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={labelStyle()}>Product *</div>
                <input name="product" style={inputStyle()} required />
              </div>

              <div style={{ width: 220 }}>
                <div style={labelStyle()}>HCPCS Q Code *</div>
                <input name="qcode" style={inputStyle()} placeholder="e.g. Q4101" required />
              </div>

              <div style={{ width: 220 }}>
                <div style={labelStyle()}>Units (cm²)</div>
                <input name="units_cm2" placeholder="numeric" style={inputStyle()} />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>ICD-10 Codes *</div>
                <textarea
                  name="icd10_codes"
                  rows={3}
                  placeholder="comma or newline separated"
                  style={{ ...inputStyle(), resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>CPT Codes *</div>
                <textarea
                  name="cpt_codes"
                  rows={3}
                  placeholder="comma or newline separated"
                  style={{ ...inputStyle(), resize: "vertical" }}
                  required
                />
              </div>
            </div>
          </>
        )}

        {section(
          "Provider (select existing or create new)",
          selectedAccountId ? (
            <AdminProviderProfilePickerClient accountId={selectedAccountId} />
          ) : (
            <div style={{ fontSize: 12, opacity: 0.75 }}>Select an account first to load provider profiles.</div>
          )
        )}

        {section(
          "Internal Notes",
          <>
            <div style={labelStyle()}>Notes</div>
            <textarea name="notes" rows={4} style={{ ...inputStyle(), resize: "vertical" }} />
          </>
        )}

        <div style={{ marginTop: 14 }}>
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(0,0,0,0.2)",
              background: "#111",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Create IVR Record
          </button>
        </div>
      </form>
    </div>
  );
}
