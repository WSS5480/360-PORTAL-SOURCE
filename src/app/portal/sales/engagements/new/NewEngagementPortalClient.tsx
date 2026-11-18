"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import React from "react";
import { EngagementTypeMissionPicker } from "./EngagementTypeMissionPicker";
import {
  buildEngagementCreatePayload,
  emptyEngagementBasicsDraft,
  engagementCreateScreenCopy,
  ENGAGEMENT_MISSION_CHOICE_HELPER,
  ENGAGEMENT_WIZARD_STEPS,
  orgOptionsFromProviderLinks,
  resolveEngagementCreateBackHref,
  resolveHrefAfterMissionEngagementCreate,
  resolveOrganizationIdForProvider,
  normalizeEngagementCreateReturnTo,
  type EngagementCreatePostAction,
  type EngagementWizardStepId,
  type ProviderOrgLinkInput,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  formatEngagementType,
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { createEngagementWizardCss } from "./createEngagementWizardCss";
import { engagementWizardMobileCss } from "./engagementWizardMobileCss";
import { buildRecommendedEngagementMission } from "@/lib/surgical-sales/engagements/buildRecommendedEngagementMission";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { userFacingError } from "@/lib/errors/userFacingError";

type ProviderOption = {
  id: string;
  label: string;
  specialty?: string | null;
  organizationLinks: ProviderOrgLinkInput[];
};
type OrgOption = { id: string; name: string };

function primaryLinkSpecialty(
  links?: Array<{ specialty?: string | null; is_primary_org?: boolean | null }>,
): string | null {
  if (!links?.length) return null;
  const primary = links.find((l) => l.is_primary_org) ?? links[0];
  const s = String(primary?.specialty ?? "").trim();
  return s || null;
}

export default function NewEngagementPortalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mission-specific launches (Plan Debrief, Intro Call, …) arrive with a valid
  // engagement_type — skip the type picker and open the details step directly.
  // Generic "New Engagement" (no type param) keeps the full wizard.
  const launchType = normalizeEngagementType(searchParams.get("engagement_type"));
  const launchedWithMissionType = Boolean(launchType);
  const [step, setStep] = React.useState<EngagementWizardStepId>(
    launchedWithMissionType ? "details" : "type",
  );
  const [schedulingOpen, setSchedulingOpen] = React.useState(false);
  const [basics, setBasics] = React.useState(() => {
    const d = emptyEngagementBasicsDraft();
    const urlType = normalizeEngagementType(searchParams.get("engagement_type"));
    d.provider_id =
      searchParams.get("provider_id") || searchParams.get("providerId") || "";
    d.organization_id = searchParams.get("organization_id") || "";
    d.opportunity_id = searchParams.get("opportunity_id") || "";
    d.engagement_type = urlType || "";
    d.source_observation_id = searchParams.get("source_observation_id") || "";
    return d;
  });

  const [providers, setProviders] = React.useState<ProviderOption[]>([]);
  const [organizations, setOrganizations] = React.useState<OrgOption[]>([]);
  const [providerOrganizations, setProviderOrganizations] = React.useState<OrgOption[]>([]);
  const [providerOrgsLoading, setProviderOrgsLoading] = React.useState(false);

  const [msg, setMsg] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [recommendedMission, setRecommendedMission] = React.useState(() =>
    buildRecommendedEngagementMission({}),
  );

  const urlOrganizationIdRef = React.useRef(searchParams.get("organization_id") || "");

  const providerLabel = providers.find((p) => p.id === basics.provider_id)?.label ?? "";
  const typeSelected = Boolean(basics.engagement_type.trim());

  // One launch-screen template for every mission: copy follows the selected
  // type (generic picker flow) or the deep-linked launch type.
  const screenCopy = React.useMemo(
    () => engagementCreateScreenCopy(basics.engagement_type || launchType),
    [basics.engagement_type, launchType],
  );

  React.useEffect(() => {
    void (async () => {
      const [provRes, orgRes] = await Promise.all([
        fetch("/api/portal/sales/surgical-contacts?role_type=surgeon", { cache: "no-store" }),
        fetch("/api/portal/sales/surgical-accounts?directory_scope=active", { cache: "no-store" }),
      ]);
      const provJ = (await provRes.json()) as {
        ok?: boolean;
        contacts?: Array<{
          id: string;
          first_name?: string;
          last_name?: string;
          organization_links?: ProviderOrgLinkInput[];
        }>;
      };
      const orgJ = (await orgRes.json()) as { ok?: boolean; organizations?: { id: string; name?: string }[] };
      if (provJ.ok && provJ.contacts) {
        setProviders(
          provJ.contacts.map((c) => ({
            id: c.id,
            label: [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || c.id,
            specialty: primaryLinkSpecialty(c.organization_links),
            organizationLinks: c.organization_links ?? [],
          })),
        );
      }
      if (orgJ.ok && orgJ.organizations) {
        setOrganizations(orgJ.organizations.map((a) => ({ id: a.id, name: String(a.name || "Organization") })));
      }
    })();
  }, []);

  const organizationOptions = React.useMemo(() => {
    if (!basics.provider_id) return organizations;
    if (providerOrganizations.length > 0) return providerOrganizations;
    return organizations;
  }, [basics.provider_id, providerOrganizations, organizations]);

  const orgLabel = organizationOptions.find((o) => o.id === basics.organization_id)?.name ?? "";

  const applyProviderOrganizationContext = React.useCallback(
    (providerId: string, links: ProviderOrgLinkInput[]) => {
      const linkOrgs = orgOptionsFromProviderLinks(links);
      setProviderOrganizations(linkOrgs);
      setBasics((prev) => {
        if (prev.provider_id !== providerId) return prev;
        const nextOrgId = resolveOrganizationIdForProvider(links, {
          currentOrganizationId: prev.organization_id,
          preferUrlOrganizationId: urlOrganizationIdRef.current,
        });
        const orgChanged = Boolean(nextOrgId) && nextOrgId !== prev.organization_id;
        return {
          ...prev,
          organization_id: nextOrgId || prev.organization_id,
          opportunity_id: orgChanged ? "" : prev.opportunity_id,
        };
      });
    },
    [],
  );

  const loadProviderOrganizations = React.useCallback(
    async (providerId: string, seedLinks: ProviderOrgLinkInput[]) => {
      if (seedLinks.length > 0) {
        applyProviderOrganizationContext(providerId, seedLinks);
        return;
      }
      setProviderOrgsLoading(true);
      try {
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
          cache: "no-store",
        });
        const j = await readResponseJson<{
          ok?: boolean;
          organization_links?: ProviderOrgLinkInput[];
          primary_organization?: { id?: string; name?: string | null };
        }>(res);
        const links =
          j.ok && j.organization_links?.length
            ? j.organization_links
            : j.ok && j.primary_organization?.id
              ? [
                  {
                    account_id: String(j.primary_organization.id),
                    is_primary_org: true,
                    is_active: true,
                    accounts: {
                      id: String(j.primary_organization.id),
                      name: j.primary_organization.name,
                    },
                  },
                ]
              : seedLinks;
        applyProviderOrganizationContext(providerId, links);
      } catch {
        applyProviderOrganizationContext(providerId, seedLinks);
      } finally {
        setProviderOrgsLoading(false);
      }
    },
    [applyProviderOrganizationContext],
  );

  React.useEffect(() => {
    const providerId = basics.provider_id.trim();
    if (!providerId) {
      setProviderOrganizations([]);
      return;
    }
    const p = providers.find((x) => x.id === providerId);
    if (!p) return;
    void loadProviderOrganizations(providerId, p.organizationLinks);
  }, [basics.provider_id, providers, loadProviderOrganizations]);

  React.useEffect(() => {
    const providerId = basics.provider_id.trim();
    if (!providerId) {
      setRecommendedMission(buildRecommendedEngagementMission({}));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/portal/sales/providers/${encodeURIComponent(providerId)}?defer=activity_timeline,clinical_discovery_answers`,
          { cache: "no-store" },
        );
        const j = await readResponseJson<{
          ok?: boolean;
          provider?: Record<string, unknown>;
          engagements?: ProviderEngagementSummary[];
          opportunities?: Array<Record<string, unknown>>;
          cases?: Array<Record<string, unknown>>;
        }>(res);
        if (cancelled || !j.ok) return;
        setRecommendedMission(
          buildRecommendedEngagementMission({
            relationshipStage: String(j.provider?.provider_relationship_stage ?? ""),
            engagements: j.engagements,
            opportunities: j.opportunities,
            cases: j.cases,
          }),
        );
      } catch {
        if (!cancelled) {
          setRecommendedMission(buildRecommendedEngagementMission({}));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [basics.provider_id]);

  const stepIndex = ENGAGEMENT_WIZARD_STEPS.findIndex((s) => s.id === step);
  const canGoBack = stepIndex > 0;

  // Scheduling stays collapsed for mission launches until the rep opts in
  // (or a date/time already exists, e.g. after navigating back and forth).
  const schedulingExpanded =
    !screenCopy.schedulingToggleLabel ||
    schedulingOpen ||
    Boolean(basics.engagement_date.trim() || basics.engagement_time.trim());

  function setBasicsField<K extends keyof typeof basics>(key: K, value: (typeof basics)[K]) {
    setBasics((prev) => ({ ...prev, [key]: value }));
  }

  function handleProviderChange(providerId: string) {
    setBasics((prev) => ({
      ...prev,
      provider_id: providerId,
      organization_id: "",
      opportunity_id: "",
    }));
    setProviderOrganizations([]);
    if (!providerId) return;
    const p = providers.find((x) => x.id === providerId);
    void loadProviderOrganizations(providerId, p?.organizationLinks ?? []);
  }

  function handleOrganizationChange(organizationId: string) {
    setBasics((prev) => ({
      ...prev,
      organization_id: organizationId,
      opportunity_id: organizationId !== prev.organization_id ? "" : prev.opportunity_id,
    }));
  }

  function selectEngagementType(type: EngagementType) {
    setBasics((prev) => ({ ...prev, engagement_type: type }));
    setMsg(null);
  }

  function validateTypeStep(): string | null {
    if (!basics.engagement_type.trim()) return "Select an engagement type to continue.";
    return null;
  }

  function validateDetails(): string | null {
    const typeErr = validateTypeStep();
    if (typeErr) return typeErr;
    if (!basics.provider_id.trim()) return "Select a provider.";
    if (!basics.organization_id.trim()) return "Select an organization.";
    return null;
  }

  function goNext() {
    if (step === "type") {
      const err = validateTypeStep();
      if (err) {
        setMsg(err);
        return;
      }
      setMsg(null);
      setStep("details");
      return;
    }
  }

  const backHref = React.useMemo(
    () =>
      resolveEngagementCreateBackHref({
        providerId: basics.provider_id || searchParams.get("provider_id"),
        returnTo: searchParams.get("return_to"),
      }),
    [basics.provider_id, searchParams],
  );

  function goBack() {
    setMsg(null);
    if (step === "details" && launchedWithMissionType) {
      const hasContextualBack =
        Boolean(normalizeEngagementCreateReturnTo(searchParams.get("return_to"))) ||
        Boolean(String(basics.provider_id || searchParams.get("provider_id") || "").trim());
      if (hasContextualBack) {
        router.push(backHref);
        return;
      }
      setStep("type");
      return;
    }
    if (step === "details") {
      setStep("type");
    }
  }

  async function createEngagement(postCreateAction: EngagementCreatePostAction) {
    const err = validateDetails();
    if (err) {
      setMsg(err);
      setStep(!basics.engagement_type.trim() ? "type" : "details");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const body = buildEngagementCreatePayload({
        basics,
        workflowDraft: {},
        providerLabel,
        organizationLabel: orgLabel,
        save_mode: "final",
        postCreateAction,
      });
      const res = await fetch("/api/portal/sales/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; engagement_id?: string };
      if (!res.ok || !j.ok || !j.engagement_id) {
        throw new Error(typeof j.error === "string" ? j.error : "Could not create engagement.");
      }
      router.push(
        resolveHrefAfterMissionEngagementCreate({
          engagementId: j.engagement_id,
          action: postCreateAction,
          launchType,
          providerId: basics.provider_id,
        }),
      );
    } catch (e: unknown) {
      setMsg(userFacingError(e, "Could not create engagement."));
    } finally {
      setSaving(false);
    }
  }

  const savingLabel = saving ? "Saving…" : null;
  const missionEngagementType = normalizeEngagementType(basics.engagement_type || launchType);
  const missionLaunchClass =
    launchedWithMissionType && missionEngagementType
      ? `create-engagement-root--mission-launched create-engagement-root--${missionEngagementType.replace(/_/g, "-")}`
      : "";

  return (
    <div className={["create-engagement-root", missionLaunchClass].filter(Boolean).join(" ")}>
      <style
        dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
      />
      <header className="create-engagement-header">
        <div className="create-engagement-header-nav">
          <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
          <Link href={backHref} className="create-engagement-back">
            ← Back
          </Link>
        </div>
        <div className="create-engagement-title-row">
          <div className="create-engagement-title-block">
            <h1 className="create-engagement-title">
              {step === "type" ? "New engagement" : screenCopy.title}
            </h1>
          </div>
          {!launchedWithMissionType ? (
            <span className="create-engagement-header-meta">
              {step === "type" ? "Step 1 of 2 — Choose mission" : "Step 2 of 2 — Details"}
            </span>
          ) : launchedWithMissionType && step === "details" && missionEngagementType !== "intro_call" ? (
            <span className="create-engagement-header-meta create-engagement-header-meta--mission">
              Required fields only
            </span>
          ) : null}
        </div>
      </header>

      <main className={["create-engagement-body", `create-engagement-body--step-${step}`].join(" ")}>
        {msg ? <div className="create-engagement-alert">{msg}</div> : null}

        {step === "type" ? (
          <EngagementTypeMissionPicker
            selectedType={(normalizeEngagementType(basics.engagement_type) || "") as EngagementType | ""}
            recommendedMission={recommendedMission}
            showRecommendedMission={!launchedWithMissionType}
            onSelect={selectEngagementType}
          />
        ) : null}

        {step === "details" ? (
          <div className="create-engagement-details-shell">
            <div className="create-engagement-details-card">
              {!launchedWithMissionType || screenCopy.detailsLead ? (
              <header
                className={[
                  "create-engagement-details-card-head",
                  launchedWithMissionType ? "create-engagement-details-card-head--mission" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {!launchedWithMissionType ? (
                  <span className="create-engagement-mission-badge">
                    {formatEngagementType(basics.engagement_type)}
                  </span>
                ) : null}
                {screenCopy.detailsLead ? (
                  <p className="create-engagement-step-lead">{screenCopy.detailsLead}</p>
                ) : null}
              </header>
              ) : null}
              <div className="create-engagement-step-fields">
            <div className="create-engagement-field">
              <label htmlFor="eng-provider">Provider *</label>
              <select
                id="eng-provider"
                value={basics.provider_id}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <option value="">Select provider…</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="create-engagement-field create-engagement-field--full">
              <label htmlFor="eng-org">Organization *</label>
              <select
                id="eng-org"
                value={basics.organization_id}
                disabled={!basics.provider_id || providerOrgsLoading}
                onChange={(e) => handleOrganizationChange(e.target.value)}
              >
                <option value="">
                  {!basics.provider_id
                    ? "Select a provider first…"
                    : providerOrgsLoading
                      ? "Loading organizations…"
                      : organizationOptions.length
                        ? "Select organization…"
                        : "No organizations available"}
                </option>
                {organizationOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            {schedulingExpanded ? (
              <>
                <div className="create-engagement-field">
                  <label htmlFor="eng-date">Date</label>
                  <input
                    id="eng-date"
                    type="date"
                    value={basics.engagement_date}
                    onChange={(e) => setBasicsField("engagement_date", e.target.value)}
                  />
                </div>
                <div className="create-engagement-field">
                  <label htmlFor="eng-time">Time</label>
                  <input
                    id="eng-time"
                    type="time"
                    value={basics.engagement_time}
                    onChange={(e) => setBasicsField("engagement_time", e.target.value)}
                  />
                  {!basics.engagement_time.trim() ? (
                    <p className="hint">Optional — leave blank if not scheduled yet</p>
                  ) : null}
                </div>
              </>
            ) : (
              <button
                type="button"
                className="create-engagement-schedule-toggle create-engagement-field--full"
                onClick={() => setSchedulingOpen(true)}
              >
                {screenCopy.schedulingToggleLabel}
              </button>
            )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer
        className={`create-engagement-footer${
          launchedWithMissionType && step === "details"
            ? " create-engagement-footer--mission-launch"
            : ""
        }${
          step === "type" && typeSelected
            ? " create-engagement-footer--type-selected"
            : step === "details"
              ? " create-engagement-footer--details-save"
              : ""
        }`}
      >
        {step === "type" && typeSelected ? (
          <>
            <p className="create-engagement-footer-helper">{ENGAGEMENT_MISSION_CHOICE_HELPER}</p>
            <div className="create-engagement-footer-actions">
              {canGoBack ? (
                <button type="button" className="ghost" onClick={goBack} disabled={saving}>
                  Back
                </button>
              ) : null}
              <button type="button" className="primary" onClick={goNext} disabled={saving}>
                {savingLabel ?? "Next"}
              </button>
            </div>
          </>
        ) : step === "details" ? (
          <>
            {launchedWithMissionType && screenCopy.footerHelper ? (
              <p className="create-engagement-mission-footer-helper">{screenCopy.footerHelper}</p>
            ) : null}
            <button type="button" className="ghost" onClick={goBack} disabled={saving}>
              Back
            </button>
            <div className="create-engagement-footer-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => void createEngagement("save")}
                disabled={saving}
              >
                {savingLabel ?? screenCopy.scheduleForLaterLabel}
              </button>
              <button
                type="button"
                className={screenCopy.primaryAction === "prepare" ? "primary" : "secondary"}
                onClick={() => void createEngagement("prepare")}
                disabled={saving}
              >
                {savingLabel ?? screenCopy.prepareNowLabel}
              </button>
              {screenCopy.showStartNow ? (
                <button
                  type="button"
                  className={screenCopy.primaryAction === "start_call" ? "primary" : "secondary"}
                  onClick={() => void createEngagement("start_call")}
                  disabled={saving}
                >
                  {saving ? screenCopy.startSavingLabel : screenCopy.startNowLabel}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="create-engagement-footer-helper">Select an engagement type to continue.</p>
        )}
      </footer>
    </div>
  );
}
