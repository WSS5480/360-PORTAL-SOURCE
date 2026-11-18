"use client";

import React from "react";
import type { CSSProperties } from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { dollarsToCents } from "@/lib/sales/formatUsd";
import { LOST_REASONS } from "@/lib/sales/activityTypes";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import {
  applyAdoptionInitiativePrefill,
  emptyAdoptionInitiativeCreateForm,
  validateAdoptionInitiativeCreateForm,
  type AdoptionInitiativeCreateForm,
  type AdoptionInitiativeCreatePrefill,
  type AdoptionInitiativeOrgOption,
} from "@/lib/sales/adoptionInitiativeCreate";
import { SALES_STAGE_LABEL, SALES_STAGES, type SalesStage } from "@/lib/sales/stages";
import { uniqueOrderedIds } from "@/lib/sales/uniqueOrderedIds";
import { contactDisplayName } from "@/lib/surgical-sales/labels";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CRM_ORG_OTHER = "__crm_org_other__";

type SurgicalFamilyOption = { id: string; name: string };
const DEFAULT_FAMILIES: SurgicalFamilyOption[] = [
  { id: "family-acsis", name: "ACSIS" },
  { id: "family-endolumik", name: "Endolumik" },
  { id: "family-skeletal-dynamics", name: "Skeletal Dynamics" },
  { id: "family-biotissue", name: "BioTissue" },
  { id: "family-telabio", name: "TelaBio" },
];

type ProviderOption = { id: string; label: string };
type LinkOption = { id: string; label: string };

export function CreateAdoptionInitiativeModal({
  onClose,
  onSaved,
  prefillQuery,
}: {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  prefillQuery: { surgeonContactId?: string; engagementId?: string; caseId?: string; accountId?: string };
}) {
  const [form, setForm] = React.useState<AdoptionInitiativeCreateForm>(emptyAdoptionInitiativeCreateForm);
  const [providerOrgs, setProviderOrgs] = React.useState<AdoptionInitiativeOrgOption[]>([]);
  const [crmOrgs, setCrmOrgs] = React.useState<AdoptionInitiativeOrgOption[]>([]);
  const [providers, setProviders] = React.useState<ProviderOption[]>([]);
  const [engagements, setEngagements] = React.useState<LinkOption[]>([]);
  const [cases, setCases] = React.useState<LinkOption[]>([]);
  const [surgicalFamilies, setSurgicalFamilies] = React.useState<SurgicalFamilyOption[]>(DEFAULT_FAMILIES);
  const [prefillMeta, setPrefillMeta] = React.useState<AdoptionInitiativeCreatePrefill | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [bootBusy, setBootBusy] = React.useState(true);
  const [providerSearch, setProviderSearch] = React.useState("");

  const lockProvider = Boolean(prefillQuery.engagementId || prefillQuery.caseId);
  const lockEngagement = Boolean(prefillQuery.engagementId);
  const lockCase = Boolean(prefillQuery.caseId);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBootBusy(true);
      try {
        const [orgRes, provRes] = await Promise.all([
          fetch("/api/portal/sales/surgical-accounts?for_opportunities=1&directory_scope=active", { cache: "no-store" }),
          fetch("/api/portal/sales/providers?archive=active", { cache: "no-store" }),
        ]);
        const orgJson = (await orgRes.json()) as {
          ok?: boolean;
          organizations?: { id: string; name?: string; surgical_crm_billing_city?: string; surgical_crm_billing_state?: string }[];
        };
        const provJson = (await provRes.json()) as {
          ok?: boolean;
          providers?: { id: string; first_name?: string; last_name?: string; email?: string }[];
        };
        if (!cancelled && orgJson.ok && Array.isArray(orgJson.organizations)) {
          setCrmOrgs(
            orgJson.organizations.map((o) => ({
              id: o.id,
              name: String(o.name || "").trim() || "Organization",
              city: String(o.surgical_crm_billing_city || "").trim() || undefined,
              state: String(o.surgical_crm_billing_state || "").trim() || undefined,
            })),
          );
        }
        if (!cancelled && provJson.ok && Array.isArray(provJson.providers)) {
          setProviders(
            provJson.providers.map((p) => ({
              id: String(p.id),
              label: contactDisplayName(p as Parameters<typeof contactDisplayName>[0]),
            })),
          );
        }
        const qs = new URLSearchParams();
        if (prefillQuery.surgeonContactId) qs.set("surgeon_contact_id", prefillQuery.surgeonContactId);
        if (prefillQuery.engagementId) qs.set("engagement_id", prefillQuery.engagementId);
        if (prefillQuery.caseId) qs.set("case_id", prefillQuery.caseId);
        if ([...qs.keys()].length > 0) {
          const preRes = await fetch(`/api/portal/sales/opportunities/create-prefill?${qs.toString()}`, {
            cache: "no-store",
          });
          const preJson = (await preRes.json()) as { ok?: boolean; prefill?: AdoptionInitiativeCreatePrefill; error?: string };
          if (!cancelled && preJson.ok && preJson.prefill) {
            setPrefillMeta(preJson.prefill);
            setProviderOrgs(preJson.prefill.organizations);
            setForm((f) => applyAdoptionInitiativePrefill(f, preJson.prefill!));
          }
        } else if (!cancelled && prefillQuery.accountId && UUID_RE.test(prefillQuery.accountId)) {
          setForm((f) => ({ ...f, account_id: prefillQuery.accountId! }));
        }
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "Could not load form"));
      } finally {
        if (!cancelled) setBootBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefillQuery.surgeonContactId, prefillQuery.engagementId, prefillQuery.caseId, prefillQuery.accountId]);

  React.useEffect(() => {
    const providerId = form.surgeon_contact_id.trim();
    if (!UUID_RE.test(providerId) || lockProvider) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/portal/sales/opportunities/create-prefill?surgeon_contact_id=${encodeURIComponent(providerId)}`,
        { cache: "no-store" },
      );
      const j = (await res.json()) as { ok?: boolean; prefill?: AdoptionInitiativeCreatePrefill };
      if (cancelled || !j.ok || !j.prefill) return;
      setProviderOrgs(j.prefill.organizations);
      setForm((f) =>
        applyAdoptionInitiativePrefill(
          {
            ...f,
            surgeon_contact_id: providerId,
          },
          j.prefill!,
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [form.surgeon_contact_id, lockProvider]);

  React.useEffect(() => {
    const accountId = form.account_id.trim();
    if (!UUID_RE.test(accountId)) {
      setEngagements([]);
      setCases([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [engRes, caseRes] = await Promise.all([
        fetch(`/api/portal/sales/engagements?organization_id=${encodeURIComponent(accountId)}`, { cache: "no-store" }).catch(
          () => null,
        ),
        fetch(`/api/portal/sales/surgical-cases?case_scope=active&account_id=${encodeURIComponent(accountId)}`, {
          cache: "no-store",
        }),
      ]);
      if (cancelled) return;
      if (engRes) {
        const ej = (await engRes.json()) as {
          ok?: boolean;
          engagements?: { id: string; title?: string; engagement_type?: string }[];
        };
        if (ej.ok && Array.isArray(ej.engagements)) {
          setEngagements(
            ej.engagements.map((e) => ({
              id: String(e.id),
              label: String(e.title || e.engagement_type || e.id).replace(/_/g, " "),
            })),
          );
        }
      }
      const cj = (await caseRes.json()) as { ok?: boolean; cases?: { id: string; case_number?: string }[] };
      if (cj.ok && Array.isArray(cj.cases)) {
        setCases(
          cj.cases.map((c) => ({
            id: String(c.id),
            label: String(c.case_number || c.id),
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.account_id]);

  const orgOptions = React.useMemo(() => {
    const map = new Map<string, AdoptionInitiativeOrgOption>();
    for (const o of providerOrgs) map.set(o.id, o);
    for (const o of crmOrgs) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [providerOrgs, crmOrgs]);

  const orgSelectValue =
    form.account_id && orgOptions.some((o) => o.id === form.account_id) ? form.account_id : CRM_ORG_OTHER;

  const filteredProviders = React.useMemo(() => {
    const q = providerSearch.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.label.toLowerCase().includes(q));
  }, [providers, providerSearch]);

  async function submit(addAnother: boolean) {
    const validationErr = validateAdoptionInitiativeCreateForm(form);
    if (validationErr) {
      setErr(validationErr);
      return;
    }
    const familyName = (surgicalFamilies.find((x) => x.id === form.primary_family_id)?.name || "").trim();
    const product_labels = [...new Set([familyName, ...form.product_labels].map((s) => s.trim()).filter(Boolean))];
    if (product_labels.length === 0) {
      setErr("Could not resolve the selected product line.");
      return;
    }

    let value_cents = 0;
    const rawVal = form.value_dollars.trim();
    if (rawVal) {
      const c = dollarsToCents(rawVal);
      if (c === null) {
        setErr("Enter a valid estimated annual value.");
        return;
      }
      value_cents = c;
    }

    const provider = providers.find((p) => p.id === form.surgeon_contact_id);
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/portal/sales/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: form.account_id || null,
          account_name: form.account_name.trim(),
          physician_name: provider?.label || null,
          surgeon_contact_id: form.surgeon_contact_id,
          product_labels,
          value_cents,
          practice_setting: form.practice_setting,
          stage: form.stage,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          notes: form.notes.trim() || null,
          closed_lost_reason: form.stage === "lost" ? form.closed_lost_reason.trim() || null : null,
          procedure_focus: form.procedure_focus.trim(),
          adoption_goal: form.adoption_goal.trim(),
          evaluation_needed: form.evaluation_needed,
          preference_card_target: form.preference_card_target.trim() || null,
          competitive_product: form.competitive_product.trim() || null,
          next_action: form.next_action.trim() || null,
          linked_engagement_id: form.linked_engagement_id.trim() || null,
          linked_case_id: form.linked_case_id.trim() || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        setErr(j.error || "Save failed");
        return;
      }
      await onSaved();
      if (addAnother) {
        setForm(emptyAdoptionInitiativeCreateForm());
        setPrefillMeta(null);
        setProviderOrgs([]);
      } else {
        onClose();
      }
    } catch (e) {
      setErr(userFacingError(e, "That evaluation did not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const launchHint =
    prefillMeta?.launch === "engagement"
      ? "Launched from an engagement — provider, organization, and linked engagement are prefilled."
      : prefillMeta?.launch === "case"
        ? "Launched from a case — provider, organization, and linked case are prefilled."
        : prefillMeta?.launch === "provider"
          ? "Launched from a provider — provider and primary organization are prefilled."
          : null;

  return (
    <div
      role="dialog"
      aria-modal
      style={sc.modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={sc.modalPanelLg}>
        {err ? (
          <div role="alert" style={{ ...sc.alertError, marginBottom: 16 }}>
            {err}
          </div>
        ) : null}
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6, letterSpacing: "-0.02em" }}>
          {OPPORTUNITY_UI.createModalTitle}
        </div>
        <div
          style={{
            margin: "0 0 14px",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
            background: "color-mix(in srgb, var(--brand-600) 5%, var(--surface))",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Evaluation</div>
          <div style={{ color: "var(--muted)", fontWeight: 600 }}>
            Required: provider, organization, product line, procedure focus, goal, and stage. Optional fields capture
            evaluation, preference card, links, and next steps.
          </div>
          {launchHint ? <div style={{ marginTop: 8, fontWeight: 700, color: "var(--foreground)" }}>{launchHint}</div> : null}
        </div>

        {bootBusy ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading form…</p>
        ) : (
          <>
            <FormSection title="Provider & organization" isFirst>
              <Field label="Provider" required>
                {lockProvider && prefillMeta?.provider_name ? (
                  <input value={prefillMeta.provider_name} readOnly style={{ ...inputStyle, opacity: 0.85 }} />
                ) : (
                  <>
                    <input
                      value={providerSearch}
                      onChange={(e) => setProviderSearch(e.target.value)}
                      placeholder="Search providers…"
                      style={{ ...inputStyle, marginBottom: 6 }}
                    />
                    <select
                      value={form.surgeon_contact_id}
                      onChange={(e) => setForm((f) => ({ ...f, surgeon_contact_id: e.target.value }))}
                      style={inputStyle}
                      required
                    >
                      <option value="">Select provider…</option>
                      {filteredProviders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </Field>
              <Field label="Organization" required>
                <select
                  value={orgSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === CRM_ORG_OTHER) {
                      setForm((f) => ({ ...f, account_id: "" }));
                      return;
                    }
                    const org = orgOptions.find((o) => o.id === v);
                    setForm((f) => ({
                      ...f,
                      account_id: v,
                      account_name: org?.name || f.account_name,
                      city: org?.city || "",
                      state: org?.state || "",
                    }));
                  }}
                  style={inputStyle}
                >
                  <option value={CRM_ORG_OTHER}>Type organization name below</option>
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                      {o.is_primary ? " (primary)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {orgSelectValue === CRM_ORG_OTHER ? (
                <Field label="Organization name" required>
                  <input
                    value={form.account_name}
                    onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                    style={inputStyle}
                    placeholder="Hospital or practice name"
                  />
                </Field>
              ) : null}
            </FormSection>

            <FormSection title="Adoption focus" description="What you are pursuing and where it sits in the pipeline.">
              <Field label="Product line" required hint="First selection is the primary line.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {surgicalFamilies.map((fam) => {
                    const famName = fam.name.trim();
                    const isPrimary = form.primary_family_id === fam.id;
                    const selected = isPrimary || form.product_labels.includes(famName);
                    return (
                      <button
                        key={fam.id}
                        type="button"
                        onClick={() =>
                          setForm((prev) => {
                            if (!isPrimary && !prev.product_labels.includes(famName)) {
                              if (!prev.primary_family_id) return { ...prev, primary_family_id: fam.id };
                              return { ...prev, product_labels: uniqueOrderedIds([...prev.product_labels, famName]) };
                            }
                            if (isPrimary) return { ...prev, primary_family_id: "", product_labels: [] };
                            return { ...prev, product_labels: prev.product_labels.filter((n) => n !== famName) };
                          })
                        }
                        style={{
                          borderRadius: 999,
                          border: selected
                            ? "1px solid color-mix(in srgb, var(--brand-600) 42%, var(--border))"
                            : "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
                          background: selected
                            ? "color-mix(in srgb, var(--brand-600) 10%, var(--surface))"
                            : "var(--surface)",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {isPrimary ? "★ " : selected ? "✓ " : ""}
                        {fam.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Procedure focus" required>
                <textarea
                  value={form.procedure_focus}
                  onChange={(e) => setForm((f) => ({ ...f, procedure_focus: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                  placeholder="e.g. Laparoscopic ventral hernia, robotic colorectal"
                />
              </Field>
              <Field label="Goal / desired outcome" required>
                <textarea
                  value={form.adoption_goal}
                  onChange={(e) => setForm((f) => ({ ...f, adoption_goal: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                  placeholder="What success looks like for this evaluation"
                />
              </Field>
              <Field label="Stage" required>
                <select
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as SalesStage }))}
                  style={inputStyle}
                >
                  {SALES_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {SALES_STAGE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              {form.stage === "lost" ? (
                <Field label="Loss reason" required>
                  <select
                    value={form.closed_lost_reason}
                    onChange={(e) => setForm((f) => ({ ...f, closed_lost_reason: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Select…</option>
                    {LOST_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </FormSection>

            <FormSection title="Optional details">
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={form.evaluation_needed}
                  onChange={(e) => setForm((f) => ({ ...f, evaluation_needed: e.target.checked }))}
                />
                Evaluation needed
              </label>
              <Field label="Preference card target">
                <input
                  value={form.preference_card_target}
                  onChange={(e) => setForm((f) => ({ ...f, preference_card_target: e.target.value }))}
                  style={inputStyle}
                  placeholder="Department, service line, or card notes"
                />
              </Field>
              <Field label="Linked engagement">
                {lockEngagement && prefillMeta?.linked_engagement_label ? (
                  <input value={prefillMeta.linked_engagement_label} readOnly style={{ ...inputStyle, opacity: 0.85 }} />
                ) : (
                  <select
                    value={form.linked_engagement_id}
                    onChange={(e) => setForm((f) => ({ ...f, linked_engagement_id: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">None</option>
                    {engagements.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Linked case">
                {lockCase && prefillMeta?.linked_case_label ? (
                  <input value={prefillMeta.linked_case_label} readOnly style={{ ...inputStyle, opacity: 0.85 }} />
                ) : (
                  <select
                    value={form.linked_case_id}
                    onChange={(e) => setForm((f) => ({ ...f, linked_case_id: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">None</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Competitive product">
                <input
                  value={form.competitive_product}
                  onChange={(e) => setForm((f) => ({ ...f, competitive_product: e.target.value }))}
                  style={inputStyle}
                  placeholder="Incumbent or competitor in play"
                />
              </Field>
              <Field label="Estimated annual value">
                <input
                  value={form.value_dollars}
                  onChange={(e) => setForm((f) => ({ ...f, value_dollars: e.target.value }))}
                  style={inputStyle}
                  placeholder="USD"
                />
              </Field>
              <Field label="Next action">
                <input
                  value={form.next_action}
                  onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
                  style={inputStyle}
                  placeholder="Immediate follow-up for the rep"
                />
              </Field>
              <Field label="Additional notes" hint="Sales context only — no PHI.">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
                />
              </Field>
            </FormSection>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} style={sc.btnGhost} disabled={saving}>
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void submit(true)} style={sc.btnGhost}>
                Save &amp; add another
              </button>
              <button type="button" disabled={saving} onClick={() => void submit(false)} style={sc.btnPrimary}>
                {saving ? "Saving…" : OPPORTUNITY_UI.createButton}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 730, color: "var(--muted)", letterSpacing: "0.015em" }}>
        {label}
        {required ? <span style={{ color: "var(--danger)", marginLeft: 4 }} aria-hidden>*</span> : null}
      </span>
      {children}
      {hint ? <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, lineHeight: 1.4 }}>{hint}</span> : null}
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
  isFirst,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  isFirst?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        ...(isFirst
          ? {}
          : {
              paddingTop: 14,
              marginTop: 2,
              borderTop: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
            }),
      }}
    >
      <div style={sc.formSectionTitle}>{title}</div>
      {description ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45, fontWeight: 600 }}>{description}</p>
      ) : null}
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  ...sc.input,
  minHeight: 38,
  paddingTop: 7,
  paddingBottom: 7,
};

