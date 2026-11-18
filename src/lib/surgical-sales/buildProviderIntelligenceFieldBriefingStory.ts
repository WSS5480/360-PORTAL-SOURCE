/**
 * Provider Intelligence tab — natural-language field briefing prose (deterministic).
 */

import type { ProviderIntelligenceReferenceView } from "@/lib/surgical-sales/buildProviderIntelligenceReferenceView";
import type { ProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import type { NormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { productNeedsConfirmation } from "@/lib/surgical-sales/buildProviderIntelligenceFieldEvidenceCards";
import {
  buildCaseIntelligenceBriefLead,
  type ProviderCaseIntelligenceRollup,
} from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { schedulingOwnerDisplayLine } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function providerFirstName(contact: Record<string, unknown>): string {
  const first = String(contact.first_name ?? "").trim();
  if (first) return first;
  const full = contactDisplayName(contact);
  return full.split(/\s+/)[0] || "This provider";
}

function parsePersonName(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const head = trimmed.split(/[—–-]/)[0]?.trim() ?? "";
  if (!head || /referenced|unknown|missing|not yet|contact info/i.test(head)) return null;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(head)) return head;
  return null;
}

function personNameFromSchedulingLine(line: string): string | null {
  const trimmed = String(line ?? "").trim();
  if (!trimmed) return null;

  const head = trimmed.split("·")[0]?.trim() ?? trimmed;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(head)) return head;
  if (/^[A-Z][a-z]+$/.test(head)) return head;

  return parsePersonName(trimmed);
}

function resolveSchedulerContactName(
  contact: Record<string, unknown>,
  model: ProviderFieldIntelligenceModel,
): string | null {
  const candidates = [
    model.scheduler.primaryLine,
    schedulingOwnerDisplayLine(contact),
    String(contact.provider_observation_coordinator_contact ?? ""),
    String(contact.provider_scheduling_contact ?? ""),
  ];

  for (const candidate of candidates) {
    const name = personNameFromSchedulingLine(String(candidate ?? ""));
    if (name) return name;
  }

  return null;
}

function clinicalFocusParagraph(
  reference: ProviderIntelligenceReferenceView,
  contact: Record<string, unknown>,
): string | null {
  const commercial = readProviderCommercialIntelligence(contact);
  const procedures: string[] = [];
  const seen = new Set<string>();

  const pushProcedure = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const cleaned = trimmed.includes("·") ? trimmed.split("·")[0]?.trim() ?? trimmed : trimmed;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    procedures.push(cleaned);
  };

  for (const item of reference.clinicalSignals.find((group) => group.id === "procedure-focus")?.items ?? []) {
    pushProcedure(item);
  }

  for (const entry of commercial?.clinical.entries ?? []) {
    if (entry.category !== "procedure_focus" && entry.category !== "clinical_trend") continue;
    pushProcedure(entry.procedure_context ?? entry.display_label.split("·")[0]?.trim() ?? entry.display_label);
  }

  const trends = [
    ...(reference.clinicalSignals.find((group) => group.id === "volume-trends")?.items ?? []),
    ...(commercial?.clinical.entries ?? [])
      .filter((entry) => entry.category === "clinical_trend")
      .map((entry) => entry.display_label),
  ].filter(Boolean);

  const increasing = trends.some((trend) => /increas|growing|uptick|more case/i.test(trend));

  if (procedures.length >= 2 && increasing) {
    const [first, second] = procedures;
    return sentence(
      `Clinical activity appears to be increasing in ${first.toLowerCase()} and ${second.toLowerCase()}`,
    );
  }

  const focus = procedures[0];
  if (!focus) return null;

  if (increasing) {
    return sentence(`Clinical activity appears focused on ${focus.toLowerCase()} with increasing procedure volume`);
  }
  return sentence(`Clinical activity appears focused on ${focus.toLowerCase()}`);
}

function accessContextParagraph(
  contact: Record<string, unknown>,
  model: ProviderFieldIntelligenceModel,
  permission: NormalizedObservationPermission,
  name: string,
): string | null {
  const approved =
    permission.stageId === "permission_confirmed" ||
    permission.stageId === "observation_scheduled" ||
    permission.stageId === "observation_completed";

  const schedulerName = resolveSchedulerContactName(contact, model);

  if (approved && schedulerName) {
    return `Observation access is approved, and scheduling is coordinated through ${schedulerName}`;
  }

  if (approved) {
    return `${name} has confirmed observation approval`;
  }

  if (permission.stageId === "interested") {
    return `${name} appears receptive to observation access, but the approval process remains incomplete`;
  }

  if (permission.stageId === "permission_not_yet_confirmed") {
    return `${name} appears open to observation, but approval status has not yet been confirmed`;
  }

  if (model.observationApproval.captureState !== "empty") {
    return permission.label || `${name}'s observation permission is still being clarified`;
  }

  return null;
}

function productIntelligenceParagraph(
  contact: Record<string, unknown>,
  observationRollup?: ProviderCaseIntelligenceRollup | null,
  universalFactsReadModel?: UniversalFactsReadModelPayload | null,
): string | null {
  const productEvidence = observationRollup?.productEvidence;
  if (productEvidence && productEvidence.maturity !== "intro_only") return null;

  const product = productNeedsConfirmation(contact, {
    providerRuns: universalFactsReadModel?.providerRuns,
  });
  if (!product) return null;

  return sentence(
    `${product.productName} was mentioned as a current product, but usage still needs confirmation during observation`,
  );
}

function hasCaseIntelligenceLead(rollup?: ProviderCaseIntelligenceRollup | null): boolean {
  return Boolean(
    rollup?.visible && (rollup.capturedNoteCount > 0 || rollup.completedCount > 0),
  );
}

export function buildProviderIntelligenceFieldBriefingStory(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  permission: NormalizedObservationPermission;
  reference: ProviderIntelligenceReferenceView;
  observationRollup?: ProviderCaseIntelligenceRollup | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): string[] {
  const { contact, model, permission } = input;
  const commercial = readProviderCommercialIntelligence(contact);
  const name = providerFirstName(contact);
  const paragraphs: string[] = [];

  if (hasCaseIntelligenceLead(input.observationRollup)) {
    const caseLead = buildCaseIntelligenceBriefLead(input.observationRollup!);
    if (caseLead) paragraphs.push(sentence(caseLead));

    const accessLine = accessContextParagraph(contact, model, permission, name);
    if (accessLine) paragraphs.push(sentence(accessLine));

    const clinical = clinicalFocusParagraph(input.reference, contact);
    if (clinical) paragraphs.push(clinical);

    return paragraphs.slice(0, 6);
  }

  if (permission.stageId === "permission_confirmed" || permission.stageId === "observation_scheduled") {
    paragraphs.push(sentence(`${name} has confirmed observation approval`));
  } else if (permission.stageId === "interested") {
    paragraphs.push(
      sentence(`${name} appears receptive to observation access, but the approval process remains incomplete`),
    );
  } else if (permission.stageId === "permission_not_yet_confirmed") {
    paragraphs.push(
      sentence(`${name} appears open to observation, but approval status has not yet been confirmed`),
    );
  } else if (model.observationApproval.captureState !== "empty") {
    paragraphs.push(sentence(permission.label || `${name}'s observation permission is still being clarified`));
  }

  const credentialingRequired =
    commercial?.credentialing.credentialing_required === "yes" ||
    model.credentialing.captureState !== "empty";
  if (credentialingRequired) {
    paragraphs.push(
      sentence(
        model.credentialing.isConfirmed
          ? "Credentialing is required and the access path is partially understood"
          : "Credentialing appears necessary before scheduling can occur",
      ),
    );
  }

  if (model.scheduler.captureState === "referenced") {
    const schedulerName = parsePersonName(model.scheduler.primaryLine);
    paragraphs.push(
      sentence(
        schedulerName
          ? `${schedulerName} has been referenced as the likely scheduling contact, but her information has not yet been captured`
          : "A scheduler has been referenced, but contact details have not yet been captured",
      ),
    );
  } else if (model.scheduler.isConfirmed) {
    const schedulerName = parsePersonName(model.scheduler.primaryLine) ?? model.scheduler.primaryLine.trim();
    paragraphs.push(sentence(`Scheduling coordination is handled by ${schedulerName}`));
  }

  const clinical = clinicalFocusParagraph(input.reference, contact);
  if (clinical) paragraphs.push(clinical);

  const productLine = productIntelligenceParagraph(
    contact,
    input.observationRollup,
    input.universalFactsReadModel,
  );
  if (productLine) paragraphs.push(productLine);

  if (
    permission.stageId === "permission_not_yet_confirmed" &&
    !paragraphs.some((p) => /approval|permission/i.test(p))
  ) {
    paragraphs.push(sentence("Observation approval status remains unconfirmed"));
  }

  if (paragraphs.length === 0) {
    return [
      "No field intelligence has been captured for this provider yet. Log an intro call or debrief to start building this briefing.",
    ];
  }

  return paragraphs.slice(0, 6);
}

/** @deprecated use paragraph array from buildProviderIntelligenceFieldBriefingStory */
export function buildProviderIntelligenceFieldBriefingStoryText(
  input: Parameters<typeof buildProviderIntelligenceFieldBriefingStory>[0],
): string {
  return buildProviderIntelligenceFieldBriefingStory(input).join("\n\n");
}
