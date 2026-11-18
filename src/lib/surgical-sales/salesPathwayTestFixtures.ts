/** Shared fixtures for sales pathway unit tests. */

export const PATHWAY_VALIDATED_FIELD_META = {
  source_type: "profile",
  source_label: "Test",
  updated_at: "2026-05-20T12:00:00.000Z",
  validated_at: "2026-05-20T12:00:00.000Z",
};

export function discoveryAccessReadyContact(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    provider_observation_feasibility: "approved",
    provider_observation_coordinator_contact: "Karen — OR scheduling",
    provider_observation_access_path: "none",
    provider_observation_credentialing_needed: "cleared",
    provider_credentialing_status: "cleared",
    provider_observation_best_days_case_types: "Tuesday AM lap cases",
    provider_intelligence_field_metadata: {
      provider_observation_feasibility: PATHWAY_VALIDATED_FIELD_META,
      provider_observation_access_path: PATHWAY_VALIDATED_FIELD_META,
      provider_observation_credentialing_needed: PATHWAY_VALIDATED_FIELD_META,
      provider_credentialing_status: PATHWAY_VALIDATED_FIELD_META,
      provider_observation_best_days_case_types: PATHWAY_VALIDATED_FIELD_META,
      provider_observation_coordinator_contact: PATHWAY_VALIDATED_FIELD_META,
    },
    ...extra,
  };
}

/** Product fit validated — required to exit Debrief toward Evaluation. */
export function productFitValidatedContact(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return discoveryAccessReadyContact({
    provider_product_fit_validated: "yes",
    ...extra,
  });
}

export function withPathwayValidatedFields(
  contact: Record<string, unknown>,
  dbKeys: string[],
): Record<string, unknown> {
  const meta = {
    ...((contact.provider_intelligence_field_metadata as Record<string, unknown>) ?? {}),
  };
  for (const key of dbKeys) {
    meta[key] = PATHWAY_VALIDATED_FIELD_META;
  }
  return { ...contact, provider_intelligence_field_metadata: meta };
}
