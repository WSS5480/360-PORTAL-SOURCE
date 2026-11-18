"use client";

import Link from "next/link";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import NewOrganizationModal from "@/components/sales/NewOrganizationModal";
import { sc } from "@/components/sales/salesCommandUi";
import { formatProviderCrmStatus, PROVIDER_CRM_STATUSES } from "@/lib/surgical-sales/labels";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import {
  defaultCrmStatusForRelationshipStage,
  onboardingAnswerFromPathwayStage,
  pathwayStageFromOnboardingAnswer,
  PROVIDER_CREATE_CUSTOMER_STAGE,
  PROVIDER_CREATE_PATHWAY_STAGES,
  relationshipStageFromOnboardingAnswer,
  salesTrackFromOnboardingAnswer,
  type ProviderCreatePathwayStageId,
  type ProviderCreateSalesTrackId,
  type ProviderOnboardingRelationshipAnswer,
} from "@/lib/surgical-sales/providerRelationshipStage";
import { createProviderWizardCss } from "./createProviderWizardCss";
import {
  addProviderDraftHasContent,
  clearAddProviderDraft,
  readAddProviderDraft,
  writeAddProviderDraft,
  type AddProviderDraft,
} from "@/lib/surgical-sales/addProviderDraftStorage";
import { userFacingError } from "@/lib/errors/userFacingError";

type OrgOption = { id: string; name: string; territory?: string | null };

function orgOptionFromCreated(org: Record<string, unknown>): OrgOption {
  return {
    id: String(org.id ?? ""),
    name: String(org.name || "Organization").trim() || "Organization",
    territory: (org.surgical_crm_billing_state as string) || null,
  };
}

function mergeOrgOptions(prev: OrgOption[], next: OrgOption): OrgOption[] {
  if (!next.id) return prev;
  const map = new Map(prev.map((o) => [o.id, o]));
  map.set(next.id, next);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export default function CreateProviderWizardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = (searchParams.get("return_to") || "").trim();
  const prefillAccountId = (searchParams.get("account_id") || "").trim();
  const [organizations, setOrganizations] = React.useState<OrgOption[]>([]);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [roleType, setRoleType] = React.useState("surgeon");
  const [salesTrack, setSalesTrack] = React.useState<ProviderCreateSalesTrackId>("sales_pathway");
  const [pathwayStage, setPathwayStage] = React.useState<ProviderCreatePathwayStageId>("discovery");
  const [onboardingRelationship, setOnboardingRelationship] =
    React.useState<ProviderOnboardingRelationshipAnswer>("early_discovery");
  const [providerCrmStatus, setProviderCrmStatus] = React.useState<string>("prospect");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [mobilePhone, setMobilePhone] = React.useState("");
  const [specialty, setSpecialty] = React.useState("");
  const [primaryOrgId, setPrimaryOrgId] = React.useState("");
  const [extraOrgIds, setExtraOrgIds] = React.useState<string[]>([]);
  const [extraOrgPick, setExtraOrgPick] = React.useState("");
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false);
  const [orgCreateTarget, setOrgCreateTarget] = React.useState<"primary" | "extra">("primary");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const draftHydratedRef = React.useRef(false);
  const primaryOrgSelectRef = React.useRef<HTMLSelectElement | null>(null);

  const buildDraftSnapshot = React.useCallback((): AddProviderDraft => {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      step: "basics",
      firstName,
      lastName,
      title,
      roleType,
      onboardingRelationship,
      providerCrmStatus,
      email,
      phone,
      mobilePhone,
      specialty,
      primaryOrgId,
      extraOrgIds,
    };
  }, [
    firstName,
    lastName,
    title,
    roleType,
    onboardingRelationship,
    providerCrmStatus,
    email,
    phone,
    mobilePhone,
    specialty,
    primaryOrgId,
    extraOrgIds,
  ]);

  const persistDraft = React.useCallback(() => {
    if (!draftHydratedRef.current) return;
    writeAddProviderDraft(buildDraftSnapshot());
  }, [buildDraftSnapshot]);

  React.useEffect(() => {
    const draft = readAddProviderDraft();
    if (draft) {
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setTitle(draft.title);
      setRoleType(draft.roleType);
      setOnboardingRelationship(draft.onboardingRelationship);
      setSalesTrack(salesTrackFromOnboardingAnswer(draft.onboardingRelationship));
      setPathwayStage(pathwayStageFromOnboardingAnswer(draft.onboardingRelationship));
      setProviderCrmStatus(draft.providerCrmStatus);
      setEmail(draft.email);
      setPhone(draft.phone);
      setMobilePhone(draft.mobilePhone);
      setSpecialty(draft.specialty);
      setPrimaryOrgId(draft.primaryOrgId);
      setExtraOrgIds(draft.extraOrgIds);
    }
    draftHydratedRef.current = true;
  }, []);

  React.useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const draft = buildDraftSnapshot();
      if (!addProviderDraftHasContent(draft)) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [buildDraftSnapshot]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/surgical-accounts?directory_scope=active", { cache: "no-store" });
        const j = (await res.json()) as {
          ok?: boolean;
          organizations?: { id: string; name?: string | null; surgical_crm_billing_state?: string | null }[];
        };
        if (!cancelled && j.ok && Array.isArray(j.organizations)) {
          setOrganizations(
            j.organizations.map((a) => ({
              id: a.id,
              name: String(a.name || "Organization").trim() || "Organization",
              territory: a.surgical_crm_billing_state || null,
            })),
          );
        }
      } catch {
        if (!cancelled) setOrganizations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!prefillAccountId || primaryOrgId) return;
    if (organizations.some((o) => o.id === prefillAccountId)) {
      setPrimaryOrgId(prefillAccountId);
    }
  }, [prefillAccountId, organizations, primaryOrgId]);

  const relationshipStage = relationshipStageFromOnboardingAnswer(onboardingRelationship);

  React.useEffect(() => {
    setProviderCrmStatus(defaultCrmStatusForRelationshipStage(relationshipStage));
  }, [relationshipStage]);

  function handleSalesTrackChange(track: ProviderCreateSalesTrackId) {
    setSalesTrack(track);
    if (track === "customer") {
      setPathwayStage("customer");
      setOnboardingRelationship("established_customer");
      return;
    }
    const nextStage = pathwayStage === "customer" ? "discovery" : pathwayStage;
    const nextPathwayStage = PROVIDER_CREATE_PATHWAY_STAGES.some((s) => s.id === nextStage)
      ? nextStage
      : "discovery";
    setPathwayStage(nextPathwayStage);
    setOnboardingRelationship(onboardingAnswerFromPathwayStage(nextPathwayStage));
  }

  function handlePathwayStageChange(stageId: ProviderCreatePathwayStageId) {
    setSalesTrack("sales_pathway");
    setPathwayStage(stageId);
    setOnboardingRelationship(onboardingAnswerFromPathwayStage(stageId));
  }

  function addExtraOrg(id?: string) {
    const picked = (id ?? extraOrgPick).trim();
    if (!picked || picked === primaryOrgId || extraOrgIds.includes(picked)) return;
    setExtraOrgIds((prev) => [...prev, picked]);
    setExtraOrgPick("");
  }

  function openCreateOrganization(target: "primary" | "extra") {
    persistDraft();
    setOrgCreateTarget(target);
    setCreateOrgOpen(true);
    if (target === "primary" && primaryOrgSelectRef.current) {
      primaryOrgSelectRef.current.value = primaryOrgId;
    }
  }

  function closeCreateOrganization() {
    setCreateOrgOpen(false);
    if (primaryOrgSelectRef.current) {
      primaryOrgSelectRef.current.value = primaryOrgId;
    }
  }

  function handleOrganizationCreated(org: Record<string, unknown>) {
    const option = orgOptionFromCreated(org);
    if (!option.id) return;
    setOrganizations((prev) => mergeOrgOptions(prev, option));
    if (orgCreateTarget === "primary") {
      setPrimaryOrgId(option.id);
    } else {
      addExtraOrg(option.id);
    }
    setCreateOrgOpen(false);
    setMsg(null);
    persistDraft();
  }

  function handleCancelNavigate(e: React.MouseEvent<HTMLAnchorElement>) {
    const draft = buildDraftSnapshot();
    if (
      addProviderDraftHasContent(draft) &&
      !window.confirm("Leave Add provider? Your entries are saved in this session and will restore if you return.")
    ) {
      e.preventDefault();
      return;
    }
    clearAddProviderDraft();
  }

  function buildPayload(save_mode: "draft" | "complete") {
    return {
      save_mode,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      title: title.trim() || null,
      role_type: roleType,
      email: email.trim() || null,
      phone: phone.trim() || null,
      mobile_phone: mobilePhone.trim() || null,
      specialty: specialty.trim() || null,
      primary_organization_id: primaryOrgId || null,
      additional_organization_ids: extraOrgIds,
      provider_crm_status: providerCrmStatus,
      onboarding_relationship: onboardingRelationship,
      provider_relationship_stage: relationshipStage,
      influence_level: "unknown",
      relationship_strength: "unknown",
      preferred_contact_method: "unknown",
      fields: {},
    };
  }

  async function submit(save_mode: "draft" | "complete", openProfile: boolean) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/portal/sales/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(save_mode)),
      });
      const j = await readResponseJson<{ ok?: boolean; error?: string; provider_id?: string }>(res);
      if (!res.ok || !j.ok || !j.provider_id) {
        const errMsg =
          typeof j.error === "string"
            ? j.error
            : typeof j.error === "object" && j.error !== null
              ? "Could not save provider."
              : "Could not save provider.";
        throw new Error(errMsg);
      }
      clearAddProviderDraft();
      if (returnTo) {
        const sep = returnTo.includes("?") ? "&" : "?";
        router.push(`${returnTo}${sep}surgeon_contact_id=${encodeURIComponent(j.provider_id)}`);
        return;
      }
      if (!openProfile) {
        router.push("/portal/sales/providers");
        return;
      }
      const qs = new URLSearchParams({ tab: "overview" });
      const q = qs.toString();
      router.push(
        `/portal/sales/providers/${encodeURIComponent(j.provider_id)}${q ? `?${q}` : ""}`,
      );
    } catch (e: unknown) {
      setMsg(userFacingError(e, "Could not save provider."));
    } finally {
      setSaving(false);
    }
  }

  const basicsReady = Boolean((firstName.trim() || lastName.trim()) && primaryOrgId);
  const isCustomerTrack = salesTrack === "customer";
  const selectedPathwayIndex = PROVIDER_CREATE_PATHWAY_STAGES.findIndex((s) => s.id === pathwayStage);
  const selectedPathway = isCustomerTrack
    ? PROVIDER_CREATE_CUSTOMER_STAGE
    : PROVIDER_CREATE_PATHWAY_STAGES[selectedPathwayIndex];

  function basicsValidationError(): string | null {
    if (!firstName.trim() && !lastName.trim()) return "Enter a first or last name.";
    if (!primaryOrgId) return "Select a primary organization.";
    return null;
  }

  function saveProvider(openProfile: boolean) {
    const err = basicsValidationError();
    if (err) {
      setMsg(err);
      return;
    }
    void submit("complete", openProfile);
  }

  return (
    <div className="create-provider-root">
      <style dangerouslySetInnerHTML={{ __html: createProviderWizardCss }} />
      <header className="create-provider-header">
        <div className="create-provider-header-nav">
          <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
          <Link href="/portal/sales/providers" className="create-provider-back">
            ← Providers
          </Link>
        </div>
        <h1 className="create-provider-title">Add provider</h1>
        <p className="create-provider-sub">
          Start with name and organization. Add contact details now or fill them in on the profile later.
        </p>
      </header>

      <main className="create-provider-body">
        {msg ? <p style={sc.alertError}>{msg}</p> : null}

        <div className="create-provider-layout">
          <section className="create-provider-column create-provider-column--basics" aria-labelledby="cp-basics-heading">
            <h2 id="cp-basics-heading" className="create-provider-column-heading">
              Provider basics
            </h2>
            <div className="create-provider-step-fields create-provider-step-fields--profile">
              <div className="create-provider-field">
                <label htmlFor="cp-first">First name</label>
                <input
                  id="cp-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="create-provider-field">
                <label htmlFor="cp-last">Last name</label>
                <input id="cp-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="create-provider-field create-provider-field--full">
                <label htmlFor="cp-specialty">Specialty</label>
                <input
                  id="cp-specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Orthopedic spine, podiatry"
                />
              </div>
              <div className="create-provider-field create-provider-field--full">
                <label htmlFor="cp-primary-org">Primary organization</label>
                <div className="create-provider-org-picker">
                  <select
                    ref={primaryOrgSelectRef}
                    id="cp-primary-org"
                    value={primaryOrgId}
                    onChange={(e) => setPrimaryOrgId(e.target.value)}
                  >
                    <option value="">Select organization…</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="create-provider-org-new-link"
                    onClick={() => openCreateOrganization("primary")}
                  >
                    + New org
                  </button>
                </div>
              </div>
              <div className="create-provider-field create-provider-field--full">
                <label htmlFor="cp-role">Role</label>
                <select id="cp-role" value={roleType} onChange={(e) => setRoleType(e.target.value)}>
                  <option value="surgeon">Surgeon</option>
                  <option value="physician_assistant">Physician assistant</option>
                </select>
              </div>
            </div>

            <div className="create-provider-contact-section" aria-labelledby="cp-contact-heading">
              <h3 id="cp-contact-heading" className="create-provider-contact-heading">
                Contact details <span className="create-provider-optional">(optional)</span>
              </h3>
              <div className="create-provider-step-fields create-provider-step-fields--profile">
                <div className="create-provider-field create-provider-field--full">
                  <label htmlFor="cp-title">Title</label>
                  <input
                    id="cp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. MD, DO, PA-C"
                    autoComplete="organization-title"
                  />
                </div>
                <div className="create-provider-field create-provider-field--full">
                  <label htmlFor="cp-email">Email</label>
                  <input
                    id="cp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hospital.org"
                    autoComplete="email"
                  />
                </div>
                <div className="create-provider-field">
                  <label htmlFor="cp-phone">Office phone</label>
                  <input
                    id="cp-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-0100"
                    autoComplete="tel"
                  />
                </div>
                <div className="create-provider-field">
                  <label htmlFor="cp-mobile">Mobile phone</label>
                  <input
                    id="cp-mobile"
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    placeholder="(555) 555-0101"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>
            <select
              id="cp-crm-status"
              className="create-provider-visually-hidden"
              value={providerCrmStatus}
              onChange={(e) => setProviderCrmStatus(e.target.value)}
              tabIndex={-1}
              aria-hidden
            >
              {PROVIDER_CRM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatProviderCrmStatus(s)}
                </option>
              ))}
            </select>
          </section>

          <section
            className="create-provider-column create-provider-column--relationship"
            aria-labelledby="cp-relationship-heading"
          >
            <h2 id="cp-relationship-heading" className="create-provider-column-heading">
              Relationship setup
            </h2>

            <fieldset className="create-provider-track-fieldset">
              <legend className="create-provider-pathway-legend">How is this provider classified?</legend>
              <div className="create-provider-track" role="group" aria-label="Provider classification">
                <button
                  type="button"
                  className={`create-provider-track__choice${salesTrack === "sales_pathway" ? " create-provider-track__choice--selected" : ""}`}
                  onClick={() => handleSalesTrackChange("sales_pathway")}
                  aria-pressed={salesTrack === "sales_pathway"}
                >
                  <span className="create-provider-track__label">Sales pathway</span>
                  <span className="create-provider-track__hint">Still moving through Discovery → Outcomes</span>
                </button>
                <button
                  type="button"
                  className={`create-provider-track__choice${isCustomerTrack ? " create-provider-track__choice--selected" : ""}`}
                  onClick={() => handleSalesTrackChange("customer")}
                  aria-pressed={isCustomerTrack}
                >
                  <span className="create-provider-track__label">Customer</span>
                  <span className="create-provider-track__hint">Already moved through the sales pathway</span>
                </button>
              </div>
            </fieldset>

            {isCustomerTrack ? (
              <p className="create-provider-pathway-hint" data-testid="create-provider-customer-hint">
                Customer profiles skip the sales pathway tracker and do not receive next-step suggestions.
              </p>
            ) : (
              <fieldset className="create-provider-pathway-fieldset">
                <legend className="create-provider-pathway-legend">Stage pathway</legend>
                <nav className="create-provider-pathway" aria-label="Relationship stage pathway">
                  <ol className="create-provider-pathway__list">
                    {PROVIDER_CREATE_PATHWAY_STAGES.map((stage, index) => {
                      const isSelected = pathwayStage === stage.id;
                      const isPast = index < selectedPathwayIndex;
                      const isLast = index === PROVIDER_CREATE_PATHWAY_STAGES.length - 1;
                      return (
                        <li key={stage.id} className="create-provider-pathway__segment">
                          <button
                            type="button"
                            className={`create-provider-pathway__step${isSelected ? " create-provider-pathway__step--selected" : ""}${isPast ? " create-provider-pathway__step--past" : ""}`}
                            onClick={() => handlePathwayStageChange(stage.id)}
                            aria-pressed={isSelected}
                            aria-current={isSelected ? "step" : undefined}
                          >
                            <span className="create-provider-pathway__marker" aria-hidden />
                            <span className="create-provider-pathway__label">{stage.label}</span>
                          </button>
                          {!isLast ? (
                            <span
                              className={`create-provider-pathway__connector${isPast || isSelected ? " create-provider-pathway__connector--active" : ""}`}
                              aria-hidden
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </nav>
                {selectedPathway ? (
                  <p className="create-provider-pathway-hint">{selectedPathway.shortHint}</p>
                ) : null}
              </fieldset>
            )}

          </section>
        </div>
      </main>

      <footer className="create-provider-footer">
        <Link href="/portal/sales/providers" onClick={handleCancelNavigate}>
          Cancel
        </Link>
        <button
          type="button"
          disabled={saving || !basicsReady}
          onClick={() => saveProvider(false)}
          title={basicsReady ? undefined : "Enter name and primary organization to save"}
        >
          {saving ? "Saving…" : "Save provider"}
        </button>
        <button
          type="button"
          className="primary"
          disabled={saving || !basicsReady}
          onClick={() => saveProvider(true)}
          title={basicsReady ? undefined : "Enter name and primary organization to save"}
        >
          {saving ? "Saving…" : "Save & open profile"}
        </button>
      </footer>

      <NewOrganizationModal
        open={createOrgOpen}
        variant="compact"
        onClose={closeCreateOrganization}
        onCreated={handleOrganizationCreated}
      />
    </div>
  );
}
