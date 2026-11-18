/**
 * Debrief / log-update extraction context — shared types and prompt formatters (client-safe).
 * Server loaders live in loadDebriefIntelligenceExtractionContext.ts.
 */

import type { DiscoveryOpenQuestionRow } from "@/lib/surgical-sales/discoveryIntelligenceOpenQuestions";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type { CredentialingPlatformRecord } from "@/lib/surgical-sales/credentialingPlatforms";
import { workflowResponsibilityLabel } from "@/lib/surgical-sales/operationalSupportContact";
import { SUPPORT_CONTACT_INFO_NEEDED_LABEL } from "@/lib/surgical-sales/debriefDetectedContact";

export { SUPPORT_CONTACT_INFO_NEEDED_LABEL };

export type DebriefSupportContactSummary = {
  contactId: string;
  name: string;
  contactType: string | null;
  workflowRole: string | null;
  ownershipType: string | null;
  contactDetailsMissing: boolean;
};

export type DebriefIntelligenceSignalSnapshot = {
  signalId: DiscoveryStructuredSignalId;
  statusLabel: string;
  label: string;
};

export type DebriefIntelligenceExtractionContext = {
  pathwayStageId: string;
  pathwayStageLabel: string;
  discoveryReadinessPercent: number;
  openQuestions: DiscoveryOpenQuestionRow[];
  signalStatuses: DebriefIntelligenceSignalSnapshot[];
  supportContacts: DebriefSupportContactSummary[];
  credentialingPlatforms: CredentialingPlatformRecord[];
  providerPlatformName: string | null;
  upcomingEngagements: Array<{ id: string; label: string; scheduledAt: string | null }>;
  pastEngagements: Array<{ id: string; label: string; scheduledAt: string | null }>;
  productFocus: string | null;
  notesHistory: string[];
};

/** Smaller prompt block for debrief analyze (less tokens → faster model response). */
export function formatDebriefExtractionContextForPromptCompact(
  ctx: DebriefIntelligenceExtractionContext,
): string {
  const lines: string[] = [
    `Pathway: ${ctx.pathwayStageLabel}`,
    `Readiness: ${ctx.discoveryReadinessPercent}%`,
  ];
  if (ctx.productFocus) lines.push(`Product: ${ctx.productFocus}`);
  if (ctx.providerPlatformName) lines.push(`Credentialing on file: ${ctx.providerPlatformName}`);

  if (ctx.openQuestions.length) {
    lines.push("", "Open questions:");
    for (const q of ctx.openQuestions.slice(0, 8)) {
      lines.push(`- ${q.label}`);
    }
  }

  if (ctx.supportContacts.length) {
    lines.push("", "Known contacts:");
    for (const c of ctx.supportContacts.slice(0, 5)) {
      const role = c.workflowRole ? workflowResponsibilityLabel(c.workflowRole) : c.contactType;
      lines.push(`- ${c.name}${role ? ` (${role})` : ""}`);
    }
  }

  return lines.join("\n");
}

export function formatDebriefExtractionContextForPrompt(
  ctx: DebriefIntelligenceExtractionContext,
): string {
  const lines: string[] = [
    `Pathway stage: ${ctx.pathwayStageLabel} (${ctx.pathwayStageId})`,
    `Discovery readiness: ${ctx.discoveryReadinessPercent}%`,
  ];

  if (ctx.productFocus) lines.push(`Product in focus: ${ctx.productFocus}`);

  if (ctx.openQuestions.length) {
    lines.push("", "Open intelligence questions (prioritize answers in the note):");
    for (const q of ctx.openQuestions) {
      lines.push(`- [${q.signalId}] ${q.label}`);
    }
  }

  if (ctx.signalStatuses.length) {
    lines.push("", "Current intelligence signal statuses:");
    for (const s of ctx.signalStatuses) {
      lines.push(`- ${s.label}: ${s.statusLabel}`);
    }
  }

  if (ctx.supportContacts.length) {
    lines.push("", "Known support contacts:");
    for (const c of ctx.supportContacts.slice(0, 8)) {
      const role = c.workflowRole ? workflowResponsibilityLabel(c.workflowRole) : c.contactType;
      const badge = c.contactDetailsMissing ? ` · ${SUPPORT_CONTACT_INFO_NEEDED_LABEL}` : "";
      lines.push(`- ${c.name}${role ? ` (${role})` : ""}${badge}`);
    }
  }

  if (ctx.providerPlatformName || ctx.credentialingPlatforms.length) {
    lines.push("", "Credentialing / vendor access:");
    if (ctx.providerPlatformName) lines.push(`- On file: ${ctx.providerPlatformName}`);
    const catalog = ctx.credentialingPlatforms
      .slice(0, 12)
      .map((p) => p.name)
      .join(", ");
    if (catalog) lines.push(`- Catalog: ${catalog}`);
  }

  if (ctx.upcomingEngagements.length || ctx.pastEngagements.length) {
    lines.push("", "Engagements:");
    for (const e of ctx.upcomingEngagements) {
      lines.push(`- Upcoming: ${e.label}`);
    }
    for (const e of ctx.pastEngagements) {
      lines.push(`- Past: ${e.label}`);
    }
  }

  if (ctx.notesHistory.length) {
    lines.push("", "Recent notes / debrief history:");
    for (const n of ctx.notesHistory) {
      lines.push(`- ${n.slice(0, 280)}`);
    }
  }

  return lines.join("\n");
}
