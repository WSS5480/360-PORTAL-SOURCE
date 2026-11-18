/**
 * Semantic aggregation for provider dossier facts — merge near-duplicate observations
 * and surface observation counts instead of repeating the same concept.
 */

import {
  buildCanonicalConceptKey,
  conceptsMatch,
  normalizeConceptText,
  type CanonicalFindingKeyInput,
} from "@/lib/surgical-sales/canonicalFindingIdentity";

export type ProviderDossierGroupId =
  | "workflow"
  | "products"
  | "friction"
  | "people-access";

export type AggregatableDossierItem = {
  id: string;
  text: string;
  detail?: string | null;
  observationCount?: number;
  evidenceItems?: AggregatableDossierItem[];
  [key: string]: unknown;
};

const PROCEDURE_ANCHOR_PATTERNS = [
  /\brobotic\s+(?:ventral\s+(?:and\s+)?incisional\s+)?hernia(?:\s+repair)?\b/i,
  /\b(?:ventral|incisional|inguinal|umbilical|abdominal\s+wall)\s+hernia(?:\s+repair)?\b/i,
  /\brobotic\s+[a-z][a-z\s-]{2,48}\b/i,
  /\b[a-z]+\s+(?:hernia|arthroplasty|reconstruction|cholecystectomy|colectomy|gastrectomy)\b/i,
  /\babdominal\s+wall\s+reconstruction\b/i,
];

function cleanDossierLabel(text: string): string {
  return text.replace(/[.!?]+$/, "").trim();
}

function extractProcedureAnchor(text: string): string | null {
  for (const pattern of PROCEDURE_ANCHOR_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      const normalized = normalizeConceptText(match[0]);
      if (normalized) return normalized;
    }
  }
  return null;
}

function inferDossierSignalType(text: string, groupId: ProviderDossierGroupId): CanonicalFindingKeyInput["type"] {
  const cleaned = cleanDossierLabel(text);
  if (groupId === "products" || /^current product:/i.test(cleaned) || /^competitor product/i.test(cleaned)) {
    return "observed_product";
  }
  if (groupId === "friction" || /challenge|friction|pain|delay|pooled|tight|visualization|fixation|suction|setup|bottleneck/i.test(cleaned)) {
    return "provider_pain_point";
  }
  if (groupId === "people-access" || /scheduler|credential|coordinator|contact|access|approval/i.test(cleaned)) {
    return "scheduling_contact";
  }
  if (/volume|increasing|trend|more .* than|higher volume|growing part|higher volume/i.test(cleaned)) {
    return "procedure_volume_trend";
  }
  if (/repair|procedure|focus|doing more|perform/i.test(cleaned)) {
    return "procedure_type";
  }
  return "workflow_signal";
}

export function dossierTextToKeyInput(text: string, groupId: ProviderDossierGroupId): CanonicalFindingKeyInput {
  const cleaned = cleanDossierLabel(text);
  const type = inferDossierSignalType(cleaned, groupId);
  const procedureContext = extractProcedureAnchor(cleaned);
  const normalizedFindingId = normalizeConceptText(cleaned).replace(/\s+/g, "_") || "dossier_fact";

  if (type === "observed_product") {
    const product = cleaned
      .replace(/^current product:\s*/i, "")
      .replace(/^competitor product:\s*/i, "")
      .replace(/^product preference centers on\s+/i, "")
      .trim();
    return {
      type,
      label: cleaned,
      normalizedFindingId: product ? `product_in_use:${product.replace(/\s+/g, "_")}` : normalizedFindingId,
      productContext: product || null,
    };
  }

  return {
    type,
    label: cleaned,
    normalizedFindingId,
    procedureContext,
  };
}

export function dossierConceptKey(text: string, groupId: ProviderDossierGroupId): string {
  return buildCanonicalConceptKey(dossierTextToKeyInput(text, groupId));
}

function procedureAnchorsOverlap(left: string, right: string): boolean {
  const leftAnchor = extractProcedureAnchor(left);
  const rightAnchor = extractProcedureAnchor(right);
  if (!leftAnchor || !rightAnchor) return false;
  return conceptsMatch(leftAnchor, rightAnchor);
}

function labelsShouldMerge(left: string, right: string, groupId: ProviderDossierGroupId): boolean {
  const leftClean = normalizeConceptText(cleanDossierLabel(left));
  const rightClean = normalizeConceptText(cleanDossierLabel(right));
  if (!leftClean || !rightClean) return false;
  if (leftClean === rightClean) return true;
  if (conceptsMatch(leftClean, rightClean)) return true;
  if (leftClean.includes(rightClean) || rightClean.includes(leftClean)) return true;

  if (groupId === "workflow" && procedureAnchorsOverlap(left, right)) {
    return true;
  }

  if (groupId === "workflow") {
    const leftVolume = /\b(?:volume|increasing|trend|growing)\b/i.test(left);
    const rightVolume = /\b(?:volume|increasing|trend|growing)\b/i.test(right);
    const leftProcedure = extractProcedureAnchor(left);
    const rightProcedure = extractProcedureAnchor(right);
    if (leftVolume && rightProcedure && (rightVolume || !leftProcedure)) return true;
    if (rightVolume && leftProcedure && (leftVolume || !rightProcedure)) return true;
  }

  if (groupId === "friction") {
    const leftPain = leftClean.replace(/\b(challenge|friction|issue|problem)\b/g, " ").trim();
    const rightPain = rightClean.replace(/\b(challenge|friction|issue|problem)\b/g, " ").trim();
    if (leftPain && rightPain && conceptsMatch(leftPain, rightPain)) return true;
  }

  return false;
}

function countDossierObservations(item: AggregatableDossierItem): number {
  if (item.evidenceItems?.length) {
    return item.evidenceItems.reduce((total, child) => total + countDossierObservations(child), 0);
  }
  return 1;
}

export function pickPreferredDossierLabel(left: string, right: string): string {
  const leftTrim = cleanDossierLabel(left);
  const rightTrim = cleanDossierLabel(right);
  if (!leftTrim) return rightTrim.endsWith(".") ? rightTrim : `${rightTrim}.`;
  if (!rightTrim) return leftTrim.endsWith(".") ? leftTrim : `${leftTrim}.`;

  const leftScore =
    leftTrim.length +
    (/\b(?:increasing|volume|repair|current|product)\b/i.test(leftTrim) ? 12 : 0) +
    (extractProcedureAnchor(leftTrim) ? 16 : 0);
  const rightScore =
    rightTrim.length +
    (/\b(?:increasing|volume|repair|current|product)\b/i.test(rightTrim) ? 12 : 0) +
    (extractProcedureAnchor(rightTrim) ? 16 : 0);

  const winner = rightScore > leftScore ? rightTrim : leftTrim;
  return winner.endsWith(".") ? winner : `${winner}.`;
}

function mergeDossierItems(
  existing: AggregatableDossierItem,
  incoming: AggregatableDossierItem,
  groupId: ProviderDossierGroupId,
): AggregatableDossierItem {
  const existingLeaves = existing.evidenceItems?.length
    ? existing.evidenceItems
    : [{ ...existing, evidenceItems: undefined }];
  const incomingLeaf = { ...incoming, evidenceItems: undefined, detail: null };

  return {
    ...existing,
    text: pickPreferredDossierLabel(existing.text, incoming.text),
    detail: existing.detail ?? incoming.detail ?? null,
    evidenceItems: [...existingLeaves, incomingLeaf],
    observationCount: countDossierObservations({
      ...existing,
      evidenceItems: [...existingLeaves, incomingLeaf],
    }),
  };
}

export function formatDossierObservationCount(count: number): string | null {
  const value = Math.max(0, count);
  if (value <= 1) return null;
  return `${value} observations`;
}

export function aggregateProviderDossierItems<T extends AggregatableDossierItem>(
  items: T[],
  groupId: ProviderDossierGroupId,
): Array<T & { observationCount: number }> {
  const merged: Array<T & { observationCount: number }> = [];

  for (const item of items) {
    const matchIndex = merged.findIndex((candidate) =>
      labelsShouldMerge(candidate.text, item.text, groupId),
    );

    if (matchIndex >= 0) {
      const combined = mergeDossierItems(merged[matchIndex]!, item, groupId) as T & { observationCount: number };
      merged[matchIndex] = combined;
      continue;
    }

    merged.push({
      ...item,
      observationCount: countDossierObservations(item),
    });
  }

  return merged.map((item) => ({
    ...item,
    observationCount: countDossierObservations(item),
  }));
}

export function findDossierAggregationBucketKey(input: {
  groupId: ProviderDossierGroupId;
  text: string;
  buckets: Map<string, AggregatableDossierItem>;
}): string | null {
  const conceptKey = dossierConceptKey(input.text, input.groupId);
  const exactKey = `${input.groupId}:${conceptKey}`;
  if (input.buckets.has(exactKey)) return exactKey;

  for (const [key, item] of input.buckets) {
    if (!key.startsWith(`${input.groupId}:`)) continue;
    if (labelsShouldMerge(item.text, input.text, input.groupId)) return key;
  }

  return null;
}

export function dossierAggregationBucketKey(groupId: ProviderDossierGroupId, text: string): string {
  return `${groupId}:${dossierConceptKey(text, groupId)}`;
}
