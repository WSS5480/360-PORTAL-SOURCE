"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BulkRuleRowsEditor, { type BulkRuleProductOption } from "@/components/admin/BulkRuleRowsEditor";
import { formatRoleLabel } from "@/lib/formatStatusLabel";
import { DEFAULT_BULK_PRICE_PER_SQCM } from "@/lib/bulkRules";
import {
  normalizeBulkRulesForSave,
  parseAllBulkRuleDrafts,
  type BulkRuleDraft,
} from "@/lib/bulkPricingRuleDraft";

export type AccountItem = { id: string; name: string; discount_percent?: number };

// Must match your enum values exactly. INTERNAL_ADMIN, IVR_STAFF, INTERNAL_SALES_REP set flags on accept.
export type AccountUserRole =
  | "INTERNAL_ADMIN"
  | "IVR_STAFF"
  | "INTERNAL_SALES_REP"
  | "ORDER_CREATOR"
  | "ACCOUNT_ADMIN";

const ROLE_OPTIONS: Array<{ value: AccountUserRole; label: string; hint: string }> = [
  {
    value: "INTERNAL_ADMIN",
    label: "Internal Admin",
    hint: "Full admin access to the 360 portal.",
  },
  {
    value: "IVR_STAFF",
    label: "IVR Team staff",
    hint: "Internal staff for IVR queue and verification.",
  },
  {
    value: "INTERNAL_SALES_REP",
    label: "Internal sales rep",
    hint: "Sales Command CRM (pipeline, opportunities, leaderboard) for this account context.",
  },
  {
    value: "ORDER_CREATOR",
    label: "Customer",
    hint: "Can place orders and submit IVRs for their account.",
  },
  {
    value: "ACCOUNT_ADMIN",
    label: "Account admin",
    hint: "Full access for this account (customer side).",
  },
];

type PortalMember = {
  user_id: string;
  role: string | null;
  display_name?: string | null;
  email?: string | null;
};


function clampPercent(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export default function InviteClient(props: {
  accounts: AccountItem[];
  products?: BulkRuleProductOption[];

  // optional prefill (safe defaults)
  initialEmail?: string;
  initialFullName?: string;
  initialAccountId?: string;
  fromPeople?: boolean;
}) {
  const [mode, setMode] = useState<"existing" | "new">(props.initialAccountId ? "existing" : "existing");

  const [fullName, setFullName] = useState<string>(props.initialFullName || "");
  const [email, setEmail] = useState<string>(props.initialEmail || "");

  const [accountId, setAccountId] = useState<string>(props.initialAccountId || "");
  const [accountName, setAccountName] = useState<string>("");

  const [role, setRole] = useState<AccountUserRole>("ORDER_CREATOR");

  // New account discount percent (0–100). Store as string for UX.
  const [discountPercent, setDiscountPercent] = useState<string>("40");
  const [termsDays, setTermsDays] = useState<string>("30");
  const [allowBulk, setAllowBulk] = useState(false);
  const [allowVirtualWarehouse, setAllowVirtualWarehouse] = useState(false);
  const [bulkRules, setBulkRules] = useState<BulkRuleDraft[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    inviteUrl: string | null;
  } | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [portalMembers, setPortalMembers] = useState<PortalMember[]>([]);
  const [confirmExisting, setConfirmExisting] = useState(false);
  const submittingRef = useRef(false);

  const dismissInviteSuccess = useCallback(() => {
    setSuccessInfo(null);
    setErrMsg(null);
    setEmail("");
    setFullName("");
    setConfirmExisting(false);
  }, []);

  const selectedAccountName = useMemo(() => {
    return props.accounts.find((a) => a.id === accountId)?.name || "this account";
  }, [props.accounts, accountId]);

  const parsedDiscount = useMemo(() => {
    const raw = discountPercent.trim();
    if (!raw) return 0;
    const n = Number(raw);
    return clampPercent(n);
  }, [discountPercent]);

  const parsedBulkRules = useMemo(() => parseAllBulkRuleDrafts(bulkRules), [bulkRules]);

  const hasInvalidBulkRules = parsedBulkRules.some((r) => !r.valid);
  const bulkRulesValid = !allowBulk || (allowBulk && bulkRules.length > 0 && !hasInvalidBulkRules);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const n = fullName.trim();
    if (n.length < 2) return false;
    if (!e.includes("@")) return false;

    if (mode === "existing") return Boolean(accountId);
    if (mode === "new") {
      if (!accountName.trim()) return false;
      if (!bulkRulesValid) return false;
      const raw = discountPercent.trim();
      if (!raw) return true;
      return !Number.isNaN(Number(raw));
    }
    return false;
  }, [email, fullName, mode, accountId, accountName, discountPercent, bulkRulesValid]);

  const canSubmitWithConfirm = useMemo(() => {
    if (!canSubmit) return false;
    if (mode === "existing" && accountId) return confirmExisting;
    return true;
  }, [canSubmit, mode, accountId, confirmExisting]);

  useEffect(() => {
    if (mode !== "existing" || !accountId) {
      setPortalMembers([]);
      setMembersError(null);
      setMembersLoading(false);
      setConfirmExisting(false);
      return;
    }

    let active = true;
    setMembersLoading(true);
    setMembersError(null);
    setConfirmExisting(false);

    fetch(`/api/admin/accounts/${accountId}/people`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (!json?.ok) {
          setMembersError(json?.error || "Failed to load account users.");
          setPortalMembers([]);
          return;
        }
        setPortalMembers(Array.isArray(json.portalMembers) ? json.portalMembers : []);
      })
      .catch((err) => {
        if (!active) return;
        setMembersError(err?.message || "Failed to load account users.");
        setPortalMembers([]);
      })
      .finally(() => {
        if (!active) return;
        setMembersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mode, accountId]);

  useEffect(() => {
    if (!successInfo) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismissInviteSuccess();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [successInfo, dismissInviteSuccess]);

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setErrMsg(null);
    setSuccessInfo(null);

    try {
      const termsDaysNum = Number(termsDays || "30");
      const bulk_rules =
        mode === "new" && allowBulk && !hasInvalidBulkRules
          ? normalizeBulkRulesForSave(
              parsedBulkRules
                .filter((r) => r.valid && r.min_sqcm !== null && r.price_per_sqcm !== null)
                .map((r) => ({
                  min_sqcm: r.min_sqcm!,
                  price_per_sqcm: r.price_per_sqcm!,
                  product_id: r.product_id,
                }))
            )
          : [];

      const body: Record<string, unknown> = {
        email: email.trim(),
        fullName: fullName.trim(),
        mode,
        accountId: mode === "existing" ? accountId : undefined,
        accountName: mode === "new" ? accountName.trim() : undefined,
        fromPeople: Boolean(props.fromPeople),
        role,
      };

      if (mode === "new") {
        body.discount_percent = parsedDiscount;
        body.payment_terms_days = Number.isFinite(termsDaysNum) ? termsDaysNum : 30;
        body.payment_terms_label = `Net ${Number.isFinite(termsDaysNum) ? termsDaysNum : 30} (after delivery)`;
        body.bulk_enabled = allowBulk;
        body.bulk_rules = allowBulk ? bulk_rules : [];
        body.virtual_warehouse_enabled = allowVirtualWarehouse;
      }

      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const json: any = isJson ? await res.json().catch(() => null) : null;

      if (!isJson || !json) {
        setErrMsg("Session may have expired. Please sign in again and try.");
        if (!isJson) window.location.href = "/login?next=" + encodeURIComponent("/admin/invite");
        return;
      }

      if (!res.ok || !json?.ok) {
        setErrMsg(json?.error || `Invite failed (${res.status})`);
        return;
      }

      setSuccessInfo({
        message: "Invite created and email sent.",
        inviteUrl: json.inviteUrl || null,
      });
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  const selectedRoleHint = ROLE_OPTIONS.find((r) => r.value === role)?.hint || "";

  return (
    <div style={{ marginTop: 14 }}>
      {props.fromPeople ? (
        <div style={{ marginBottom: 12, fontSize: 12, opacity: 0.75 }}>
          Prefilled from People. Review and click Invite.
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>Full name</div>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>Role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AccountUserRole)}
            style={{
              width: "100%",
              padding: "10px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              fontSize: 14,
              background: "white",
            }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {selectedRoleHint ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{selectedRoleHint}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              checked={mode === "existing"}
              onChange={() => {
                setMode("existing");
                setSuccessInfo(null);
                setErrMsg(null);
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 800 }}>Invite to existing account</span>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              checked={mode === "new"}
              onChange={() => {
                setMode("new");
                setAccountId("");
                setSuccessInfo(null);
                setErrMsg(null);
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 800 }}>Create new account + invite</span>
          </label>
        </div>

        {mode === "existing" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>Account</div>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)",
                  fontSize: 14,
                  background: "white",
                }}
              >
                <option value="" disabled>
                  Select account…
                </option>
                {props.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {accountId ? (
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 13 }}>
                  Confirm account access
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                  Are you sure you want to add this customer to <b>{selectedAccountName}</b>? These users will have shared data.
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>Current account users</div>
                  {membersLoading ? (
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Loading account users…</div>
                  ) : membersError ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>{membersError}</div>
                  ) : portalMembers.length ? (
                    <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                      {portalMembers.slice(0, 10).map((m) => {
                        const label = m.display_name || m.email || `User ${String(m.user_id).slice(0, 6)}`;
                        return (
                          <li key={m.user_id} style={{ fontSize: 12 }}>
                            <span style={{ fontWeight: 800 }}>{label}</span>
                            {m.email ? <span style={{ opacity: 0.7 }}> • {m.email}</span> : null}
                            {m.role ? <span style={{ opacity: 0.7 }}> • {formatRoleLabel(m.role)}</span> : null}
                          </li>
                        );
                      })}
                      {portalMembers.length > 10 ? (
                        <li style={{ fontSize: 12, opacity: 0.7 }}>+ {portalMembers.length - 10} more</li>
                      ) : null}
                    </ul>
                  ) : (
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>No users yet.</div>
                  )}
                </div>

                <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={confirmExisting}
                    onChange={(e) => setConfirmExisting(e.target.checked)}
                  />
                  <span style={{ fontSize: 12, fontWeight: 900 }}>
                    I understand and want to add this customer to {selectedAccountName}.
                  </span>
                </label>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>New account name</div>
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Account name"
                    style={{
                      width: "100%",
                      padding: "10px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.2)",
                      fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ flex: "0 1 140px", minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>Account discount %</div>
                  <input
                    inputMode="decimal"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0"
                    style={{
                      width: "100%",
                      padding: "10px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.2)",
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Percent from 0 to 100 (example: 12.5). Saved on the account and used for product pricing.
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>
                Payment terms (days after delivery)
              </div>
              <input
                inputMode="numeric"
                value={termsDays}
                onChange={(e) => setTermsDays(e.target.value)}
                placeholder="30"
                style={{
                  width: "100%",
                  padding: "10px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)",
                  fontSize: 14,
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Label will be saved as <b>Net {termsDays || "30"} (after delivery)</b>.
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allowBulk}
                  onChange={(e) => setAllowBulk(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ fontSize: 14, fontWeight: 800 }}>Allow bulk purchasing</span>
              </label>

              {allowBulk ? (
                <>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Add sq cm thresholds and $/sq cm. Use All products or scope a tier to one product.
                  </div>
                  <BulkRuleRowsEditor
                    rules={bulkRules}
                    setRules={setBulkRules}
                    products={props.products}
                    emptyHint="No bulk rules yet. Add at least one to enable bulk purchasing."
                    defaultPricePerSqcm={String(DEFAULT_BULK_PRICE_PER_SQCM)}
                  />
                  {hasInvalidBulkRules ? (
                    <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
                      Each rule needs a valid min total sq cm (≥0) and a positive base $/sq cm.
                    </div>
                  ) : null}
                </>
              ) : null}

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={allowVirtualWarehouse}
                  onChange={(e) => setAllowVirtualWarehouse(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ fontSize: 14, fontWeight: 800 }}>Enable virtual warehouse</span>
              </label>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: -4 }}>
                Bulk customers can allocate paid units to a balance and ship later without a new product invoice.
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!canSubmitWithConfirm || loading}
          onClick={submit}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#111",
            color: "white",
            fontWeight: 900,
            cursor: canSubmitWithConfirm && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Sending…" : "Send Invite"}
        </button>

        {errMsg ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(220,0,0,0.25)",
              color: "crimson",
            }}
          >
            <div style={{ fontWeight: 900 }}>Invite failed</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>{errMsg}</div>
          </div>
        ) : null}

      </div>

      {successInfo ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-success-title"
          onClick={dismissInviteSuccess}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.45)",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              padding: 20,
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
          >
            <div id="invite-success-title" style={{ fontSize: 18, fontWeight: 900 }}>
              Invite sent
            </div>
            <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>{successInfo.message}</div>

            {successInfo.inviteUrl ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Invite link (dev)</div>
                <div
                  style={{
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(0,0,0,0.02)",
                    wordBreak: "break-all",
                    fontSize: 12,
                  }}
                >
                  {successInfo.inviteUrl}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(successInfo.inviteUrl!);
                    } catch {}
                  }}
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Copy link
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>(No invite link returned)</div>
            )}

            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={dismissInviteSuccess}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#111",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
