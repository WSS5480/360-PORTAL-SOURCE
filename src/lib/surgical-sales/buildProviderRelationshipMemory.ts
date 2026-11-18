import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export const RELATIONSHIP_MEMORY_MAX = 6;
const MEMORY_TEXT_MAX = 140;
const MIN_MEANINGFUL_LEN = 12;

export type ProviderRelationshipMemoryItem = {
  id: string;
  text: string;
  at: string | null;
  ageLabel: string | null;
  source: "engagement" | "prep" | "intelligence" | "activity" | "note";
};

type MemoryCandidate = ProviderRelationshipMemoryItem & {
  priority: number;
  dedupeKey: string;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function truncateRelationshipMemoryText(text: string, max = MEMORY_TEXT_MAX): string {
  const t = normalizeWhitespace(text);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function firstMeaningfulLine(raw: unknown): string | null {
  const text = trimOrNull(raw);
  if (!text) return null;
  const line = normalizeWhitespace(
    text
      .split(/\n+/)
      .map((l) => l.replace(/^[\s•\-–—*]+/, "").trim())
      .find((l) => l.length >= MIN_MEANINGFUL_LEN) || text,
  );
  if (line.length < MIN_MEANINGFUL_LEN) return null;
  const sentence = line.split(/(?<=[.!?])\s+/)[0] || line;
  return truncateRelationshipMemoryText(sentence);
}

function isAuditOrSystemPhrase(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < MIN_MEANINGFUL_LEN) return true;
  const lower = t.toLowerCase();
  if (/^[a-z][a-z0-9_]*$/.test(t) && t.includes("_")) return true;
  return (
    /\bengagement created\b/.test(lower) ||
    /\bmarked completed\b/.test(lower) ||
    /\bactivity recorded\b/.test(lower) ||
    /\bworkflow field updated\b/.test(lower) ||
    /\bprovider updated\b/.test(lower) ||
    /\bplanning section completed\b/.test(lower) ||
    lower === "clinical discovery updated"
  );
}

function stripLeadingFiller(text: string): string {
  return text
    .replace(/^(they|surgeon|provider|he|she)\s+(said|mentioned|noted|raised|asked|requested)\s+/i, "")
    .replace(/^(about|that|regarding)\s+/i, "")
    .trim();
}

export function classifyRelationshipMemoryPhrase(text: string): string {
  const t = normalizeWhitespace(text);
  if (!t) return "";
  if (/^(last discussed|concern raised|requested|interested in|noted|captured|planned focus):/i.test(t)) {
    return truncateRelationshipMemoryText(t);
  }

  const body = stripLeadingFiller(t);
  if (/\b(concern|worried|pushback|skeptic|cost|price|variability|budget|margin|reimburse|expensive)\b/i.test(t)) {
    return truncateRelationshipMemoryText(`Concern raised about ${body}`);
  }
  if (/\b(requested|asked for|committee|observation scheduled|or observation|observe in)\b/i.test(t)) {
    return truncateRelationshipMemoryText(`Requested ${body}`);
  }
  if (/\b(discussed|talked about|reviewed|focused on|walked through|covered)\b/i.test(t)) {
    return truncateRelationshipMemoryText(`Last discussed: ${body}`);
  }
  if (
    /\b(interested|wants to|looking at|explore)\b/i.test(t) ||
    /\b(improve|efficiency).{0,40}\bworkflow\b/i.test(t) ||
    /\bworkflow\s+efficiency\b/i.test(t)
  ) {
    return truncateRelationshipMemoryText(`Interested in ${body}`);
  }
  return truncateRelationshipMemoryText(`Noted: ${t}`);
}

function dedupeKey(text: string): string {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 80);
}

function parseAt(raw: unknown): string | null {
  const t = trimOrNull(raw);
  if (!t) return null;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? t : null;
}

export function formatRelationshipMemoryAge(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function engagementTimestamp(e: ProviderEngagementSummary): string | null {
  return (
    parseAt(e.updated_at) ||
    parseAt(e.prepared_at) ||
    parseAt(e.scheduled_at) ||
    parseAt(e.engagement_date)
  );
}

function pushCandidate(list: MemoryCandidate[], candidate: Omit<MemoryCandidate, "ageLabel">): void {
  const text = normalizeWhitespace(candidate.text);
  if (!text || isAuditOrSystemPhrase(text)) return;
  const key = candidate.dedupeKey || dedupeKey(text);
  if (list.some((c) => c.dedupeKey === key)) return;
  list.push({
    ...candidate,
    text,
    dedupeKey: key,
    ageLabel: formatRelationshipMemoryAge(candidate.at),
  });
}

function collectFromEngagements(engagements: ProviderEngagementSummary[]): MemoryCandidate[] {
  const out: MemoryCandidate[] = [];
  for (const e of engagements) {
    const at = engagementTimestamp(e);
    const notes = trimOrNull(e.notes);
    if (notes && !isAuditOrSystemPhrase(notes)) {
      pushCandidate(out, {
        id: `eng-notes-${e.id}`,
        text: classifyRelationshipMemoryPhrase(notes),
        at,
        source: "engagement",
        priority: String(e.status || "").toLowerCase() === "completed" ? 88 : 82,
        dedupeKey: "",
      });
    }

    const prep = trimOrNull(e.memory_context_line);
    if (prep && !isAuditOrSystemPhrase(prep)) {
      const phrase = classifyRelationshipMemoryPhrase(prep);
      const text = /^noted:/i.test(phrase) ? truncateRelationshipMemoryText(`Planned focus: ${prep}`) : phrase;
      pushCandidate(out, {
        id: `eng-prep-${e.id}`,
        text,
        at: parseAt(e.prepared_at) || at,
        source: "prep",
        priority: e.prepared_at ? 86 : 78,
        dedupeKey: "",
      });
    }
  }
  return out;
}

function collectFromDiscovery(
  answers: ProviderClinicalDiscoveryAnswer[],
): MemoryCandidate[] {
  const out: MemoryCandidate[] = [];
  const sorted = [...answers].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt).getTime();
    const tb = new Date(b.updatedAt || b.createdAt).getTime();
    return tb - ta;
  });

  for (const a of sorted) {
    const response = trimOrNull(a.response);
    if (!response || isAuditOrSystemPhrase(response)) continue;
    const label = trimOrNull(a.questionLabel) || "Intelligence";
    const snippet = truncateRelationshipMemoryText(response, 100);
    pushCandidate(out, {
      id: `discovery-${a.id}`,
      text: truncateRelationshipMemoryText(`Captured — ${label}: ${snippet}`),
      at: parseAt(a.updatedAt || a.createdAt),
      source: "intelligence",
      priority: 76,
      dedupeKey: "",
    });
  }
  return out;
}

function collectFromTimeline(timeline: Array<Record<string, unknown>>): MemoryCandidate[] {
  const out: MemoryCandidate[] = [];
  for (const row of timeline) {
    const at = parseAt(row.at);
    const category = String(row.category || "").toLowerCase();
    const rawType = String(row.activity_type || "").toLowerCase();
    const questionLabel = trimOrNull(row.question_label);
    const body = trimOrNull(row.body);
    const summary = trimOrNull(row.summary);
    const textRaw = questionLabel || body || summary;
    if (!textRaw || isAuditOrSystemPhrase(textRaw)) continue;

    if (category === "discovery" || rawType.includes("clinical_discovery") || rawType.includes("discovery")) {
      const snippet = truncateRelationshipMemoryText(textRaw, 100);
      pushCandidate(out, {
        id: `timeline-discovery-${String(row.id || at || snippet)}`,
        text: truncateRelationshipMemoryText(`Captured — ${snippet}`),
        at,
        source: "intelligence",
        priority: 72,
        dedupeKey: "",
      });
      continue;
    }

    if (rawType.includes("observation") && body) {
      pushCandidate(out, {
        id: `timeline-obs-${String(row.id || at)}`,
        text: classifyRelationshipMemoryPhrase(body),
        at,
        source: "activity",
        priority: 74,
        dedupeKey: "",
      });
      continue;
    }

    if (body && body.length >= MIN_MEANINGFUL_LEN && !rawType.includes("status_change")) {
      pushCandidate(out, {
        id: `timeline-body-${String(row.id || at)}`,
        text: classifyRelationshipMemoryPhrase(body),
        at,
        source: "activity",
        priority: 64,
        dedupeKey: "",
      });
    }
  }
  return out;
}

function collectFromContactNotes(contact: Record<string, unknown>): MemoryCandidate[] {
  const out: MemoryCandidate[] = [];
  for (const key of ["notes", "relationship_notes", "access_notes"]) {
    const text = trimOrNull(contact[key]);
    if (!text || isAuditOrSystemPhrase(text)) continue;
    pushCandidate(out, {
      id: `contact-${key}`,
      text: classifyRelationshipMemoryPhrase(text),
      at: parseAt(contact.updated_at),
      source: "note",
      priority: 58,
      dedupeKey: "",
    });
  }
  return out;
}

export function buildProviderRelationshipMemory(input: {
  contact?: Record<string, unknown> | null;
  engagements?: ProviderEngagementSummary[];
  clinical_discovery_answers?: ProviderClinicalDiscoveryAnswer[];
  activity_timeline?: Array<Record<string, unknown>>;
}): ProviderRelationshipMemoryItem[] {
  const engagements = input.engagements || [];
  const timeline = input.activity_timeline || [];
  const candidates: MemoryCandidate[] = [
    ...collectFromEngagements(engagements),
    ...collectFromTimeline(timeline),
  ];

  if (input.contact) {
    candidates.push(...collectFromContactNotes(input.contact));
  }

  candidates.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return b.priority - a.priority;
  });

  return candidates.slice(0, RELATIONSHIP_MEMORY_MAX).map(({ id, text, at, ageLabel, source }) => ({
    id,
    text,
    at,
    ageLabel,
    source,
  }));
}
