/**
 * Access-step pathway actions — lightweight routing without discovery mapping deps.
 */

import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import type { ProviderOverviewFocusedModal } from "@/lib/surgical-sales/providerOverviewFocusedActionRouting";

export type ProviderAccessStepState = "known" | "partial" | "missing";

export type ProviderAccessStepPathwayAction =
  | { kind: "focusedModal"; modal: ProviderOverviewFocusedModal; label?: string }
  | { kind: "href"; href: string; label: string };

export function resolvePathwayActionForAccessStep(
  stepId: string,
  stepState: ProviderAccessStepState,
  input: {
    providerId: string;
    accountId?: string | null;
  },
): ProviderAccessStepPathwayAction | null {
  if (stepId === "interest" || stepId === "approval") {
    return {
      kind: "focusedModal",
      modal: "observationApproval",
      label: stepState === "known" ? "Update observation status" : "Update observation status",
    };
  }

  if (stepId === "credentialing") {
    return { kind: "focusedModal", modal: "credentialing", label: "Update credentialing" };
  }

  if (stepId === "scheduler") {
    return { kind: "focusedModal", modal: "scheduler", label: "Update scheduler" };
  }

  if (stepId === "scheduled") {
    return {
      kind: "href",
      href: buildProviderObservationCaseHref({
        providerId: input.providerId,
        accountId: input.accountId ?? null,
      }),
      label: "Add Observation Case",
    };
  }

  return null;
}
