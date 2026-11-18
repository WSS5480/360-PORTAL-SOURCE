"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import PhiPatternAdvisoryModal, { PhiPatternInlineHint } from "@/components/sales/PhiPatternAdvisoryModal";
import { SalesCommandPage, sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import {
  buildQuickAddCreatePayload,
  resolveQuickAddPostSaveHref,
  validateQuickAddCase,
  type NewCaseType,
} from "@/lib/surgical-sales/newSurgicalCasePageLogic";
import {
  cleanProcedureSuggestions,
  collectQuickAddProcedureSuggestions,
  priorCaseProcedureTypesFromRows,
} from "@/lib/surgical-sales/quickAddProcedureSuggestions";
import { newCaseLayoutCss } from "./newCaseLayoutCss";
import { quickAddLayoutCss } from "./quickAddLayoutCss";
import { userFacingError } from "@/lib/errors/userFacingError";

type AccountRow = { id: string; name?: string | null };

type QuickAddProviderSummary = {
  provider: Record<string, unknown>;
  specialty: string | null;
  primary_organization: { id: string; name: string | null };
  priorCaseProcedureTypes: string[];
};

type ProviderPickOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type NewCaseDefaultsPayload = {
  suggested_procedure_type?: string | null;
  procedure_suggestions?: string[];
};

function lsLastAccountKey(userId: string) {
  return `surgical-new-case:v1:lastAccount:${userId}`;
}

export default function QuickAddCasePortalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [portalUserId, setPortalUserId] = React.useState<string | null>(null);
  const [loadBusy, setLoadBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [saveBusy, setSaveBusy] = React.useState(false);

  const [caseType, setCaseType] = React.useState<NewCaseType>(() => {
    const raw = (searchParams.get("case_type") || "").trim();
    return raw === "product_support" ? "product_support" : "observation";
  });
  const [accountId, setAccountId] = React.useState("");
  const [surgeonId, setSurgeonId] = React.useState("");
  const [caseDate, setCaseDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [caseTime, setCaseTime] = React.useState("");
  const [procedureType, setProcedureType] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [expectedRevenue, setExpectedRevenue] = React.useState("");

  const [providerSummary, setProviderSummary] = React.useState<QuickAddProviderSummary | null>(null);
  const [providerSummaryBusy, setProviderSummaryBusy] = React.useState(false);
  const [providerPickerUnlocked, setProviderPickerUnlocked] = React.useState(false);
  const [providerSearchQuery, setProviderSearchQuery] = React.useState("");
  const [providerPickOptions, setProviderPickOptions] = React.useState<ProviderPickOption[]>([]);
  const [providerSearchBusy, setProviderSearchBusy] = React.useState(false);
  const [defaults, setDefaults] = React.useState<NewCaseDefaultsPayload | null>(null);

  const [phiModal, setPhiModal] = React.useState<{ kinds: string[] } | null>(null);
  const phiAckRef = React.useRef(false);
  const procedureTouchedRef = React.useRef(false);
  const notePhiKinds = React.useMemo(() => detectSurgicalPhiPatternKinds(notes), [notes]);

  const launchSurgeonContactId = React.useMemo(
    () => (searchParams.get("surgeon_contact_id") || "").trim(),
    [searchParams],
  );
  const lockedEngagementId = React.useMemo(() => (searchParams.get("engagement_id") || "").trim(), [searchParams]);
  const showPreselectedProvider =
    Boolean((launchSurgeonContactId || surgeonId).trim()) && !providerPickerUnlocked;

  const providerBackId = launchSurgeonContactId;

  const createProviderHref = `/portal/sales/providers/new?return_to=${encodeURIComponent(
    `/portal/sales/cases/new?case_type=${caseType}${providerBackId ? `&surgeon_contact_id=${encodeURIComponent(providerBackId)}` : ""}${accountId ? `&account_id=${encodeURIComponent(accountId)}` : ""}`,
  )}`;

  const procedureSuggestions = React.useMemo(
    () =>
      cleanProcedureSuggestions([
        ...collectQuickAddProcedureSuggestions(
          providerSummary?.provider ?? null,
          providerSummary?.specialty ?? null,
          providerSummary?.priorCaseProcedureTypes ?? null,
        ),
        ...(defaults?.procedure_suggestions ?? []),
      ]),
    [defaults?.procedure_suggestions, providerSummary],
  );

  React.useEffect(() => {
    procedureTouchedRef.current = false;
    setProcedureType("");
  }, [surgeonId]);

  React.useEffect(() => {
    if (procedureTouchedRef.current) return;
    const first = procedureSuggestions[0];
    if (!first) return;
    setProcedureType((prev) => (prev.trim() ? prev : first));
  }, [procedureSuggestions]);

  React.useEffect(() => {
    phiAckRef.current = false;
  }, [notes]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadBusy(true);
      setErr(null);
      try {
        const [meRes, aRes] = await Promise.all([
          fetch("/api/portal/me", { cache: "no-store" }),
          fetch("/api/portal/sales/surgical-accounts", { cache: "no-store" }),
        ]);
        const meJson = await readResponseJson<{ ok?: boolean; user?: { id?: string } }>(meRes);
        const aJson = await readResponseJson<{ ok?: boolean; organizations?: AccountRow[]; error?: string }>(aRes);
        if (cancelled) return;
        if (!meJson.ok || !meJson.user?.id) throw new Error("Could not resolve user");
        if (!aJson.ok) throw new Error(aJson.error || "");
        const uid = String(meJson.user.id);
        setPortalUserId(uid);
        setAccounts(aJson.organizations || []);
        const qAid = (searchParams.get("account_id") || "").trim();
        let nextAccount = "";
        if (qAid && (aJson.organizations || []).some((a) => a.id === qAid)) {
          nextAccount = qAid;
        } else {
          try {
            const la = localStorage.getItem(lsLastAccountKey(uid));
            if (la && (aJson.organizations || []).some((a) => a.id === la)) nextAccount = la;
          } catch {
            /* ignore */
          }
        }
        if (nextAccount) setAccountId(nextAccount);
      } catch (e: unknown) {
        if (!cancelled) setErr(userFacingError(e, "We could not load this page. Please try again."));
      } finally {
        if (!cancelled) setLoadBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const applyProviderSummary = React.useCallback((summary: QuickAddProviderSummary) => {
    setProviderSummary(summary);
    const primaryId = String(summary.primary_organization?.id || "").trim();
    if (primaryId) {
      setAccountId((prev) => (prev && prev === primaryId ? prev : primaryId));
    }
  }, []);

  const loadProviderSummary = React.useCallback(
    async (providerId: string) => {
      if (!providerId) {
        setProviderSummary(null);
        return;
      }
      setProviderSummaryBusy(true);
      try {
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, { cache: "no-store" });
        const j = await readResponseJson<{
          ok?: boolean;
          provider?: Record<string, unknown>;
          specialty?: string | null;
          primary_organization?: { id?: string; name?: string | null };
          cases?: Array<{ procedure_type?: string | null }>;
        }>(res);
        if (!res.ok || !j.ok || !j.provider) {
          setProviderSummary(null);
          return;
        }
        applyProviderSummary({
          provider: j.provider,
          specialty: j.specialty ?? null,
          primary_organization: {
            id: String(j.primary_organization?.id || "").trim(),
            name: j.primary_organization?.name ?? null,
          },
          priorCaseProcedureTypes: priorCaseProcedureTypesFromRows(j.cases),
        });
      } catch {
        setProviderSummary(null);
      } finally {
        setProviderSummaryBusy(false);
      }
    },
    [applyProviderSummary],
  );

  React.useEffect(() => {
    if (loadBusy || !launchSurgeonContactId) return;
    setSurgeonId(launchSurgeonContactId);
    void loadProviderSummary(launchSurgeonContactId);
  }, [launchSurgeonContactId, loadBusy, loadProviderSummary]);

  React.useEffect(() => {
    if (!lockedEngagementId || loadBusy) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/portal/sales/engagements/${encodeURIComponent(lockedEngagementId)}/case-prefill`,
          { cache: "no-store" },
        );
        const j = await readResponseJson<{
          ok?: boolean;
          prefill?: {
            has_linked_case?: boolean;
            linked_case_id?: string | null;
            provider_id?: string;
            organization_id?: string | null;
          };
        }>(res);
        if (cancelled || !j.ok || !j.prefill) return;
        if (j.prefill.has_linked_case && j.prefill.linked_case_id) {
          router.replace(`/portal/sales/cases/${encodeURIComponent(j.prefill.linked_case_id)}`);
          return;
        }
        if (j.prefill.organization_id) setAccountId(j.prefill.organization_id);
        if (j.prefill.provider_id) {
          setSurgeonId(j.prefill.provider_id);
          void loadProviderSummary(j.prefill.provider_id);
        }
      } catch {
        /* optional prefill */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockedEngagementId, loadBusy, loadProviderSummary, router]);

  React.useEffect(() => {
    const q = providerSearchQuery.trim();
    if (q.length < 2) {
      setProviderPickOptions([]);
      return;
    }
    let cancelled = false;
    setProviderSearchBusy(true);
    void (async () => {
      try {
        const u = new URL("/api/portal/sales/providers", window.location.origin);
        u.searchParams.set("q", q);
        u.searchParams.set("limit", "8");
        const res = await fetch(u.toString(), { cache: "no-store" });
        const j = await readResponseJson<{ ok?: boolean; providers?: Array<Record<string, unknown>> }>(res);
        if (cancelled) return;
        const options: ProviderPickOption[] = (j.providers || []).map((p) => ({
          id: String(p.id),
          label: `${String(p.first_name || "").trim()} ${String(p.last_name || "").trim()}`.trim() || String(p.id),
          subtitle: String(p.primary_organization_name || p.specialty || "").trim() || undefined,
        }));
        setProviderPickOptions(options);
      } catch {
        if (!cancelled) setProviderPickOptions([]);
      } finally {
        if (!cancelled) setProviderSearchBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerSearchQuery]);

  const effectiveSurgeonId = surgeonId || launchSurgeonContactId;

  React.useEffect(() => {
    if (!portalUserId) return;
    let cancelled = false;
    const u = new URL("/api/portal/sales/surgical-cases/new-defaults", window.location.origin);
    if (accountId) u.searchParams.set("account_id", accountId);
    if (effectiveSurgeonId) u.searchParams.set("surgeon_contact_id", effectiveSurgeonId);
    void (async () => {
      try {
        const res = await fetch(u.toString(), { cache: "no-store" });
        const j = await readResponseJson<{ ok?: boolean; defaults?: NewCaseDefaultsPayload }>(res);
        if (!cancelled) setDefaults(res.ok && j.ok ? j.defaults ?? null : null);
      } catch {
        if (!cancelled) setDefaults(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, effectiveSurgeonId, portalUserId]);

  const saveCase = async () => {
    setErr(null);
    const validation = validateQuickAddCase({
      caseType,
      surgeonId: effectiveSurgeonId,
      accountId,
      caseDate,
      procedureType,
      notes,
      expectedRevenue,
      phiAcknowledged: phiAckRef.current,
    });
    if (!validation.ok) {
      if (validation.error === "PHI_ACK_REQUIRED") {
        setPhiModal({ kinds: notePhiKinds });
        return;
      }
      setErr(validation.error);
      return;
    }

    setSaveBusy(true);
    try {
      const body = buildQuickAddCreatePayload({
        caseType,
        accountId,
        surgeonId: effectiveSurgeonId,
        caseDate,
        caseTime,
        procedureType,
        notes,
        expectedRevenue,
        engagementLocked: Boolean(lockedEngagementId),
        lockedEngagementId: lockedEngagementId,
      });
      const res = await fetch("/api/portal/sales/surgical-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readResponseJson<{ ok?: boolean; case?: { id: string }; error?: unknown }>(res);
      if (!res.ok || !j.ok || !j.case?.id) {
        const msg = typeof j.error === "string" ? j.error : "Could not save case";
        throw new Error(msg);
      }

      if (portalUserId) {
        try {
          localStorage.setItem(lsLastAccountKey(portalUserId), accountId);
        } catch {
          /* ignore */
        }
      }

      router.push(resolveQuickAddPostSaveHref(j.case.id, caseType));
    } catch (e: unknown) {
      phiAckRef.current = false;
      setErr(userFacingError(e, "Could not save case"));
    } finally {
      setSaveBusy(false);
    }
  };

  const providerDisplayName = providerSummary
    ? contactDisplayName(providerSummary.provider as never)
    : effectiveSurgeonId
      ? "Provider"
      : "";

  const providerBackHref = providerBackId
    ? `/portal/sales/providers/${encodeURIComponent(providerBackId)}`
    : null;
  const providerBackLabel =
    providerBackHref && providerSummary && String(providerSummary.provider.id || "") === providerBackId
      ? `← Back to ${providerDisplayName}`
      : "← Back to provider";

  return (
    <SalesCommandPage nativeLayout omitBuiltInHeader title="Add case" subtitle="" actions={null}>
      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${newCaseLayoutCss}\n${quickAddLayoutCss}` }} />

      <div className={`quick-add-shell${providerBackId ? " quick-add-shell--from-provider" : ""}`}>
        {loadBusy ? <div className="quick-add-shell-status">Loading…</div> : null}

        <header className="create-case-header quick-add-shell-header">
          <div className="create-case-header-nav">
            <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
            {providerBackHref ? (
              <Link href={providerBackHref} className="create-case-back">
                {providerBackLabel}
              </Link>
            ) : (
              <Link href="/portal/sales/cases" className="create-case-back">
                ← Back to Cases
              </Link>
            )}
          </div>
          <h1 className="create-case-title">Add case</h1>
          {providerBackId ? (
            <p className="create-case-subtitle quick-add-provider-context">
              {providerSummaryBusy
                ? "Loading provider…"
                : providerDisplayName
                  ? `${providerDisplayName}${providerSummary?.specialty ? ` · ${providerSummary.specialty}` : ""}`
                  : "Provider selected"}
            </p>
          ) : (
            <p className="create-case-subtitle">Who, where, when, what — then save.</p>
          )}
        </header>

        <div className="quick-add-steps" aria-hidden>
          <span className="quick-add-steps__item">Who</span>
          <span className="quick-add-steps__item">Where</span>
          <span className="quick-add-steps__item">When</span>
          <span className="quick-add-steps__item">What</span>
          <span className="quick-add-steps__item quick-add-steps__item--save">Save</span>
        </div>

        <form
          className="quick-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            void saveCase();
          }}
        >
          <div className="quick-add-scroll">
            {err ? (
              <div role="alert" className="quick-add-shell-error" style={sc.alertError}>
                {err}
              </div>
            ) : null}

            <div className="quick-add-root">
              <div className="quick-add-card">
          <section className="new-case-section quick-add-case-type-section">
            <h2 className="new-case-title">Case type</h2>
            <div className="quick-add-type-grid" role="group" aria-label="Case type">
              <button
                type="button"
                className={`quick-add-type-btn ${caseType === "observation" ? "is-selected" : ""}`}
                aria-pressed={caseType === "observation"}
                onClick={() => setCaseType("observation")}
              >
                <span className="quick-add-type-btn__icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <span className="quick-add-type-btn__label">Observation case</span>
              </button>
              <button
                type="button"
                className={`quick-add-type-btn ${caseType === "product_support" ? "is-selected" : ""}`}
                aria-pressed={caseType === "product_support"}
                onClick={() => setCaseType("product_support")}
              >
                <span className="quick-add-type-btn__icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="M3.3 7.3 12 12.25l8.7-4.95" />
                    <path d="M12 22.1V12.25" />
                  </svg>
                </span>
                <span className="quick-add-type-btn__label">Product support case</span>
              </button>
            </div>
          </section>

          <section className="quick-add-field quick-add-provider-section">
            <div className="quick-add-provider-head">
              <span className="quick-add-label">
                Provider
                {caseType === "observation" ? (
                  <>
                    {" "}
                    <span style={{ color: "var(--brand-600)" }}>*</span>
                  </>
                ) : null}
              </span>
              <Link href={createProviderHref} className="quick-add-provider-secondary quick-add-new-provider-link">
                + New provider
              </Link>
            </div>

            {showPreselectedProvider ? (
              <div className="quick-add-provider-selected" aria-busy={providerSummaryBusy}>
                {providerSummaryBusy ? (
                  <span className="quick-add-provider-name">Loading provider…</span>
                ) : (
                  <span className="quick-add-provider-name">
                    {providerDisplayName}
                    {providerSummary?.specialty ? (
                      <span className="quick-add-provider-specialty"> · {providerSummary.specialty}</span>
                    ) : null}
                  </span>
                )}
                <button
                  type="button"
                  className="quick-add-provider-change"
                  onClick={() => {
                    setSurgeonId("");
                    setProviderSummary(null);
                    setProviderPickerUnlocked(true);
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <label style={{ display: "grid", gap: 5 }}>
                  <span className="quick-add-label-secondary">Search</span>
                  <input
                    value={providerSearchQuery}
                    onChange={(e) => setProviderSearchQuery(e.target.value)}
                    placeholder="Name, organization, specialty…"
                    style={sc.input}
                    autoComplete="off"
                  />
                </label>
                <label style={{ display: "grid", gap: 5 }}>
                  <span className="quick-add-label-secondary">Select provider</span>
                  <select
                    required={caseType === "observation"}
                    value={surgeonId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSurgeonId(id);
                      setProviderSummary(null);
                      if (id) void loadProviderSummary(id);
                    }}
                    style={sc.input}
                  >
                    <option value="">{providerSearchBusy ? "Loading providers…" : "Select provider…"}</option>
                    {providerPickOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.subtitle ? `${p.label} · ${p.subtitle}` : p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </section>

          <label className="quick-add-field">
            <span className="quick-add-label">
              Facility <span style={{ color: "var(--brand-600)" }}>*</span>
            </span>
            <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} style={sc.input}>
              <option value="">Select facility…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.id}
                </option>
              ))}
            </select>
          </label>

          <div className="new-case-fields-2 quick-add-schedule-row">
            <label className="quick-add-field">
              <span className="quick-add-label">
                Case date <span style={{ color: "var(--brand-600)" }}>*</span>
              </span>
              <input required type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} style={sc.input} />
            </label>
            <label className="quick-add-field">
              <span className="quick-add-label">Case time (optional)</span>
              <input type="time" value={caseTime} onChange={(e) => setCaseTime(e.target.value)} style={sc.input} />
            </label>
          </div>

          <div className="quick-add-field quick-add-procedure-field">
            <label style={{ display: "grid", gap: 5 }}>
              <span className="quick-add-label">
                Procedure / specialty <span style={{ color: "var(--brand-600)" }}>*</span>
              </span>
              <input
                required
                value={procedureType}
                onChange={(e) => {
                  procedureTouchedRef.current = true;
                  setProcedureType(e.target.value);
                }}
                placeholder="e.g. Revisional bariatric surgery"
                style={sc.input}
              />
            </label>
            {procedureSuggestions.length > 0 ? (
              <div className="quick-add-procedure-chips" role="group" aria-label="Suggested procedures">
                {procedureSuggestions.map((suggestion) => {
                  const selected = procedureType.trim().toLowerCase() === suggestion.toLowerCase();
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      className={`quick-add-procedure-chip ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => {
                        procedureTouchedRef.current = true;
                        setProcedureType(suggestion);
                      }}
                    >
                      {suggestion}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <label className="quick-add-field">
            <span className="quick-add-label">
              Revenue per case <span className="quick-add-optional">(optional)</span>
            </span>
            <input
              value={expectedRevenue}
              onChange={(e) => setExpectedRevenue(e.target.value)}
              placeholder="e.g. 4500"
              inputMode="decimal"
              autoComplete="off"
              style={sc.input}
            />
          </label>

          <label className="quick-add-field quick-add-note-field">
            <span className="quick-add-label">
              Quick note <span className="quick-add-optional">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Field context only"
              style={{ ...sc.input, resize: "vertical" }}
            />
            <span className="quick-add-phi-hint">No patient identifiers.</span>
            {notePhiKinds.length ? <PhiPatternInlineHint kinds={notePhiKinds} /> : null}
          </label>
              </div>
            </div>
          </div>

          <div className="quick-add-footer">
            <button
              type="submit"
              className="new-case-btn-primary quick-add-primary"
              style={sc.btnPrimary}
              disabled={saveBusy || loadBusy}
            >
              {saveBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>

      <PhiPatternAdvisoryModal
        open={Boolean(phiModal)}
        kinds={phiModal?.kinds ?? []}
        onCancel={() => setPhiModal(null)}
        onContinue={() => {
          phiAckRef.current = true;
          setPhiModal(null);
          void saveCase();
        }}
      />
    </SalesCommandPage>
  );
}
