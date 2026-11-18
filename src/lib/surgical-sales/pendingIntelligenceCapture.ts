/**
 * Pending intelligence suggestions — quick-capture extractions awaiting rep review.
 * Stored on provider_commercial_intelligence.pending_intelligence_captures (JSONB).
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import type {
  DebriefContactDisposition,
  DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  emptyProviderCommercialIntelligence,
  PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY,
  readProviderCommercialIntelligence,
  type ProviderCommercialIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

export const PENDING_INTELLIGENCE_CAPTURE_STATUS = ["pending", "dismissed"] as const;
export type PendingIntelligenceCaptureStatus = (typeof PENDING_INTELLIGENCE_CAPTURE_STATUS)[number];

export type PendingIntelligenceCapture = {
  id: string;
  source_text: string;
  parse_result: LogUpdateParseResult;
  proposed_contacts: DebriefProposedContactItem[];
  discovery_context: DebriefIntelligenceExtractionContext | null;
  suggestion_count: number;
  suggestion_labels: string[];
  created_at: string;
  created_by_user_id: string;
  status: PendingIntelligenceCaptureStatus;
  capture_surface: string | null;
  source_engagement_id: string | null;
  /** Persisted UF capture — hydrate review when inline runs are absent. */
  universal_fact_capture_id?: string | null;
};

export type ProviderCommercialIntelligenceWithPending = ProviderCommercialIntelligence & {
  pending_intelligence_captures: PendingIntelligenceCapture[];
};

const MAX_PENDING_CAPTURES = 20;

export function parsePendingIntelligenceCapture(raw: unknown): PendingIntelligenceCapture | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const source_text = String(row.source_text ?? "").trim();
  const parse_result = row.parse_result as LogUpdateParseResult | undefined;
  if (!source_text || !parse_result || typeof parse_result !== "object") return null;
  const status = String(row.status ?? "pending").trim() as PendingIntelligenceCaptureStatus;
  return {
    id: String(row.id ?? "").trim() || `pic-${Date.now()}`,
    source_text,
    parse_result,
    proposed_contacts: Array.isArray(row.proposed_contacts)
      ? (row.proposed_contacts as DebriefProposedContactItem[])
      : [],
    discovery_context: (row.discovery_context as DebriefIntelligenceExtractionContext | null) ?? null,
    suggestion_count: Math.max(0, Number(row.suggestion_count ?? 0) || 0),
    suggestion_labels: Array.isArray(row.suggestion_labels)
      ? row.suggestion_labels.map((label) => String(label).trim()).filter(Boolean)
      : [],
    created_at: String(row.created_at ?? new Date().toISOString()),
    created_by_user_id: String(row.created_by_user_id ?? "").trim(),
    status: status === "dismissed" ? "dismissed" : "pending",
    capture_surface: row.capture_surface != null ? String(row.capture_surface).trim() || null : null,
    source_engagement_id:
      row.source_engagement_id != null ? String(row.source_engagement_id).trim() || null : null,
    universal_fact_capture_id:
      row.universal_fact_capture_id != null
        ? String(row.universal_fact_capture_id).trim() || null
        : null,
  };
}

export function readPendingIntelligenceCaptures(
  contact: Record<string, unknown>,
): PendingIntelligenceCapture[] {
  const raw = contact[PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const row = raw as Record<string, unknown>;
  if (!Array.isArray(row.pending_intelligence_captures)) return [];
  return row.pending_intelligence_captures
    .map(parsePendingIntelligenceCapture)
    .filter((capture): capture is PendingIntelligenceCapture => capture != null)
    .filter((capture) => capture.status === "pending");
}

export function countPendingIntelligenceSuggestions(contact: Record<string, unknown>): number {
  return readPendingIntelligenceCaptures(contact).reduce(
    (sum, capture) => sum + capture.suggestion_count,
    0,
  );
}

/** Quick Capture contacts stay suggestions until the rep reviews (Create / Link / Dismiss). */
export function proposedContactsForPendingStorage(
  contacts: DebriefProposedContactItem[],
): DebriefProposedContactItem[] {
  return contacts.map((contact) => {
    if (contact.disposition === "skipped") {
      return contact;
    }
    return {
      ...contact,
      disposition: "pending" as DebriefContactDisposition,
      linkedContactId: "",
    };
  });
}

export function pendingSuggestionCount(input: {
  suggestionCount: number;
  proposedContacts: DebriefProposedContactItem[];
}): number {
  const activeContacts = input.proposedContacts.filter(
    (contact) => contact.disposition !== "skipped",
  ).length;
  return Math.max(input.suggestionCount, activeContacts);
}

/** Strip auto-accept flags — pending items require explicit review later. */
export function parseResultForPendingStorage(parse: LogUpdateParseResult): LogUpdateParseResult {
  return {
    ...parse,
    saveAsNoteAccepted: true,
    fieldUpdates: parse.fieldUpdates.map((update) => ({ ...update, accepted: false })),
    suggestedUpdates: parse.suggestedUpdates.map((update) => ({ ...update, accepted: false })),
  };
}

export function countIntelligenceSuggestionsFromParse(input: {
  parse: LogUpdateParseResult;
  proposedContacts?: DebriefProposedContactItem[];
  providerContact?: Record<string, unknown> | null;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
}): { count: number; labels: string[] } {
  const composed = composeDebriefReviewDisplay({
    dictation: input.parse.sourceText,
    logUpdate: input.parse,
    debriefRuns: input.parse.debriefUniversalFactsRuns,
    discoveryContext: input.discoveryContext ?? null,
    providerContact: input.providerContact ?? null,
    proposedContacts: input.proposedContacts ?? [],
    guardContext: buildDebriefReviewDecisionContext({
      providerContact: input.providerContact ?? null,
      discoveryContext: input.discoveryContext ?? null,
    }),
  });
  const cards = composed.actionableCards;
  if (cards.length > 0) {
    const labels = cards.map((card) => card.headline.trim()).filter(Boolean);
    return { count: cards.length, labels: [...new Set(labels)].slice(0, 12) };
  }

  const fieldCount = input.parse.fieldUpdates.filter((field) => field.proposedValue.trim()).length;
  const contactCount = (input.proposedContacts ?? []).filter(
    (contact) => contact.disposition !== "skipped",
  ).length;
  const labels = [
    ...input.parse.fieldUpdates
      .filter((field) => field.proposedValue.trim())
      .map((field) => field.label.trim() || "Intelligence update"),
    ...(input.proposedContacts ?? [])
      .filter((contact) => contact.displayName.trim())
      .map((contact) => `${contact.displayName.trim()} detected`),
  ].filter(Boolean);

  return {
    count: fieldCount + contactCount,
    labels: [...new Set(labels)].slice(0, 12),
  };
}

function serializeCommercialIntelligenceWithPending(
  base: ProviderCommercialIntelligence | null,
  pendingCaptures: PendingIntelligenceCapture[],
): Record<string, unknown> {
  const intel = base ?? emptyProviderCommercialIntelligence();
  return {
    ...intel,
    pending_intelligence_captures: pendingCaptures,
    updated_at: new Date().toISOString(),
  };
}

export async function appendPendingIntelligenceCapture(input: {
  providerId: string;
  capture: PendingIntelligenceCapture;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (loadErr || !existing) {
    return { ok: false, message: loadErr?.message || "Provider not found." };
  }

  const commercial = readProviderCommercialIntelligence(existing as Record<string, unknown>);
  const currentPending = readPendingIntelligenceCaptures(existing as Record<string, unknown>);
  const nextPending = [input.capture, ...currentPending.filter((row) => row.id !== input.capture.id)].slice(
    0,
    MAX_PENDING_CAPTURES,
  );

  const patch = {
    updated_at: new Date().toISOString(),
    [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: serializeCommercialIntelligenceWithPending(
      commercial,
      nextPending,
    ),
  };

  const { error: updateErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", input.providerId);
  if (updateErr) return { ok: false, message: updateErr.message };
  return { ok: true };
}

export async function removePendingIntelligenceCapture(input: {
  providerId: string;
  captureId: string;
  dismiss?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (loadErr || !existing) {
    return { ok: false, message: loadErr?.message || "Provider not found." };
  }

  const commercial = readProviderCommercialIntelligence(existing as Record<string, unknown>);
  const currentPending = readPendingIntelligenceCaptures(existing as Record<string, unknown>);
  const nextPending = input.dismiss
    ? currentPending.map((capture) =>
        capture.id === input.captureId ? { ...capture, status: "dismissed" as const } : capture,
      )
    : currentPending.filter((capture) => capture.id !== input.captureId);

  const patch = {
    updated_at: new Date().toISOString(),
    [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: serializeCommercialIntelligenceWithPending(
      commercial,
      nextPending,
    ),
  };

  const { error: updateErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", input.providerId);
  if (updateErr) return { ok: false, message: updateErr.message };
  return { ok: true };
}
