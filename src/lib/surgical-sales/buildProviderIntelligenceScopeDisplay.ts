/**
 * Read-model for Shared Facility vs Provider-Specific intelligence on provider pages.
 */

import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { buildOrganizationIntelligenceSections } from "@/lib/surgical-sales/organizationIntelligenceArchitecture";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceGapStateLabel } from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { synthesizeOperationalInsight } from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import { shortenOverviewSignalLine } from "@/lib/surgical-sales/providerOverviewSignalCopy";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import {
  formatProviderInheritanceDisplayLine,
  readOrganizationInheritanceFromContact,
} from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { intelligenceScopeForDbKey } from "@/lib/surgical-sales/intelligenceScopeModel";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

export type IntelligenceScopeBulletState = "known" | "gap" | "empty";

export type IntelligenceScopeBullet = {
  dbKey: string;
  label: string;
  line: string;
  scope: IntelligenceScope;
  state: IntelligenceScopeBulletState;
  /** e.g. "Observed during intro call" */
  contextHint?: string | null;
  /** e.g. "Confidence building" / "Needs validation" */
  confidenceLabel?: string | null;
};

export type ProviderIntelligenceScopePanel = {
  title: string;
  subtitle: string;
  /** Facility panel only — e.g. "Inherited across providers". */
  inheritanceLine?: string;
  bullets: IntelligenceScopeBullet[];
  emptyHint: string;
};

export type ProviderIntelligenceScopeDisplay = {
  facility: ProviderIntelligenceScopePanel;
  provider: ProviderIntelligenceScopePanel;
};

const ORG_FIELD_ORDER = buildOrganizationIntelligenceSections().flatMap((s) => s.fieldKeys);

const PROVIDER_FIELD_ORDER = PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);

const ORG_LABEL = new Map(ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label]));
const PROVIDER_LABEL = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label]));

function sectionForProviderKey(dbKey: string): ProviderIntelligenceSectionId {
  if (dbKey.startsWith("provider_observation_") || dbKey === "provider_first_observation_questions") {
    return "observation_readiness";
  }
  if (
    dbKey.includes("communication") ||
    dbKey.includes("responsiveness") ||
    dbKey === "influence_level" ||
    dbKey.includes("decision") ||
    dbKey.includes("champion") ||
    dbKey.includes("follow_up")
  ) {
    return "relationship_intelligence";
  }
  if (
    dbKey.includes("evaluation") ||
    dbKey.includes("competitive") ||
    dbKey.includes("dissatisfaction")
  ) {
    return "commercial_signals";
  }
  return "clinical_workflow";
}

function formatKnownLine(dbKey: string, raw: string): string {
  const synthesized = synthesizeOperationalInsight(dbKey, raw);
  if (synthesized) {
    return shortenOverviewSignalLine(synthesized, 56);
  }
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  if (chip) return shortenOverviewSignalLine(chip, 56);
  return shortenOverviewSignalLine(raw, 56);
}

function formatGapLine(
  dbKey: string,
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
): string {
  const gap = learningGapForField(dbKey, sectionId, contact);
  if (gap?.phrase) return gap.phrase;
  return intelligenceGapStateLabel(dbKey, "unknown");
}

function scopeForBullet(dbKey: string, panel: "organization" | "provider"): IntelligenceScope {
  if (panel === "organization") return "organization";
  return intelligenceScopeForDbKey(dbKey) ?? "provider";
}

function formatSourceHint(sourceLabel: string): string {
  const s = sourceLabel.trim();
  if (!s) return "";
  if (/intro call/i.test(s)) return "Observed during intro call";
  if (/observation/i.test(s)) return "Captured during observation";
  if (/or staff|charge nurse|coordinator/i.test(s)) return "Captured from OR staff";
  if (/profile/i.test(s)) return "";
  return `Captured from ${s}`;
}

function confidenceLabelForField(
  meta: ProviderIntelligenceFieldMetadataMap[string] | undefined,
  state: IntelligenceScopeBulletState,
): string | null {
  if (state === "gap") return "Needs validation";
  if (!meta) return state === "known" ? "Confidence building" : null;
  if (meta.validated_at || meta.lifecycle_state === "validated") return "Field confirmed";
  if (meta.confirmed_at || meta.lifecycle_state === "confirmed") return "Confidence building";
  if (meta.discovery_stance === "needs_validation") return "Needs validation";
  return "Confidence building";
}

function pushBullet(
  bullets: IntelligenceScopeBullet[],
  input: {
    dbKey: string;
    label: string;
    line: string;
    state: IntelligenceScopeBulletState;
    panel: "organization" | "provider";
    fieldMeta?: ProviderIntelligenceFieldMetadataMap;
  },
) {
  const meta = input.fieldMeta?.[input.dbKey];
  bullets.push({
    dbKey: input.dbKey,
    label: input.label,
    line: input.line,
    state: input.state,
    scope: scopeForBullet(input.dbKey, input.panel),
    contextHint: meta?.source_label ? formatSourceHint(meta.source_label) : null,
    confidenceLabel: confidenceLabelForField(meta, input.state),
  });
}

function buildBullets(
  fieldKeys: readonly string[],
  labelMap: Map<string, string>,
  contact: Record<string, unknown>,
  panel: "organization" | "provider",
  maxBullets = 8,
  options?: {
    organizationBaseline?: OrganizationIntelligenceBaseline | null;
    organizationName?: string | null;
  },
): IntelligenceScopeBullet[] {
  const bullets: IntelligenceScopeBullet[] = [];
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );

  for (const dbKey of fieldKeys) {
    const raw = String(contact[dbKey] ?? "").trim();
    const label = labelMap.get(dbKey) ?? dbKey.replace(/^provider_/, "").replace(/_/g, " ");
    const sectionId = panel === "provider" ? sectionForProviderKey(dbKey) : "or_environment";
    const inheritance = isOrganizationIntelligenceDbKey(dbKey)
      ? readOrganizationInheritanceFromContact(contact, dbKey)
      : null;
    const baselineLine = options?.organizationBaseline?.fields?.[dbKey]?.displayLine;

    if (panel === "organization" && isOrganizationIntelligenceDbKey(dbKey)) {
      const facilityLine = baselineLine ?? (fieldHasIntelligenceSignal(dbKey, raw) ? formatKnownLine(dbKey, raw) : null);
      if (facilityLine) {
        pushBullet(bullets, { dbKey, label, line: facilityLine, state: "known", panel, fieldMeta });
        continue;
      }
    }

    if (panel === "provider" && inheritance) {
      pushBullet(bullets, {
        dbKey,
        label,
        line: formatProviderInheritanceDisplayLine({
          stance: inheritance.stance,
          facilityDisplayLine: inheritance.facility_display_line ?? baselineLine,
          providerValue: raw,
          organizationName: options?.organizationName ?? undefined,
        }),
        state: "known",
        panel,
        fieldMeta,
      });
      continue;
    }

    if (fieldHasIntelligenceSignal(dbKey, raw)) {
      pushBullet(bullets, {
        dbKey,
        label,
        line: formatKnownLine(dbKey, raw),
        state: "known",
        panel,
        fieldMeta,
      });
      continue;
    }

    const gapLine = formatGapLine(dbKey, sectionId, contact);
    if (bullets.filter((b) => b.state === "gap").length < 3) {
      pushBullet(bullets, { dbKey, label, line: gapLine, state: "gap", panel, fieldMeta });
    }
  }

  const known = bullets.filter((b) => b.state === "known");
  const gaps = bullets.filter((b) => b.state === "gap");
  return [...known, ...gaps].slice(0, maxBullets);
}

export function buildProviderIntelligenceScopeDisplay(input: {
  contact: Record<string, unknown>;
  organizationName?: string | null;
  providerName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  maxBulletsPerPanel?: number;
}): ProviderIntelligenceScopeDisplay {
  const contact = input.contact;
  const orgName = String(input.organizationName ?? "").trim() || "This facility";
  const providerName =
    String(input.providerName ?? "").trim() ||
    contactDisplayName({
      first_name: contact.first_name as string,
      last_name: contact.last_name as string,
      email: contact.email as string,
    }) ||
    "This provider";

  const scopeOpts = {
    organizationBaseline: input.organizationBaseline,
    organizationName: orgName,
  };
  const maxFacility = input.maxBulletsPerPanel ?? 6;
  const maxProvider = input.maxBulletsPerPanel ?? 8;
  const facilityBullets = buildBullets(ORG_FIELD_ORDER, ORG_LABEL, contact, "organization", maxFacility, scopeOpts);
  const providerOnlyBullets = buildBullets(PROVIDER_FIELD_ORDER, PROVIDER_LABEL, contact, "provider", maxProvider, scopeOpts);
  const inheritanceBullets = buildBullets(
    ORG_FIELD_ORDER.filter((dbKey) => readOrganizationInheritanceFromContact(contact, dbKey)),
    ORG_LABEL,
    contact,
    "provider",
    4,
    scopeOpts,
  );
  const facilityKeys = new Set(facilityBullets.map((b) => b.dbKey));
  const providerBullets = [...inheritanceBullets, ...providerOnlyBullets]
    .filter(
      (b) =>
        !isOrganizationIntelligenceDbKey(b.dbKey) ||
        readOrganizationInheritanceFromContact(contact, b.dbKey) ||
        !facilityKeys.has(b.dbKey),
    )
    .slice(0, maxProvider);

  return {
    facility: {
      title: PROVIDER_FIELD_OPS_SECTION.facilityEnvironment,
      subtitle: orgName,
      inheritanceLine: PROVIDER_FIELD_OPS_SECTION.facilityScopeMeta,
      bullets: facilityBullets,
      emptyHint: "Workflow intelligence developing — capture on next touch.",
    },
    provider: {
      title: PROVIDER_FIELD_OPS_SECTION.providerWorkflow,
      subtitle: providerName,
      inheritanceLine: PROVIDER_FIELD_OPS_SECTION.providerScopeMeta,
      bullets: providerBullets,
      emptyHint: "Workflow intelligence developing — capture on next touch.",
    },
  };
}
