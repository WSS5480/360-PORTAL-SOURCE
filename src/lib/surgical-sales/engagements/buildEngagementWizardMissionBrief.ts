import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { PreparationReadiness } from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";
import { splitEngagementPrepLines } from "@/lib/surgical-sales/engagements/engagementPrepTextLines";
import {
  buildPathwayImpactItems,
  compressObjectiveToTacticalBullets,
  dedupeMissionItems,
  summarizeAccessRiskLine,
  summarizeAccessToolsLine,
  summarizeDiscoveryPrompt,
  summarizeNextStepLine,
  summarizeOutcomeLine,
  type MissionBriefItem,
  type MissionBriefTag,
} from "@/lib/surgical-sales/engagements/missionBriefReviewPresentation";

export type { MissionBriefItem, MissionBriefTag };

export const MISSION_BRIEF_SECTION_TITLE = {
  objective: "Objective",
  discoveryTargets: "Key discovery targets",
  workflowDiscovery: "Workflow discovery",
  observationDiscovery: "Observation discovery",
  accessRisks: "Access risks",
  toolsMaterials: "Tools / materials",
  unknownsRemaining: "Unknowns remaining",
  pathwayImpact: "Pathway impact",
  expectedOutcome: "Expected outcome",
  nextStep: "Next expected step",
} as const;

export const MISSION_BRIEF_SECTION_SUBTITLE: Partial<Record<MissionBriefSectionId, string>> = {
  objective: "Primary operational goal for this engagement",
  expectedOutcome: "What success looks like",
  nextStep: "Likely action after this engagement",
  pathwayImpact: "What may advance if this engagement goes well",
};

export type MissionBriefGroup = {
  title: string;
  tag?: MissionBriefTag;
  items: MissionBriefItem[];
};

export type MissionBriefSectionId =
  | "objective"
  | "discoveryTargets"
  | "accessSignals"
  | "unknownsRemaining"
  | "pathwayImpact"
  | "expectedOutcome"
  | "nextStep";

export type MissionBriefSection = {
  id: MissionBriefSectionId;
  title: string;
  subtitle?: string;
  tier: "primary" | "standard";
  items: MissionBriefItem[];
  groups?: MissionBriefGroup[];
  emptyHint: string;
};

export type EngagementWizardMissionBrief = {
  sections: MissionBriefSection[];
  playbookName: string | null;
};

export type EngagementWizardReviewReadiness = {
  status: "ready" | "developing";
  statusLabel: string;
  percentComplete: number;
  metItems: string[];
  missingItems: string[];
  /** Subtle operational readiness phrases for the review dashboard */
  operationalNotes: string[];
};

const OBSERVATION_LINE_RE =
  /\b(observation|observe|scheduling|coordinator|credential|credentialing|block time|case selection|or access|access path|vendor clearance|pathway)\b/i;
const WORKFLOW_LINE_RE =
  /\b(workflow|friction|sequence|standardization|procedure mix|mapping|process|visibility|or sequence|throughput)\b/i;
const ACCESS_RISK_LINE_RE =
  /\b(unknown|unclear|risk|restriction|clearance|credential|block|constraint|approval|committee|access|pathway|vendor|scheduling ownership)\b/i;
const TOOLS_LINE_RE =
  /\b(tool|resource|material|deck|leave-behind|leave behind|sample|brochure|demo|packet|bring)\b/i;
const UNKNOWN_LINE_RE =
  /\b(unknown|unclear|tbd|not yet|unresolved|unconfirmed|incomplete|gap|to be determined)\b/i;

const NEXT_STEP_SUGGESTED: MissionBriefItem[] = [
  { text: "Observation request follow-up", suggested: true },
  { text: "Coordinator outreach for access path", suggested: true },
  { text: "Workflow validation visit", suggested: true },
];

const READINESS_UNKNOWN_LABELS: Record<string, string> = {
  goal: "Objective not locked for this touch",
  discovery: "Discovery targets incomplete",
  opening: "Opening angle not captured",
  product: "Product focus not aligned",
};

function fieldFilled(draft: EngagementWorkflowDraft, key: string, minLen = 8): boolean {
  return String(draft[key] ?? "").trim().length >= minLen;
}

function truncateBullet(text: string, maxLen = 110): string {
  const line = text.trim();
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1).trim()}…`;
}

function uniqueMissionItems(lines: string[], max: number, maxLen = 110): MissionBriefItem[] {
  const seen = new Set<string>();
  const out: MissionBriefItem[] = [];
  for (const raw of lines) {
    const text = truncateBullet(raw, maxLen);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, tag: inferTagFromText(text) });
    if (out.length >= max) break;
  }
  return out;
}

function inferTagFromText(text: string): MissionBriefTag | undefined {
  const lower = text.toLowerCase();
  if (UNKNOWN_LINE_RE.test(lower)) return "RISK";
  if (/\b(observation|observe)\b/.test(lower)) return "OBSERVATION";
  if (/\b(access|credential|vendor|coordinator)\b/.test(lower)) return "ACCESS";
  if (/\b(workflow|procedure|friction)\b/.test(lower)) return "WORKFLOW";
  return undefined;
}

/** @deprecated Use compressObjectiveToTacticalBullets — kept for tests */
export function compressObjectiveBullets(text: string, maxItems = 4): MissionBriefItem[] {
  return compressObjectiveToTacticalBullets(text, maxItems);
}

function classifyDiscoveryLine(line: string): "workflow" | "observation" {
  const obs = OBSERVATION_LINE_RE.test(line);
  const wf = WORKFLOW_LINE_RE.test(line);
  if (obs && !wf) return "observation";
  if (wf && !obs) return "workflow";
  if (obs && wf) return "observation";
  return "workflow";
}

function classifyAccessLine(line: string): "risk" | "tools" {
  const tools = TOOLS_LINE_RE.test(line);
  const risk = ACCESS_RISK_LINE_RE.test(line);
  if (tools && !risk) return "tools";
  if (risk) return "risk";
  return tools ? "tools" : "risk";
}

function extractUnknownLines(draft: EngagementWorkflowDraft, isStrategic: boolean): string[] {
  const sources = [
    String(draft.pre_observation_tools_resources ?? ""),
    String(draft.pre_observation_value_hypothesis ?? ""),
    String(draft.pre_observation_additional_notes ?? ""),
  ];
  if (!isStrategic) {
    sources.push(String(draft.engagement_purpose ?? ""));
  }

  const lines: string[] = [];
  for (const source of sources) {
    for (const line of splitEngagementPrepLines(source)) {
      if (UNKNOWN_LINE_RE.test(line)) lines.push(line);
    }
  }
  return lines;
}

function buildUnknownsFromReadiness(readiness: PreparationReadiness | undefined): string[] {
  if (!readiness) return [];
  const out: string[] = [];
  for (const signal of readiness.signals) {
    if (signal.met) continue;
    const label = READINESS_UNKNOWN_LABELS[signal.key];
    if (label) out.push(label);
  }
  return out;
}

function buildOperationalUnknowns(
  draft: EngagementWorkflowDraft,
  isStrategic: boolean,
  readiness: PreparationReadiness | undefined,
): MissionBriefItem[] {
  const fromText = extractUnknownLines(draft, isStrategic);
  const fromReadiness = buildUnknownsFromReadiness(readiness);

  const heuristic: string[] = [];
  if (isStrategic) {
    const probes = String(draft.pre_observation_probes ?? "").toLowerCase();
    if (!fieldFilled(draft, "pre_observation_probes", 12)) {
      heuristic.push("Procedure visibility incomplete");
    } else if (!/\b(who owns|scheduling owner|coordinator)\b/i.test(probes)) {
      heuristic.push("Scheduling ownership unknown");
    }
    if (!fieldFilled(draft, "pre_observation_tools_resources", 8)) {
      heuristic.push("Observation restrictions unclear");
    }
  }

  const combined = [...fromReadiness, ...fromText, ...heuristic];
  return dedupeMissionItems(
    combined.map((text) => ({ text: truncateBullet(text, 72) })),
    5,
  );
}

function splitDiscoveryTargets(lines: string[]): { workflow: MissionBriefItem[]; observation: MissionBriefItem[] } {
  const workflow: MissionBriefItem[] = [];
  const observation: MissionBriefItem[] = [];
  for (const line of lines) {
    const bucket = classifyDiscoveryLine(line);
    const item = summarizeDiscoveryPrompt(line, bucket);
    if (bucket === "observation") observation.push(item);
    else workflow.push(item);
  }
  return {
    workflow: dedupeMissionItems(workflow, 5),
    observation: dedupeMissionItems(observation, 5),
  };
}

function splitAccessSignals(lines: string[]): { risks: MissionBriefItem[]; tools: MissionBriefItem[] } {
  const risks: MissionBriefItem[] = [];
  const tools: MissionBriefItem[] = [];
  for (const line of lines) {
    const bucket = classifyAccessLine(line);
    const item =
      bucket === "tools" ? summarizeAccessToolsLine(line) : summarizeAccessRiskLine(line);
    if (bucket === "tools") tools.push(item);
    else risks.push(item);
  }
  return {
    risks: dedupeMissionItems(risks, 4),
    tools: dedupeMissionItems(tools, 4),
  };
}

export function buildEngagementWizardMissionBrief(input: {
  draft: EngagementWorkflowDraft;
  isStrategic: boolean;
  isOfficeVisit: boolean;
  playbookName: string | null;
  suggestedGoal?: string | null;
  suggestedTalkingPoints?: string[];
  readiness?: PreparationReadiness;
}): EngagementWizardMissionBrief {
  const draftGoal = String(input.draft.observation_goal ?? "").trim();
  const suggestedGoal = String(input.suggestedGoal ?? "").trim();

  let objectiveRaw: string | null = null;
  if (input.isStrategic) {
    objectiveRaw = draftGoal || suggestedGoal || null;
  } else {
    objectiveRaw =
      String(input.draft.engagement_purpose ?? "").trim() || draftGoal || suggestedGoal || null;
  }

  const discoveryLines: string[] = [];
  if (input.isStrategic) {
    const probesKey = input.isOfficeVisit ? "sim_lab_focus" : "pre_observation_probes";
    discoveryLines.push(...splitEngagementPrepLines(String(input.draft[probesKey] ?? "")));
    discoveryLines.push(
      ...splitEngagementPrepLines(String(input.draft.pre_observation_impact_opening_statement ?? "")),
    );
    if (discoveryLines.length === 0) {
      discoveryLines.push(...(input.suggestedTalkingPoints ?? []));
    }
  } else {
    const purpose = String(input.draft.engagement_purpose ?? "").trim();
    if (purpose) discoveryLines.push(purpose);
    discoveryLines.push(
      ...splitEngagementPrepLines(String(input.draft.pre_observation_additional_notes ?? "")),
    );
  }

  const { workflow, observation } = splitDiscoveryTargets(discoveryLines);

  const accessRaw = uniqueMissionItems(
    [
      ...splitEngagementPrepLines(String(input.draft.pre_observation_tools_resources ?? "")),
      ...splitEngagementPrepLines(String(input.draft.pre_observation_value_hypothesis ?? "")),
    ],
    6,
    120,
  ).map((i) => i.text);
  const { risks: accessRisks, tools: accessTools } = splitAccessSignals(accessRaw);

  const plannedClose = String(input.draft.pre_observation_planned_close ?? "").trim();
  const outcomeRaw = splitEngagementPrepLines(plannedClose);
  const expectedItems = dedupeMissionItems(
    outcomeRaw.map((line) => summarizeOutcomeLine(line)),
    4,
  );

  const nextRaw = String(input.draft.next_action ?? "").trim();
  const followRaw = String(input.draft.follow_up_tasks ?? "").trim();
  const nextLines = [
    ...splitEngagementPrepLines(nextRaw),
    ...splitEngagementPrepLines(followRaw),
  ];
  let nextItems = dedupeMissionItems(nextLines.map((line) => summarizeNextStepLine(line)), 4);
  if (nextItems.length === 0) {
    nextItems = NEXT_STEP_SUGGESTED;
  }

  const unknowns = buildOperationalUnknowns(input.draft, input.isStrategic, input.readiness);

  const pathwayCorpus = [
    objectiveRaw ?? "",
    plannedClose,
    String(input.draft.pre_observation_probes ?? ""),
    String(input.draft.observation_goal ?? ""),
    String(input.draft.next_action ?? ""),
  ].join(" ");
  const pathwayItems = input.isStrategic ? buildPathwayImpactItems(pathwayCorpus) : [];

  const discoveryGroups: MissionBriefGroup[] = [];
  if (workflow.length > 0) {
    discoveryGroups.push({
      title: MISSION_BRIEF_SECTION_TITLE.workflowDiscovery,
      tag: "WORKFLOW",
      items: workflow,
    });
  }
  if (observation.length > 0) {
    discoveryGroups.push({
      title: MISSION_BRIEF_SECTION_TITLE.observationDiscovery,
      tag: "OBSERVATION",
      items: observation,
    });
  }

  const accessGroups: MissionBriefGroup[] = [];
  if (accessRisks.length > 0) {
    accessGroups.push({ title: MISSION_BRIEF_SECTION_TITLE.accessRisks, tag: "RISK", items: accessRisks });
  }
  if (accessTools.length > 0) {
    accessGroups.push({
      title: MISSION_BRIEF_SECTION_TITLE.toolsMaterials,
      items: accessTools,
    });
  }

  const sections: MissionBriefSection[] = [
    {
      id: "objective",
      title: MISSION_BRIEF_SECTION_TITLE.objective,
      subtitle: MISSION_BRIEF_SECTION_SUBTITLE.objective,
      tier: "primary",
      items: objectiveRaw ? compressObjectiveToTacticalBullets(objectiveRaw) : [],
      emptyHint: "Add a SMART objective on the preparation step.",
    },
    {
      id: "discoveryTargets",
      title: MISSION_BRIEF_SECTION_TITLE.discoveryTargets,
      tier: "standard",
      items: [],
      groups: discoveryGroups.length > 0 ? discoveryGroups : undefined,
      emptyHint: input.isStrategic
        ? "Add priority questions or opening angle before the visit."
        : "Capture purpose and context notes before the visit.",
    },
    {
      id: "accessSignals",
      title: "Access & prep materials",
      tier: "standard",
      items: [],
      groups: accessGroups.length > 0 ? accessGroups : undefined,
      emptyHint: "Note access risks and tools in operational unknowns on preparation.",
    },
    {
      id: "unknownsRemaining",
      title: MISSION_BRIEF_SECTION_TITLE.unknownsRemaining,
      tier: "primary",
      items: unknowns,
      emptyHint: "No unresolved operational gaps flagged — confirm on preparation if anything is still open.",
    },
    {
      id: "pathwayImpact",
      title: MISSION_BRIEF_SECTION_TITLE.pathwayImpact,
      subtitle: MISSION_BRIEF_SECTION_SUBTITLE.pathwayImpact,
      tier: "standard",
      items: pathwayItems,
      emptyHint: "Pathway signals will appear when prep references observation, workflow, or access advancement.",
    },
    {
      id: "expectedOutcome",
      title: MISSION_BRIEF_SECTION_TITLE.expectedOutcome,
      subtitle: MISSION_BRIEF_SECTION_SUBTITLE.expectedOutcome,
      tier: "primary",
      items: expectedItems,
      emptyHint: "Define planned close — what success looks like after this touch.",
    },
    {
      id: "nextStep",
      title: MISSION_BRIEF_SECTION_TITLE.nextStep,
      subtitle: MISSION_BRIEF_SECTION_SUBTITLE.nextStep,
      tier: "standard",
      items: nextItems,
      emptyHint: "",
    },
  ];

  return {
    sections,
    playbookName: input.playbookName,
  };
}

const REVIEW_READINESS_MET: Record<string, string> = {
  goal: "Objective defined",
  discovery: "Discovery targets identified",
  opening: "Opening angle captured",
  product: "Product focus set",
};

const REVIEW_READINESS_MISSING: Record<string, string> = {
  goal: "Objective",
  discovery: "Discovery targets",
  opening: "Opening angle",
  product: "Product focus",
};

export function buildOperationalReadinessNotes(input: {
  readiness: PreparationReadiness;
  isStrategic: boolean;
  draft: EngagementWorkflowDraft;
}): string[] {
  const notes: string[] = [];
  const discoveryMet = input.readiness.signals.find((s) => s.key === "discovery")?.met;
  const openingMet = input.readiness.signals.find((s) => s.key === "opening")?.met;
  const goalMet = input.readiness.signals.find((s) => s.key === "goal")?.met;

  if (discoveryMet && openingMet) {
    notes.push("Discovery readiness confirmed");
  }
  if (input.isStrategic && discoveryMet && goalMet) {
    const probes = String(input.draft.pre_observation_probes ?? "").toLowerCase();
    const goal = String(input.draft.observation_goal ?? "").toLowerCase();
    if (OBSERVATION_LINE_RE.test(probes) || OBSERVATION_LINE_RE.test(goal)) {
      notes.push("Observation qualification prep complete");
    }
  }
  if (input.readiness.level === "strong") {
    notes.push("Mission prep checklist complete");
  }
  return notes;
}

export function buildEngagementWizardReviewReadiness(input: {
  readiness: PreparationReadiness;
  draft: EngagementWorkflowDraft;
  isStrategic?: boolean;
}): EngagementWizardReviewReadiness {
  const metItems: string[] = [];
  const missingItems: string[] = [];

  for (const signal of input.readiness.signals) {
    const label = REVIEW_READINESS_MET[signal.key] ?? signal.label;
    const gap = REVIEW_READINESS_MISSING[signal.key] ?? signal.label;
    if (signal.met) metItems.push(label);
    else missingItems.push(gap);
  }

  const followUpMet =
    fieldFilled(input.draft, "next_action", 6) ||
    fieldFilled(input.draft, "pre_observation_planned_close", 10) ||
    fieldFilled(input.draft, "follow_up_tasks", 8);

  const followGapIdx = missingItems.indexOf("Follow-up path");
  if (followUpMet) {
    if (!metItems.includes("Follow-up path planned")) {
      metItems.push("Follow-up path planned");
    }
    if (followGapIdx >= 0) missingItems.splice(followGapIdx, 1);
  } else if (followGapIdx < 0) {
    missingItems.push("Follow-up path");
  }

  const status =
    input.readiness.level === "strong" || input.readiness.percent_complete >= 100
      ? "ready"
      : "developing";

  const operationalNotes = buildOperationalReadinessNotes({
    readiness: input.readiness,
    isStrategic: input.isStrategic ?? true,
    draft: input.draft,
  });

  return {
    status,
    statusLabel: status === "ready" ? "Ready" : "Still developing",
    percentComplete: input.readiness.percent_complete,
    metItems,
    missingItems,
    operationalNotes,
  };
}

export function engagementReviewHeroSupportCopy(input: {
  engagementTypeLabel: string;
  isStrategic: boolean;
}): string {
  if (input.isStrategic) {
    return `Confirm workflow discovery, observation qualification, and unknowns before you save — then open the field briefing before the visit.`;
  }
  return `Confirm operational goals, unknowns, and the next step that advances this ${input.engagementTypeLabel.toLowerCase()}.`;
}
