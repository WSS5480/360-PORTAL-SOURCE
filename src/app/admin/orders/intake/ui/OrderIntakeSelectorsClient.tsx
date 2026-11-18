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
  kind: "ACCOUNT_USER" | "PORTAL_MEMBER" | "ACCOUNT_INVITE";
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

function safeLower(s: unknown) {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

export default function OrderIntakeSelectorsClient(props: {
  accounts: AccountOption[];
  selectedAccountId: string;
  people: PersonOption[];
  initialSelectedPersonKey: string; // "ACCOUNT_USER:<uuid>" | "PORTAL_MEMBER:<uuid>" | "ACCOUNT_INVITE:<uuid>" | ""
  createAccountHref?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [accountId, setAccountId] = useState(props.selectedAccountId || "");
  const [personKey, setPersonKey] = useState(props.initialSelectedPersonKey || "");

  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");

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
    const invitedUsers = props.people.filter((p) => p.kind === "ACCOUNT_INVITE");
    return { savedRecipients, portalMembers, invitedUsers };
  }, [props.people]);

  function navigateWith(params: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`/admin/orders/intake?${next.toString()}`);
  }

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

      const res = await fetch("/admin/orders/intake/new-account/submit", {
        method: "POST",
        body: fd,
        headers: { accept: "application/json" },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.id) {
        const msg = json?.error || `Failed to create account (${res.status})`;
        setCreateAccountError(msg);
        return;
      }

      const id = String(json.id);
      setShowCreateAccount(false);
      setNewAccountName("");
      setNewAccountBillingEmail("");
      setNewAccountDiscount("40");
      setNewAccountTermsDays("30");
      setAccountId(id);

      setPersonKey("");
      setShowNewUser(false);
      setNewUserName("");
      setNewUserEmail("");

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
              setPersonKey("");
              setShowNewUser(false);
              setNewUserName("");
              setNewUserEmail("");
              navigateWith({ account_id: nextId || null, person: null });
            }}
            required
          >
            <option value="" disabled>
              Select account…
            </option>
            {props.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.is_active === false ? " (inactive)" : ""}
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

            <optgroup label="Invited Users (pending invite)">
              {grouped.invitedUsers.length === 0 ? (
                <option value="__none_invited" disabled>
                  (No pending invites)
                </option>
              ) : (
                grouped.invitedUsers.map((p) => {
                  const usable = Boolean(p.email);
                  const label =
                    `${p.name}` +
                    (p.role ? ` · ${formatRoleLabel(p.role)}` : "") +
                    " (invited)" +
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
            Dropdown shows <strong>Name</strong> (and <strong>Role</strong> for portal members and invites). Email is used internally.
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

      <input type="hidden" name="account_id" value={accountId || ""} />
      <input type="hidden" name="selected_person" value={personKey || ""} />

      {showCreateAccount ? (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 30,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 16,
              maxWidth: 560,
              width: "100%",
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>Create Account</div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Creates a new account and returns here with it selected.
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <label>
                <div style={labelStyle()}>Account Name</div>
                <input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  style={inputStyle()}
                  placeholder="Acme Dental"
                />
              </label>
              <label>
                <div style={labelStyle()}>Billing Email (optional)</div>
                <input
                  value={newAccountBillingEmail}
                  onChange={(e) => setNewAccountBillingEmail(e.target.value)}
                  style={inputStyle()}
                  placeholder="billing@acme.com"
                />
              </label>
              <label>
                <div style={labelStyle()}>Discount percent (default 40)</div>
                <input
                  value={newAccountDiscount}
                  onChange={(e) => setNewAccountDiscount(e.target.value)}
                  style={inputStyle()}
                  inputMode="decimal"
                />
              </label>
              <label>
                <div style={labelStyle()}>Payment terms (days after delivery)</div>
                <input
                  value={newAccountTermsDays}
                  onChange={(e) => setNewAccountTermsDays(e.target.value)}
                  style={inputStyle()}
                  inputMode="numeric"
                />
              </label>
            </div>

            {createAccountError ? (
              <div style={{ marginTop: 10, color: "crimson", fontWeight: 900, fontSize: 12 }}>
                {createAccountError}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                style={smallBtn()}
                onClick={() => {
                  if (creatingAccount) return;
                  setShowCreateAccount(false);
                }}
              >
                Cancel
              </button>
              <button type="button" style={smallBtn(creatingAccount)} disabled={creatingAccount} onClick={createAccountInline}>
                {creatingAccount ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPerson?.email ? <input type="hidden" name="selected_person_email" value={safeLower(selectedPerson.email)} /> : null}
    </div>
  );
}
