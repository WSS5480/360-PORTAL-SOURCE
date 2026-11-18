import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import type { PrepareRecentActivityFeed } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";

export type IntroCallKnownInfoRow = {
  id: "hospital" | "specialty" | "workflow_notes" | "support_contacts" | "previous_outcomes";
  label: string;
  value: string | null;
};

const WORKFLOW_BULLET_KEYS = new Set(["procedural_preferences", "or_dynamics"]);
const CONTACT_PATTERN = /coordinator|contact|scheduling owner|office manager|gatekeeper/i;

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function bulletLine(label: string, value: string): string {
  return value.toLowerCase().includes(label.toLowerCase()) ? value : `${label}: ${value}`;
}

export function buildIntroCallFieldBriefingKnownInfo(input: {
  organizationName: string | null;
  locationLabel: string | null;
  specialty: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  recentActivity: PrepareRecentActivityFeed;
  lastEngagementTitle: string | null;
  lastEngagementDateLabel: string | null;
}): IntroCallKnownInfoRow[] {
  const hospitalParts = [input.organizationName, input.locationLabel].filter(Boolean);
  const hospital = hospitalParts.length > 0 ? hospitalParts.join(" · ") : null;

  const workflowNotes = input.knownIntelligence.bullets
    .filter(
      (b) =>
        WORKFLOW_BULLET_KEYS.has(b.key) ||
        /workflow|procedure|technique|or dynamic/i.test(`${b.label} ${b.value}`),
    )
    .map((b) => bulletLine(b.label, b.value))
    .join(" · ");

  const contactLines = input.knownIntelligence.bullets
    .filter(
      (b) =>
        b.key === "communication" ||
        b.key === "relationship_strategy" ||
        CONTACT_PATTERN.test(`${b.label} ${b.value}`),
    )
    .map((b) => bulletLine(b.label, b.value));

  const previousParts: string[] = [];
  const lastTitle = trimOrNull(input.lastEngagementTitle);
  const lastDate = trimOrNull(input.lastEngagementDateLabel);
  if (lastTitle) {
    previousParts.push(lastDate ? `${lastTitle} · ${lastDate}` : lastTitle);
  }
  for (const item of input.recentActivity.items.slice(0, 2)) {
    const summary = trimOrNull(item.summary);
    if (summary) previousParts.push(`${item.title}: ${summary}`);
  }
  const insight = input.knownIntelligence.last_key_insight?.body?.trim();
  if (insight) previousParts.push(insight);

  return [
    { id: "hospital", label: "Hospital", value: hospital },
    { id: "specialty", label: "Specialty", value: trimOrNull(input.specialty) },
    { id: "workflow_notes", label: "Workflow notes", value: trimOrNull(workflowNotes) },
    { id: "support_contacts", label: "Support contacts", value: contactLines.length ? contactLines.join(" · ") : null },
    { id: "previous_outcomes", label: "Previous outcomes", value: previousParts.length ? previousParts.join(" · ") : null },
  ];
}

export function introCallKnownInfoHasContent(rows: IntroCallKnownInfoRow[]): boolean {
  return rows.some((row) => Boolean(row.value?.trim()));
}
