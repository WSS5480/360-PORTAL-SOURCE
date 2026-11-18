import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { formatIntroCallProbesForField } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";

export const INTRO_CALL_CONVERSATION_FOCUS_OPTIONS = [
  {
    id: "general_discovery",
    label: "General discovery",
    summary: "Procedure mix, workflow friction, and evaluation fit",
  },
  {
    id: "observation_access",
    label: "Observation planning",
    summary: "Case selection and what to watch for",
  },
  {
    id: "workflow_mapping",
    label: "Workflow mapping",
    summary: "OR sequence friction and standardization",
  },
  {
    id: "product_fit",
    label: "Product fit",
    summary: "Whether portfolio solutions match their workflow",
  },
  {
    id: "competitive_displacement",
    label: "Competitive displacement",
    summary: "Incumbent gaps and switching criteria",
  },
] as const;

export type IntroCallConversationFocusId =
  (typeof INTRO_CALL_CONVERSATION_FOCUS_OPTIONS)[number]["id"];

const FOCUS_PROBE_BOOSTS: Record<IntroCallConversationFocusId, readonly string[]> = {
  general_discovery: [
    "What would make a future product discussion or evaluation worth your time?",
    "Which procedures do you perform most often?",
  ],
  observation_access: [
    "Which upcoming cases would you be comfortable having us observe?",
    "What would you want us to notice about your workflow if we watched a case?",
    "Which procedure types would make a first observation most useful?",
  ],
  workflow_mapping: [
    "Where does the current workflow create friction?",
    "How standardized are technique and supply choices across your cases?",
  ],
  product_fit: [
    "What would make a future product discussion or evaluation worth your time?",
    "Where might our portfolio fit without disrupting your current standard of care?",
  ],
  competitive_displacement: [
    "Where does your current product or vendor choice still work well — and where does it fall short?",
    "What would need to improve to justify evaluating an alternative approach?",
  ],
};

export function parseIntroCallConversationFocus(raw: string | null | undefined): IntroCallConversationFocusId[] {
  const ids = new Set<IntroCallConversationFocusId>();
  for (const part of String(raw ?? "").split(/[,;|]/)) {
    const key = part.trim() as IntroCallConversationFocusId;
    if (INTRO_CALL_CONVERSATION_FOCUS_OPTIONS.some((o) => o.id === key)) {
      ids.add(key);
    }
  }
  return [...ids];
}

export function serializeIntroCallConversationFocus(ids: readonly IntroCallConversationFocusId[]): string {
  return ids.join(",");
}

function normalizeProbeKey(q: string): string {
  return q.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

function pushUniqueProbe(out: string[], candidate: string, max: number): void {
  if (out.length >= max) return;
  const q = candidate.trim();
  if (!q || q.length < 12) return;
  const key = normalizeProbeKey(q);
  if (out.some((existing) => normalizeProbeKey(existing) === key)) return;
  if (out.some((existing) => normalizeProbeKey(existing).includes(key.slice(0, 24)))) return;
  out.push(q.endsWith("?") ? q : `${q}?`);
}

/**
 * Lightly reorders and supplements probe list for preview / apply — does not change other template fields.
 */
export function prioritizeProbesForConversationFocus(
  baseProbes: readonly string[],
  selectedFocus: readonly IntroCallConversationFocusId[],
  max = 8,
): string[] {
  if (selectedFocus.length === 0) {
    return [...baseProbes].slice(0, max);
  }

  const out: string[] = [];
  for (const focus of selectedFocus) {
    for (const probe of FOCUS_PROBE_BOOSTS[focus] ?? []) {
      pushUniqueProbe(out, probe, max);
    }
  }
  for (const probe of baseProbes) {
    pushUniqueProbe(out, probe, max);
  }
  return out.slice(0, max);
}

export function applyConversationFocusToTemplatePreview(
  template: IntroCallPrepTemplate,
  selectedFocus: readonly IntroCallConversationFocusId[],
): IntroCallPrepTemplate {
  if (selectedFocus.length === 0) return template;
  const probes = prioritizeProbesForConversationFocus(template.probesInformationToGather, selectedFocus);
  return {
    ...template,
    probesInformationToGather: probes,
  };
}

export function formatConversationFocusForPreview(
  template: IntroCallPrepTemplate,
  selectedFocus: readonly IntroCallConversationFocusId[],
): string {
  const adjusted = applyConversationFocusToTemplatePreview(template, selectedFocus);
  return formatIntroCallProbesForField(adjusted.probesInformationToGather);
}
