/**
 * Server-only loaders for debrief / log-update AI extraction context.
 * Import only from API routes and other server modules — never from client components.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  buildDiscoveryOpenQuestionRows,
  DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER,
} from "@/lib/surgical-sales/discoveryIntelligenceOpenQuestions";
import {
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { loadProviderEngagementsForProfile } from "@/lib/surgical-sales/engagements/loadProviderEngagements";
import {
  isUpcomingEngagementStatus,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { loadActiveCredentialingPlatformsCached } from "@/lib/surgical-sales/loadActiveCredentialingPlatforms";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import { resolveDiscoverySignalCaptureConfidence } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { formatFieldCaptureHistoryLine } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { MISSION_INTELLIGENCE_NOT_YET_OBSERVED } from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  contactRowNeedsDetails,
  relationshipNotesIndicateDetailsMissing,
} from "@/lib/surgical-sales/debriefDetectedContact";
import type {
  DebriefIntelligenceExtractionContext,
  DebriefIntelligenceSignalSnapshot,
  DebriefSupportContactSummary,
} from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";

const SIGNAL_LABELS: Record<DiscoveryStructuredSignalId, string> = {
  observation_approval: "Observation approval",
  scheduling_owner: "Scheduling owner",
  facility_vendor_pathway: "Facility / vendor access",
  observation_logistics: "Observation logistics",
  workflow_visibility: "Procedure workflow understanding",
  product_alignment: "Product fit",
  case_opportunity: "Case opportunity",
  clinical_champion: "Clinical champion",
  decision_influence: "Decision influence",
  opportunity_clinical_frustrations: "Clinical frustrations",
  opportunity_workflow_inefficiencies: "Workflow inefficiencies",
  opportunity_products_in_use: "Products in use",
  opportunity_product_gaps: "Product gaps",
  opportunity_outcome_priorities: "Outcome priorities",
  opportunity_staff_frustrations: "Staff frustrations",
  opportunity_future_signals: "Future opportunity signals",
};

function engagementSummaryLine(e: ProviderEngagementSummary): string {
  const type = e.engagement_type_label?.trim() || e.engagement_type || "Engagement";
  const when = e.scheduled_at?.trim() || e.engagement_date?.trim() || "";
  const status = e.status_label?.trim() || e.status?.trim() || "";
  const parts = [type, when, status].filter(Boolean);
  return parts.join(" · ");
}

/**
 * Fast discovery context for debrief analyze — skips engagement history loads.
 * Keeps open questions, signals, contacts, and platform catalog for mapping + review.
 */
export async function loadDebriefIntelligenceExtractionContextLite(input: {
  providerRow: Record<string, unknown>;
  organizationName?: string | null;
  productFocus?: string | null;
}): Promise<DebriefIntelligenceExtractionContext | null> {
  const providerId = String(input.providerRow.id ?? "").trim();
  if (!providerId) return null;

  const contact = hydrateDiscoveryContactFromLegacy(input.providerRow);
  const fieldMeta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);

  const [credentialingPlatforms, relationshipsRes] = await Promise.all([
    loadActiveCredentialingPlatformsCached(),
    supabaseAdmin
      .from("surgical_sales_contact_relationships")
      .select("id, workflow_role, ownership_type, related_contact_id, primary_contact_id, notes")
      .or(`primary_contact_id.eq.${providerId},related_contact_id.eq.${providerId}`)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  const relRows = (relationshipsRes.data ?? []) as Array<Record<string, unknown>>;
  const relatedIds = [
    ...new Set(
      relRows.flatMap((row) => {
        const relatedId = String(row.related_contact_id ?? "");
        const primaryId = String(row.primary_contact_id ?? "");
        if (relatedId === providerId) return primaryId ? [primaryId] : [];
        if (primaryId === providerId) return relatedId ? [relatedId] : [];
        return [relatedId, primaryId].filter((id) => id && id !== providerId);
      }),
    ),
  ].filter(Boolean);

  const relatedById = new Map<string, Record<string, unknown>>();
  if (relatedIds.length > 0) {
    const { data: relatedContacts } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, first_name, last_name, role_type, mobile_phone, email, relationship_notes")
      .in("id", relatedIds);
    for (const c of relatedContacts ?? []) {
      relatedById.set(String((c as { id: string }).id), c as Record<string, unknown>);
    }
  }

  const supportContacts: DebriefSupportContactSummary[] = [];
  for (const row of relRows) {
    const relatedId = String(row.related_contact_id ?? "");
    const primaryId = String(row.primary_contact_id ?? "");
    const contactId = relatedId === providerId ? primaryId : relatedId;
    const contactRow = contactId ? relatedById.get(contactId) : null;
    const name = contactRow ? contactDisplayName(contactRow) : "";
    if (!name.trim() || !contactId) continue;
    const relNotes = String(row.notes ?? "").trim();
    const missingDetails =
      contactRowNeedsDetails(contactRow ?? {}) ||
      relationshipNotesIndicateDetailsMissing(relNotes);

    supportContacts.push({
      contactId,
      name: name.trim(),
      contactType: contactRow ? String(contactRow.role_type ?? "").trim() || null : null,
      workflowRole: String(row.workflow_role ?? "").trim() || null,
      ownershipType: String(row.ownership_type ?? "").trim() || null,
      contactDetailsMissing: missingDetails,
    });
  }

  const discoveryView = buildDiscoveryIntelligenceGroupsView({
    contact,
    engagements: [],
  });

  const signalStatuses: DebriefIntelligenceSignalSnapshot[] = DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER.map(
    (signalId) => ({
      signalId,
      statusLabel: resolveDiscoveryStructuredSignalStatus(signalId, contact),
      label: SIGNAL_LABELS[signalId],
    }),
  );

  const openQuestions = buildDiscoveryOpenQuestionRows({
    contact,
    confidenceForDbKeys: (dbKeys, primaryDbKey, signalId, statusLabel) =>
      resolveDiscoverySignalCaptureConfidence({
        dbKeys,
        primaryDbKey,
        contact,
        fieldMeta,
        signalId,
        statusLabel,
      }),
    lastUpdatedForDbKeys: (dbKeys) => {
      for (const key of dbKeys) {
        const line = formatFieldCaptureHistoryLine(fieldMeta[key]);
        if (line) return line;
      }
      return MISSION_INTELLIGENCE_NOT_YET_OBSERVED;
    },
    max: 10,
  });

  const accessNotes = String(contact.access_notes ?? "").trim();
  const notesHistory: string[] = [];
  if (accessNotes) {
    const chunks = accessNotes.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
    notesHistory.push(...chunks.slice(-2));
  }

  const platformId = contact.provider_credentialing_platform_id
    ? String(contact.provider_credentialing_platform_id)
    : null;
  const platformNameRaw = String(contact.provider_credentialing_platform_name ?? "").trim();
  let providerPlatformName = platformNameRaw || null;
  if (platformId && credentialingPlatforms.length) {
    const match = credentialingPlatforms.find((p) => p.id === platformId);
    if (match) providerPlatformName = match.name;
  }

  return {
    pathwayStageId: discoveryView.pathwayStageId,
    pathwayStageLabel: discoveryView.pathwayStageLabel,
    discoveryReadinessPercent: discoveryView.confidenceScore,
    openQuestions,
    signalStatuses,
    supportContacts,
    credentialingPlatforms,
    providerPlatformName,
    upcomingEngagements: [],
    pastEngagements: [],
    productFocus: input.productFocus?.trim() || null,
    notesHistory,
  };
}

export async function loadDebriefIntelligenceExtractionContext(input: {
  actorUserId: string;
  providerRow: Record<string, unknown> | null;
  organizationName?: string | null;
  productFocus?: string | null;
}): Promise<DebriefIntelligenceExtractionContext | null> {
  if (!input.providerRow) return null;

  const providerId = String(input.providerRow.id ?? "").trim();
  if (!providerId) return null;

  const contact = hydrateDiscoveryContactFromLegacy(input.providerRow);
  const fieldMeta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);

  const [engagements, platformsRes, relationshipsRes] = await Promise.all([
    loadProviderEngagementsForProfile(supabaseAdmin, {
      providerId,
      salesRepId: input.actorUserId,
      contact,
      primaryOrganizationName: input.organizationName ?? null,
      primaryOrganizationId: contact.account_id ? String(contact.account_id) : null,
    })
      .then((result) => result.engagements)
      .catch(() => [] as ProviderEngagementSummary[]),
    loadActiveCredentialingPlatformsCached(),
    supabaseAdmin
      .from("surgical_sales_contact_relationships")
      .select("id, workflow_role, ownership_type, related_contact_id, primary_contact_id")
      .or(`primary_contact_id.eq.${providerId},related_contact_id.eq.${providerId}`)
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  const credentialingPlatforms = platformsRes;

  const relRows = (relationshipsRes.data ?? []) as Array<Record<string, unknown>>;
  const relatedIds = [
    ...new Set(
      relRows.flatMap((row) => {
        const relatedId = String(row.related_contact_id ?? "");
        const primaryId = String(row.primary_contact_id ?? "");
        if (relatedId === providerId) return primaryId ? [primaryId] : [];
        if (primaryId === providerId) return relatedId ? [relatedId] : [];
        return [relatedId, primaryId].filter((id) => id && id !== providerId);
      }),
    ),
  ].filter(Boolean);

  const relatedById = new Map<string, Record<string, unknown>>();
  if (relatedIds.length > 0) {
    const { data: relatedContacts } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, first_name, last_name, role_type")
      .in("id", relatedIds);
    for (const c of relatedContacts ?? []) {
      relatedById.set(String((c as { id: string }).id), c as Record<string, unknown>);
    }
  }

  const supportContacts: DebriefSupportContactSummary[] = [];
  for (const row of relRows) {
    const relatedId = String(row.related_contact_id ?? "");
    const primaryId = String(row.primary_contact_id ?? "");
    const contactId = relatedId === providerId ? primaryId : relatedId;
    const contactRow = contactId ? relatedById.get(contactId) : null;
    const name = contactRow ? contactDisplayName(contactRow) : "";
    if (!name.trim() || !contactId) continue;
    const relNotes = String(row.notes ?? "").trim();
    const missingDetails =
      contactRowNeedsDetails(contactRow ?? {}) ||
      relationshipNotesIndicateDetailsMissing(relNotes);

    supportContacts.push({
      contactId,
      name: name.trim(),
      contactType: contactRow ? String(contactRow.role_type ?? "").trim() || null : null,
      workflowRole: String(row.workflow_role ?? "").trim() || null,
      ownershipType: String(row.ownership_type ?? "").trim() || null,
      contactDetailsMissing: missingDetails,
    });
  }

  const discoveryView = buildDiscoveryIntelligenceGroupsView({
    contact,
    engagements,
  });

  const signalStatuses: DebriefIntelligenceSignalSnapshot[] = DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER.map(
    (signalId) => ({
      signalId,
      statusLabel: resolveDiscoveryStructuredSignalStatus(signalId, contact),
      label: SIGNAL_LABELS[signalId],
    }),
  );

  const openQuestions = buildDiscoveryOpenQuestionRows({
    contact,
    confidenceForDbKeys: (dbKeys, primaryDbKey, signalId, statusLabel) =>
      resolveDiscoverySignalCaptureConfidence({
        dbKeys,
        primaryDbKey,
        contact,
        fieldMeta,
        signalId,
        statusLabel,
      }),
    lastUpdatedForDbKeys: (dbKeys) => {
      for (const key of dbKeys) {
        const line = formatFieldCaptureHistoryLine(fieldMeta[key]);
        if (line) return line;
      }
      return MISSION_INTELLIGENCE_NOT_YET_OBSERVED;
    },
    max: 12,
  });

  const upcoming = engagements
    .filter((e) => isUpcomingEngagementStatus(e.status))
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      label: engagementSummaryLine(e),
      scheduledAt: e.scheduled_at ?? e.engagement_date ?? null,
    }));

  const past = engagements
    .filter((e) => !isUpcomingEngagementStatus(e.status))
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      label: engagementSummaryLine(e),
      scheduledAt: e.scheduled_at ?? e.engagement_date ?? null,
    }));

  const accessNotes = String(contact.access_notes ?? "").trim();
  const notesHistory: string[] = [];
  if (accessNotes) {
    const chunks = accessNotes.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
    notesHistory.push(...chunks.slice(-3));
  }
  for (const e of past.slice(0, 2)) {
    const note = engagements.find((x) => x.id === e.id)?.notes?.trim();
    if (note) notesHistory.push(note.slice(0, 400));
  }

  const platformId = contact.provider_credentialing_platform_id
    ? String(contact.provider_credentialing_platform_id)
    : null;
  const platformNameRaw = String(contact.provider_credentialing_platform_name ?? "").trim();
  let providerPlatformName = platformNameRaw || null;
  if (platformId && credentialingPlatforms.length) {
    const match = credentialingPlatforms.find((p) => p.id === platformId);
    if (match) providerPlatformName = match.name;
  }

  return {
    pathwayStageId: discoveryView.pathwayStageId,
    pathwayStageLabel: discoveryView.pathwayStageLabel,
    discoveryReadinessPercent: discoveryView.confidenceScore,
    openQuestions,
    signalStatuses,
    supportContacts,
    credentialingPlatforms,
    providerPlatformName,
    upcomingEngagements: upcoming,
    pastEngagements: past,
    productFocus: input.productFocus?.trim() || null,
    notesHistory: notesHistory.slice(0, 5),
  };
}
