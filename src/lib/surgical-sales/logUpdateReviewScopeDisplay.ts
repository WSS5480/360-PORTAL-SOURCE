/**
 * Approval modal save-destination copy — one primary label, optional secondary context.
 * Avoids ambiguous arrows (e.g. Facility → Provider).
 */

import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { intelligenceScopeForDbKey } from "@/lib/surgical-sales/intelligenceScopeModel";
import type { IntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import { intelligenceSaveDestinationLabel } from "@/lib/surgical-sales/intelligenceSaveDestination";

export type ReviewScopeDisplayContext = {
  organizationLabel?: string | null;
  providerLabel?: string | null;
  /** Rep is saving from a provider- or engagement-linked surface (not org-only). */
  fromProviderWorkspace?: boolean;
};

export type ReviewSaveScopeDisplay = {
  /** Badge text: Facility | Provider | Case | Engagement */
  primaryLabel: string;
  /** Plain-language save location; null when primary label is enough */
  secondaryNote: string | null;
};

export function reviewDestinationBadgeLabel(destination: IntelligenceSaveDestination): string {
  if (destination === "engagement_note") return "Engagement";
  return intelligenceSaveDestinationLabel(destination);
}

function dbKeyImpliesProviderProfileStorage(dbKey: string): boolean {
  const scope = intelligenceScopeForDbKey(dbKey);
  return scope === "provider" || dbKey.startsWith("provider_");
}

/**
 * Deterministic save-scope presentation for one review row.
 */
export function formatReviewSaveScopeDisplay(
  field: LogUpdateRoutedFieldUpdate,
  context?: ReviewScopeDisplayContext,
): ReviewSaveScopeDisplay {
  const destination = field.proposedDestination;
  const scope = field.proposedScope;
  const orgName = context?.organizationLabel?.trim() || null;
  const providerName = context?.providerLabel?.trim() || null;
  const fromProvider = Boolean(context?.fromProviderWorkspace ?? providerName);

  if (isOrganizationIntelligenceDbKey(field.dbKey) || scope === "organization") {
    const primaryLabel = reviewDestinationBadgeLabel("facility");
    if (fromProvider && orgName) {
      return {
        primaryLabel,
        secondaryNote: `Shared across providers at ${orgName}`,
      };
    }
    return { primaryLabel, secondaryNote: null };
  }

  const primaryLabel = reviewDestinationBadgeLabel(destination);

  if (destination === "engagement_note") {
    return {
      primaryLabel,
      secondaryNote: "Saved on this touch",
    };
  }

  if (destination === "case") {
    return { primaryLabel, secondaryNote: null };
  }

  if (destination === "provider" && scope === "provider") {
    return { primaryLabel, secondaryNote: null };
  }

  if (destination === "facility" && scope === "provider") {
    return {
      primaryLabel,
      secondaryNote: fromProvider && providerName
        ? `Visible on ${providerName}`
        : "Visible on this provider",
    };
  }

  return { primaryLabel, secondaryNote: null };
}

/** Bracketed badge + title line, e.g. "[Provider] Procedure mix partially mapped". */
export function formatReviewSaveScopeHeadline(
  field: LogUpdateRoutedFieldUpdate,
  title: string,
  context?: ReviewScopeDisplayContext,
): { badgeLabel: string; title: string; secondaryNote: string | null } {
  const display = formatReviewSaveScopeDisplay(field, context);
  return {
    badgeLabel: display.primaryLabel,
    title: title.trim(),
    secondaryNote: display.secondaryNote,
  };
}
