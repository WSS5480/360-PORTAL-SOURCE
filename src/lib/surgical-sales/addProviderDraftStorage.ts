/**
 * Session draft for Add Provider — survives org modal, navigation, and remounts.
 */

import type { ProviderWizardStepId } from "@/lib/surgical-sales/providerCreateWizard";
import type { ProviderOnboardingRelationshipAnswer } from "@/lib/surgical-sales/providerRelationshipStage";

export const ADD_PROVIDER_DRAFT_STORAGE_KEY = "addProviderDraft";

export type AddProviderDraft = {
  version: 1;
  savedAt: string;
  step: ProviderWizardStepId;
  firstName: string;
  lastName: string;
  title: string;
  roleType: string;
  onboardingRelationship: ProviderOnboardingRelationshipAnswer;
  providerCrmStatus: string;
  email: string;
  phone: string;
  mobilePhone: string;
  specialty: string;
  primaryOrgId: string;
  extraOrgIds: string[];
};

export function readAddProviderDraft(): AddProviderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ADD_PROVIDER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AddProviderDraft;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAddProviderDraft(draft: AddProviderDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ADD_PROVIDER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota or private mode */
  }
}

export function clearAddProviderDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADD_PROVIDER_DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function addProviderDraftHasContent(draft: AddProviderDraft): boolean {
  if (draft.firstName.trim() || draft.lastName.trim() || draft.specialty.trim()) return true;
  if (draft.primaryOrgId || draft.email.trim() || draft.phone.trim() || draft.mobilePhone.trim()) return true;
  if (draft.extraOrgIds.length > 0) return true;
  return false;
}
