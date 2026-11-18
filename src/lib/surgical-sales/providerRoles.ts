/**
 * Clinician roles surfaced as Providers in the sales portal UI (contacts remain the API/DB entity).
 * See `crmEntityRelationships.ts` for the full Provider ↔ Organization ↔ Case ↔ Opportunity model.
 */

export const PROVIDER_ROLE_TYPES = ["surgeon", "physician_assistant"] as const;

export type ProviderRoleType = (typeof PROVIDER_ROLE_TYPES)[number];

export function isProviderRole(role: string | null | undefined): boolean {
  return PROVIDER_ROLE_TYPES.includes(String(role || "").trim() as ProviderRoleType);
}
