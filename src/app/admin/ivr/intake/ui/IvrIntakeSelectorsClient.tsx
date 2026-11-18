"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

type AccountOption = {
  id: string;
  name: string;
  is_active: boolean | null;
};

type PersonOption = {
  kind: "ACCOUNT_USER" | "PORTAL_MEMBER";
  id: string;
  name: string;
  email: string;
  disabled?: boolean;
  role?: string;
};

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.2)",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };
}

function labelStyle(): CSSProperties {
  return { fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 };
}

function smallBtn(disabled?: boolean): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.2)",
    background: "white",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
    opacity: disabled ? 0.6 : 1,
    userSelect: "none",
    textDecoration: "none",
    color: "black",
  };
}

function primaryBtn(disabled?: boolean): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "rgba(0,0,0,0.35)" : "#111",
    color: "white",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
    opacity: disabled ? 0.8 : 1,
  };
}

function safeLower(s: unknown) {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

export default function IvrIntakeSelectorsClient(props: {
  accounts: AccountOption[];
  selectedAccountId: string;
  people: PersonOption[];
  initialSelectedPersonKey: string; // "ACCOUNT_USER:<uuid>" | "PORTAL_MEMBER:<uuid>" | ""
  createAccountHref?: string; // optional fallback link
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [accountId, setAccountId] = useState(props.selectedAccountId || "");
  const [personKey, setPersonKey] = useState(props.initialSelectedPersonKey || "");

  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");

  const [distributorEmail, setDistributorEmail] = useState<string>("");

  // ✅ Inline Create Account modal state
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBillingEmail, setNewAccountBillingEmail] = useState("");
  const [newAccountDiscount, setNewAccountDiscount] = useState("40");
  const [newAccountTermsDays, setNewAccountTermsDays] = useState("30");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  useEffect(() => setAccountId(props.selectedAccountId || ""), [props.selectedAccountId]);
  useEffect(() => setPersonKey(props.initialSelectedPersonKey || ""), [props.initialSelectedPersonKey]);

  const peopleByKey = useMemo(() => {
    const m = new Map<string, PersonOption>();
    for (const p of props.people) m.set(`${p.kind}:${p.id}`, p);
    return m;
  }, [props.people]);

  const grouped = useMemo(() => {
    const savedRecipients = props.people.filter((p) => p.kind === "ACCOUNT_USER");
    const portalMembers = props.people.filter((p) => p.kind === "PORTAL_MEMBER");
    return { savedRecipients, portalMembers };
  }, [props.people]);

  function navigateWith(params: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`/admin/ivr/intake?${next.toString()}`);
  }

  // Auto-fill distributor email from selected person / new user email
  useEffect(() => {
    if (showNewUser) {
      const e = safeLower(newUserEmail);
      setDistributorEmail((prev) => (prev ? prev : e));
      return;
    }

    const p = peopleByKey.get(personKey);
    if (!p) return;

    setDistributorEmail((prev) => (prev ? prev : safeLower(p.email)));
  }, [personKey, peopleByKey, showNewUser, newUserEmail]);

  const selectedPerson = peopleByKey.get(personKey);

  async function createAccountInline() {
    if (creatingAccount) return;

    const name = String(newAccountName || "").trim();
    const billing_email = safeLower(newAccountBillingEmail);

    if (!name) {
      setCreateAccountError("Account name is required.");
      return;
    }

    setCreatingAccount(true);
    setCreateAccountError(null);

    try {
      const fd = new FormData();
      fd.set("name", name);
      if (billing_email) fd.set("billing_email", billing_email);
      fd.set("discount_percent", newAccountDiscount || "40");
      fd.set("payment_terms_days", newAccountTermsDays || "30");

      const res = await fetch("/admin/ivr/intake/new-account/submit", {
        method: "POST",
        body: fd,
        headers: {
          accept: "application/json",
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.id) {
        const msg = json?.error || `Failed to create account (${res.status})`;
        setCreateAccountError(msg);
        return;
      }

      const id = String(json.id);

      // Select it immediately + refresh server data (accounts list)
      setShowCreateAccount(false);
      setNewAccountName("");
      setNewAccountBillingEmail("");
      setNewAccountDiscount("40");
      setNewAccountTermsDays("30");
      setAccountId(id);

      // Reset dependent selections since account changed
      setPersonKey("");
      setShowNewUser(false);
      setNewUserName("");
      setNewUserEmail("");
      setDistributorEmail("");

      navigateWith({ account_id: id, person: null });
      router.refresh();
    } catch (e: any) {
      setCreateAccountError(e?.message || "Failed to create account");
    } finally {
      setCreatingAccount(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Account row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={labelStyle()}>Customer Account</div>
          <select
            name="__account_select"
            style={inputStyle()}
            value={accountId}
            onChange={(e) => {
              const nextId = e.target.value;
              setAccountId(nextId);

              // reset selection on account change
              setPersonKey("");
              setShowNewUser(false);
              setNewUserName("");
              setNewUserEmail("");
              setDistributorEmail("");

              navigateWith({ account_id: nextId, person: null });
            }}
          >
            <option value="" disabled>
              Select account…
            </option>
            {props.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.is_active === false ? "(inactive)" : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          style={smallBtn()}
          onClick={() => {
            setShowCreateAccount(true);
            setCreateAccountError(null);
            setNewAccountName("");
            setNewAccountBillingEmail("");
            setNewAccountDiscount("40");
            setNewAccountTermsDays("30");
          }}
        >
          + Create Account
        </button>

        {props.createAccountHref ? (
          <Link href={props.createAccountHref} style={{ ...smallBtn(), opacity: 0.75 }} title="Open full create-account page">
            Full page →
          </Link>
        ) : null}
      </div>

      {/* User row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 360 }}>
          <div style={labelStyle()}>Select User</div>

          <select
            name="person_key"
            style={inputStyle()}
            value={personKey}
            onChange={(e) => {
              const next = e.target.value;
              setPersonKey(next);

              // selecting existing hides new user mode
              setShowNewUser(false);
              setNewUserName("");
              setNewUserEmail("");

              navigateWith({ person: next || null });
            }}
            disabled={!accountId || showNewUser}
            required={!showNewUser}
          >
            <option value="" disabled>
              {!accountId ? "Select account first…" : showNewUser ? "Creating new user…" : "Select user…"}
            </option>

            <optgroup label="Saved Recipients (name + email)">
              {grouped.savedRecipients.length === 0 ? (
                <option value="__none_saved" disabled>
                  (No saved recipients yet)
                </option>
              ) : (
                grouped.savedRecipients.map((p) => (
                  <option key={`${p.kind}:${p.id}`} value={`${p.kind}:${p.id}`}>
                    {p.name}
                  </option>
                ))
              )}
            </optgroup>

            <optgroup label="Portal Members (existing logins)">
              {grouped.portalMembers.length === 0 ? (
                <option value="__none_portal" disabled>
                  (No portal members yet)
                </option>
              ) : (
                grouped.portalMembers.map((p) => {
                  const usable = Boolean(p.email);
                  const label =
                    `${p.name}` +
                    (p.role ? ` · ${formatRoleLabel(p.role)}` : "") +
                    (p.disabled ? " (disabled)" : "") +
                    (!usable ? " (missing email)" : "");

                  return (
                    <option key={`${p.kind}:${p.id}`} value={`${p.kind}:${p.id}`} disabled={!usable}>
                      {label}
                    </option>
                  );
                })
              )}
            </optgroup>
          </select>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Dropdown shows <strong>Name</strong> (and <strong>Role</strong> for portal members). Email is used internally.
          </div>
        </div>

        <button
          type="button"
          style={smallBtn(!accountId)}
          disabled={!accountId}
          onClick={() => {
            const nextShow = !showNewUser;

            setShowNewUser(nextShow);

            if (nextShow) {
              setPersonKey("");
              setNewUserName("");
              setNewUserEmail("");
              setDistributorEmail("");
              navigateWith({ person: null });
              return;
            }

            setNewUserName("");
            setNewUserEmail("");
          }}
        >
          {showNewUser ? "Cancel New User" : "+ New User"}
        </button>
      </div>

      {/* New user fields */}
      {showNewUser ? (
        <div
          style={{
            padding: 12,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(0,0,0,0.12)",
            borderRadius: 10,
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Create New User (name + email)</div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={labelStyle()}>Full Name</div>
              <input
                name="new_user_full_name"
                style={inputStyle()}
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>

            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Email</div>
              <input
                name="new_user_email"
                style={inputStyle()}
                placeholder="name@customer.com"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            This creates an <strong>account-level saved recipient</strong> so you can invite them later.
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="new_user_full_name" value="" />
          <input type="hidden" name="new_user_email" value="" />
        </>
      )}

      {/* Distributor email */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={labelStyle()}>Distributor Email (required)</div>
          <input
            name="distributor_email"
            style={inputStyle()}
            placeholder="distributor@company.com"
            value={distributorEmail}
            onChange={(e) => setDistributorEmail(e.target.value)}
            required
          />
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Auto-fills from{" "}
            {showNewUser ? (
              <>
                the new user email{newUserEmail ? ` (${safeLower(newUserEmail)})` : ""}
              </>
            ) : (
              <>
                the selected user email{selectedPerson?.email ? ` (${safeLower(selectedPerson.email)})` : ""}
              </>
            )}
            , but you can edit it.
          </div>
        </div>
      </div>

      {/* Hidden fields for submit route */}
      <input type="hidden" name="account_id" value={accountId || ""} />
      <input type="hidden" name="selected_person" value={personKey || ""} />

      {/* Inline Create Account modal */}
      {showCreateAccount ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.38)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreateAccount(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: 16,
              background: "white",
              boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 14, fontWeight: 950 }}>Create Account</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Creates the customer account and selects it on this Intake page.
              </div>
            </div>

            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              <div>
                <div style={labelStyle()}>Account Name *</div>
                <input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  style={inputStyle()}
                  placeholder="Customer name"
                  autoFocus
                />
              </div>

              <div>
                <div style={labelStyle()}>Billing Email (optional)</div>
                <input
                  value={newAccountBillingEmail}
                  onChange={(e) => setNewAccountBillingEmail(e.target.value)}
                  style={inputStyle()}
                  placeholder="billing@customer.com"
                />
              </div>

              <div>
                <div style={labelStyle()}>Discount percent (default 40)</div>
                <input
                  value={newAccountDiscount}
                  onChange={(e) => setNewAccountDiscount(e.target.value)}
                  style={inputStyle()}
                  inputMode="decimal"
                />
              </div>

              <div>
                <div style={labelStyle()}>Payment terms (days after delivery)</div>
                <input
                  value={newAccountTermsDays}
                  onChange={(e) => setNewAccountTermsDays(e.target.value)}
                  style={inputStyle()}
                  inputMode="numeric"
                />
              </div>

              {createAccountError ? (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "rgba(220,0,0,0.25)",
                    background: "rgba(220,0,0,0.06)",
                    color: "crimson",
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {createAccountError}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
                <button type="button" style={smallBtn(creatingAccount)} disabled={creatingAccount} onClick={() => setShowCreateAccount(false)}>
                  Cancel
                </button>
                <button type="button" style={primaryBtn(creatingAccount)} disabled={creatingAccount} onClick={createAccountInline}>
                  {creatingAccount ? "Creating…" : "Create Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
