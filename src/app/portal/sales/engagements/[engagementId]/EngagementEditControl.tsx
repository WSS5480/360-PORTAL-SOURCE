"use client";

import React from "react";
import { ENGAGEMENT_EDIT_ENGAGEMENT_LABEL } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  buildEngagementEditPatch,
  readEngagementEditDraft,
  type EngagementEditOrganizationOption,
  type EngagementEditPatch,
} from "@/lib/surgical-sales/engagements/engagementEditDraft";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { formatPortalApiError } from "@/lib/utils/formatPortalApiError";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { EngagementEditDetailsSheet } from "./EngagementEditDetailsSheet";
import { userFacingError } from "@/lib/errors/userFacingError";

type ProviderOrgLink = {
  account_id?: string;
  is_active?: boolean;
  accounts?: { id?: string; name?: string | null };
};

async function loadEngagementRecord(engagementId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
    cache: "no-store",
  });
  const j = await readResponseJson<{ ok?: boolean; engagement?: Record<string, unknown>; error?: unknown }>(res);
  if (!res.ok || !j.ok || !j.engagement) {
    throw new Error(formatPortalApiError(j.error, "We could not load this meeting. Please try again."));
  }
  return j.engagement;
}

async function loadProviderOrganizationOptions(
  providerId: string,
): Promise<EngagementEditOrganizationOption[]> {
  const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
    cache: "no-store",
  });
  const j = await readResponseJson<{
    ok?: boolean;
    organization_links?: ProviderOrgLink[];
    primary_organization?: { id?: string; name?: string | null };
    error?: unknown;
  }>(res);
  if (!res.ok || !j.ok) return [];

  const links = j.organization_links?.length
    ? j.organization_links
    : j.primary_organization?.id
      ? [
          {
            account_id: String(j.primary_organization.id),
            is_active: true,
            accounts: {
              id: String(j.primary_organization.id),
              name: j.primary_organization.name,
            },
          },
        ]
      : [];

  const seen = new Set<string>();
  const options: EngagementEditOrganizationOption[] = [];
  for (const link of links) {
    if (link.is_active === false) continue;
    const id = String(link.account_id || link.accounts?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    options.push({
      id,
      name: String(link.accounts?.name || "").trim() || "Organization",
    });
  }
  return options;
}

export function EngagementEditControl({
  engagementId,
  engagement: engagementSeed,
  providerId,
  disabled = false,
  archived = false,
  className,
  variant = "secondary",
  onSaved,
  onError,
  onSavingChange,
}: {
  engagementId: string;
  engagement?: Record<string, unknown>;
  providerId: string;
  disabled?: boolean;
  archived?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  onSaved?: () => void | Promise<void>;
  onError?: (message: string | null) => void;
  onSavingChange?: (busy: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [engagement, setEngagement] = React.useState<Record<string, unknown> | null>(
    engagementSeed ?? null,
  );
  const [organizations, setOrganizations] = React.useState<EngagementEditOrganizationOption[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (engagementSeed) setEngagement(engagementSeed);
  }, [engagementSeed]);

  async function openSheet() {
    if (disabled || archived) return;
    setOpen(true);
    setLoadError(null);
    setLoading(true);
    onError?.(null);
    try {
      const [record, orgs] = await Promise.all([
        loadEngagementRecord(engagementId),
        loadProviderOrganizationOptions(providerId),
      ]);
      setEngagement(record);
      setOrganizations(orgs);
    } catch (e: unknown) {
      const message = userFacingError(e, "We could not load this meeting. Please try again.");
      setLoadError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft(patch: EngagementEditPatch) {
    setSaving(true);
    onSavingChange?.(true);
    onError?.(null);
    try {
      const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = (await res.json()) as { ok?: boolean; engagement?: Record<string, unknown>; error?: unknown };
      if (!res.ok || !j.ok) throw new Error(formatPortalApiError(j.error, "Update failed"));
      if (j.engagement) setEngagement(j.engagement);
      setOpen(false);
      if (onSaved) await onSaved();
    } catch (e: unknown) {
      onError?.(userFacingError(e, "We could not save that update. Please try again."));
      throw e;
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  const record = engagement ?? engagementSeed ?? { engagement_type: "follow_up", status: "planned" };
  const pathwayMission = isIntroCallPathwayMission(String(record.engagement_type ?? ""));

  const btnClass =
    variant === "primary"
      ? "engagement-record-action engagement-record-action--primary"
      : variant === "ghost"
        ? "engagement-record-action engagement-record-action--ghost"
        : "engagement-record-action engagement-record-action--secondary";

  return (
    <>
      <button
        type="button"
        className={className ?? btnClass}
        disabled={disabled || archived}
        onClick={() => void openSheet()}
      >
        {ENGAGEMENT_EDIT_ENGAGEMENT_LABEL}
      </button>

      <EngagementEditDetailsSheet
        open={open}
        engagement={record}
        organizations={organizations}
        busy={saving}
        loading={loading}
        loadError={loadError}
        pathwayMission={pathwayMission}
        organizationName={
          organizations.find((o) => o.id === String(record.organization_id ?? ""))?.name ?? null
        }
        initialDraft={readEngagementEditDraft(record)}
        onClose={() => {
          setOpen(false);
          setLoadError(null);
        }}
        onSave={async (draft) => {
          await saveDraft(buildEngagementEditPatch(draft, record));
        }}
      />
    </>
  );
}
