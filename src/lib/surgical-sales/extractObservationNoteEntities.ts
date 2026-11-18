export type ObservationNoteEntityType =
  | "scheduling_contact"
  | "procedure_focus"
  | "product_signal"
  | "competitor_signal"
  | "staff_signal"
  | "follow_up_signal"
  | "workflow_signal"
  | "clinical_pain_signal"
  | "workflow_friction_signal"
  | "provider_behavior_signal"
  | "growth_signal";

export type ObservationNoteConfidence = "High" | "Medium" | "Low";

export type ObservationNoteExtractedEntity = {
  type: ObservationNoteEntityType;
  label: string;
  category: string;
  /** Concise normalized intelligence statement — not raw transcript. */
  finding: string;
  /** Supporting quote from the note. */
  evidence: string;
  confidence: ObservationNoteConfidence;
  /** @deprecated Use finding — kept for legacy stored extractions. */
  value?: string;
  /** Polarity of the originating observation fact (v2 pilot) — legacy readers ignore it. */
  polarity?: "positive" | "negative" | "neutral" | "uncertain";
};

export type ObservationNoteExtraction = {
  entities: ObservationNoteExtractedEntity[];
  primaryCategory: string | null;
  extractedAt: string;
  model: "rules";
};

import {
  isNegativeEvidenceStatement,
  isUnknownEvidenceStatement,
} from "@/lib/surgical-sales/observationEvidenceClassification";
import {
  fragmentHasIntelligenceSignal,
  isActionableIntelligenceFinding,
  isConversationalFillerText,
} from "@/lib/surgical-sales/observationFindingQuality";

type FindingDraft = Omit<ObservationNoteExtractedEntity, "value">;

function titleCasePhrase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function cleanFindingPhrase(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
}

function pushEntity(
  target: ObservationNoteExtractedEntity[],
  seen: Set<string>,
  draft: FindingDraft,
): void {
  const finding = cleanFindingPhrase(draft.finding);
  const evidence = draft.evidence.trim();
  if (!finding || !evidence) return;
  if (draft.confidence === "Low") return;
  if (isConversationalFillerText(finding) || isConversationalFillerText(evidence)) return;
  if (!isActionableIntelligenceFinding(finding)) return;
  if (finding.toLowerCase() === evidence.toLowerCase() && evidence.length > 64) return;

  const key = `${draft.type}:${finding.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);

  target.push({
    ...draft,
    finding,
    evidence,
    value: finding,
  });
}

function splitObservationFragments(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);
}

function extractSchedulingContact(fragment: string, evidence: string): FindingDraft | null {
  const match =
    fragment.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:handles?|coordinates?|owns?)\s+scheduling\b/i) ??
    fragment.match(/\bscheduling\s+(?:contact|owner)\s*(?:is|:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i);
  const name = titleCasePhrase(match?.[1] ?? "");
  if (!name) return null;
  return {
    type: "scheduling_contact",
    label: "Scheduling Contact",
    category: "Workflow",
    finding: name,
    evidence,
    confidence: "High",
  };
}

function extractProcedureFocus(fragment: string, evidence: string): FindingDraft | null {
  if (/\brobotic\s+hernia\b/i.test(fragment)) {
    return {
      type: "procedure_focus",
      label: "Procedure Focus",
      category: "Provider Behavior",
      finding: "Robotic Hernia",
      evidence,
      confidence: "Medium",
    };
  }
  const match = fragment.match(
    /\b(?:doing|performing|focused on|more)\s+([\w\s-]{0,24}(?:hernia|spine|knee|hip|robotic)[\w\s-]*)/i,
  );
  const phrase = cleanFindingPhrase(match?.[1] ?? "");
  if (!phrase) return null;
  return {
    type: "procedure_focus",
    label: "Procedure Focus",
    category: "Provider Behavior",
    finding: titleCasePhrase(phrase),
    evidence,
    confidence: "Medium",
  };
}

function extractCompetitorFinding(fragment: string, evidence: string): FindingDraft | null {
  if (isUnknownEvidenceStatement(fragment) || isNegativeEvidenceStatement(fragment)) return null;

  const namedAfterCompetitor = fragment.match(
    /\bcompetitor\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/,
  );
  if (namedAfterCompetitor?.[1]) {
    const productName = titleCasePhrase(namedAfterCompetitor[1]);
    return {
      type: "competitor_signal",
      label: "Competitor Product",
      category: "Competitor Products",
      finding: productName === "Mesh" ? "Competitor Mesh" : productName,
      evidence,
      confidence: "High",
    };
  }

  const usingProduct = fragment.match(
    /\b(?:still\s+)?(?:using|uses?|on)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/,
  );
  if (
    usingProduct?.[1] &&
    /\b(competitor|rival|mesh|tray|heavily|vendor|primary)\b/i.test(fragment)
  ) {
    return {
      type: "competitor_signal",
      label: "Competitor Product",
      category: "Competitor Products",
      finding: titleCasePhrase(usingProduct[1]),
      evidence,
      confidence: "High",
    };
  }

  if (/\bcompetitor\s+tray\b/i.test(fragment)) {
    return {
      type: "competitor_signal",
      label: "Competitor Product",
      category: "Competitor Products",
      finding: "Competitor tray",
      evidence,
      confidence: "High",
    };
  }

  if (/\bcompetitor\s+rep\b/i.test(fragment) || /\brival\s+(?:rep|vendor|tray|energy)\b/i.test(fragment)) {
    return {
      type: "competitor_signal",
      label: "Competitor Presence",
      category: "Competitor Products",
      finding: "Competitor rep present",
      evidence,
      confidence: "High",
    };
  }

  return null;
}

function extractClinicalPainFinding(fragment: string, evidence: string): FindingDraft | null {
  if (isUnknownEvidenceStatement(fragment) || isNegativeEvidenceStatement(fragment)) return null;

  if (
    /\bvisuali[sz]ation\s+(?:was\s+)?(?:difficult|challenging|poor|hard)\b/i.test(fragment) ||
    /\bvisualization\s+challenge\b/i.test(fragment)
  ) {
    return {
      type: "clinical_pain_signal",
      label: "Clinical Pain Point",
      category: "Clinical Pain Points",
      finding: "Visualization difficulty during procedure",
      evidence,
      confidence: "High",
    };
  }
  if (/\bfixation\b/i.test(fragment) && /\b(inconsisten|pain point)\b/i.test(fragment)) {
    return {
      type: "clinical_pain_signal",
      label: "Clinical Pain Point",
      category: "Clinical Pain Points",
      finding: "Fixation inconsistency observed",
      evidence,
      confidence: "High",
    };
  }
  if (/\bhard to see\b/i.test(fragment)) {
    return {
      type: "clinical_pain_signal",
      label: "Clinical Pain Point",
      category: "Clinical Pain Points",
      finding: "Visualization difficulty during procedure",
      evidence,
      confidence: "High",
    };
  }
  return null;
}

function extractWorkflowFrictionFinding(fragment: string, evidence: string): FindingDraft | null {
  if (isUnknownEvidenceStatement(fragment) || isNegativeEvidenceStatement(fragment)) return null;

  if (
    /\b(?:spent|spend|took|taking)\b[^.]{0,64}\b(?:decent|extra)?\s*(?:amount\s+of\s+)?time\b/i.test(
      fragment,
    ) &&
    /\b(?:better\s+view|view|visuali[sz]|fixation)\b/i.test(fragment)
  ) {
    return {
      type: "workflow_friction_signal",
      label: "Workflow Friction",
      category: "Workflow Friction",
      finding: "Extra visualization time observed before fixation",
      evidence,
      confidence: "High",
    };
  }

  if (
    /\b(?:extra\s+time|spent\s+(?:extra\s+)?time)\b/i.test(fragment) &&
    /\bvisuali[sz]/i.test(fragment)
  ) {
    return {
      type: "workflow_friction_signal",
      label: "Workflow Friction",
      category: "Workflow Friction",
      finding: "Visualization challenges observed",
      evidence,
      confidence: "High",
    };
  }
  if (/\btrying\s+to\s+improve\s+visualization\b/i.test(fragment)) {
    return {
      type: "workflow_friction_signal",
      label: "Workflow Friction",
      category: "Workflow Friction",
      finding: "Visualization challenges observed",
      evidence,
      confidence: "High",
    };
  }
  if (
    /\b(?:long|extra)\s+(?:room\s+)?turnover\b/i.test(fragment) ||
    /\broom\s+turnover\s+took\b/i.test(fragment) ||
    /\bturnover\s+(?:took|delay)\b/i.test(fragment)
  ) {
    return {
      type: "workflow_friction_signal",
      label: "Workflow Friction",
      category: "Workflow Friction",
      finding: "Room turnover delay",
      evidence,
      confidence: "High",
    };
  }
  if (/\bsetup\s+delay\b/i.test(fragment) || /\bextra\s+setup\s+steps?\b/i.test(fragment)) {
    return {
      type: "workflow_friction_signal",
      label: "Workflow Friction",
      category: "Workflow Friction",
      finding: "Setup delay observed",
      evidence,
      confidence: "High",
    };
  }
  if (/\bbottleneck\b/i.test(fragment)) {
    return {
      type: "workflow_friction_signal",
      label: "Workflow Friction",
      category: "Workflow Friction",
      finding: "Workflow bottleneck observed",
      evidence,
      confidence: "Medium",
    };
  }
  return null;
}

function extractProductFinding(fragment: string, evidence: string): FindingDraft | null {
  if (/\bACSIS\b/i.test(fragment)) {
    return {
      type: "product_signal",
      label: "Product Signal",
      category: "Product Fit Signals",
      finding: "ACSIS",
      evidence,
      confidence: "High",
    };
  }
  const peelPack = fragment.match(/\bpeel[- ]?pack\b/i);
  if (peelPack) {
    return {
      type: "product_signal",
      label: "Product Signal",
      category: "Product Fit Signals",
      finding: "Peel pack observed",
      evidence,
      confidence: "High",
    };
  }
  const tray = fragment.match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+tray\b/);
  if (tray?.[1] && !/\bcompetitor\b/i.test(fragment)) {
    return {
      type: "product_signal",
      label: "Product Signal",
      category: "Product Fit Signals",
      finding: `${titleCasePhrase(tray[1])} tray`,
      evidence,
      confidence: "Medium",
    };
  }
  if (/\bopen\s+to\s+(?:a\s+)?(?:trial|evaluation|demo|evaluating)\b/i.test(fragment)) {
    return {
      type: "growth_signal",
      label: "Growth Opportunity",
      category: "Growth Opportunities",
      finding: "Open to product evaluation",
      evidence,
      confidence: "High",
    };
  }
  if (/\bpeel[- ]?pack\b/i.test(fragment) && /\b(trial|evaluat|follow)\b/i.test(fragment)) {
    return {
      type: "product_signal",
      label: "Product Signal",
      category: "Product Fit Signals",
      finding: "Peel-pack trial interest",
      evidence,
      confidence: "High",
    };
  }
  return null;
}

function extractCurrentProductInUseFinding(fragment: string, evidence: string): FindingDraft | null {
  if (isUnknownEvidenceStatement(fragment) || isNegativeEvidenceStatement(fragment)) return null;

  const usingProduct = fragment.match(
    /\b(?:still\s+)?using\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/,
  );
  if (!usingProduct?.[1]) return null;

  const productName = titleCasePhrase(usingProduct[1]);
  if (!productName) return null;

  return {
    type: "product_signal",
    label: "Current Product",
    category: "Current Products",
    finding: productName,
    evidence,
    confidence: "High",
  };
}

function extractStaffWorkflowFinding(fragment: string, evidence: string): FindingDraft | null {
  if (isUnknownEvidenceStatement(fragment) || isNegativeEvidenceStatement(fragment)) return null;

  if (
    /\b(?:staff|team)\s+seemed\s+(?:pretty\s+)?(?:organized|efficient|comfortable|prepared|smooth)\b/i.test(
      fragment,
    ) ||
    (/\b(?:staff|team)\b/i.test(fragment) &&
      /\b(?:organized|efficient|comfortable|prepared|smooth)\s+overall\b/i.test(fragment))
  ) {
    const finding = /\borganized\b/i.test(fragment)
      ? "Team appeared organized"
      : /\bcomfortable\b/i.test(fragment)
        ? "Team appeared comfortable with current products"
        : "Positive staff workflow observed";

    return {
      type: "staff_signal",
      label: "Staff Workflow",
      category: "Staff Workflow",
      finding,
      evidence,
      confidence: "High",
    };
  }

  return null;
}

function extractStaffFinding(fragment: string, evidence: string): FindingDraft | null {
  if (isUnknownEvidenceStatement(fragment) || isNegativeEvidenceStatement(fragment)) return null;

  if (
    /\b(?:trouble|difficult|hard|struggl\w*)\s+(?:getting|opening|to open)\b/i.test(fragment) &&
    /\bproduct/i.test(fragment)
  ) {
    return {
      type: "staff_signal",
      label: "Staff Observation",
      category: "Staff Observations",
      finding: "Product availability/setup delays observed",
      evidence,
      confidence: "High",
    };
  }
  if (/\bhad\s+trouble\s+getting\b/i.test(fragment) && /\bopened?\b/i.test(fragment)) {
    return {
      type: "staff_signal",
      label: "Staff Observation",
      category: "Staff Observations",
      finding: "Product availability/setup delays observed",
      evidence,
      confidence: "High",
    };
  }
  if (/\b(?:nursing\s+)?staff\s+frustrated\b/i.test(fragment)) {
    return {
      type: "staff_signal",
      label: "Staff Observation",
      category: "Staff Observations",
      finding: "Staff frustration with workflow",
      evidence,
      confidence: "High",
    };
  }
  if (/\bintegrated\s+instrumentation\s+interest\b/i.test(fragment)) {
    return {
      type: "staff_signal",
      label: "Staff Observation",
      category: "Staff Observations",
      finding: "Staff interest in integrated instrumentation",
      evidence,
      confidence: "Medium",
    };
  }
  if (!/\b(nurse|tech|circulator|scrub|or\s+staff|staff)\b/i.test(fragment)) return null;
  if (/\b(delay|issue|concern|frustrat|workaround|mentioned|interest)\b/i.test(fragment)) {
    if (/\bsetup\s+delay\b/i.test(fragment)) {
      return {
        type: "staff_signal",
        label: "Staff Observation",
        category: "Staff Observations",
        finding: "Staff reported setup delay",
        evidence,
        confidence: "High",
      };
    }
    if (/\bintegrated\s+(?:tray|instrument)/i.test(fragment)) {
      return {
        type: "staff_signal",
        label: "Staff Observation",
        category: "Staff Observations",
        finding: "Staff interest in integrated instrumentation",
        evidence,
        confidence: "Medium",
      };
    }
  }
  return null;
}

function extractProviderBehaviorFinding(fragment: string, evidence: string): FindingDraft | null {
  const said = fragment.match(
    /\b(?:surgeon|provider|doctor)\b[^.]{0,40}\b(?:said|mentioned|prefers?|likes?|dislikes?)\s+(.{6,80})/i,
  );
  if (said?.[1]) {
    const quote = cleanFindingPhrase(said[1]);
    if (quote && quote.length <= 72) {
      return {
        type: "provider_behavior_signal",
        label: "Provider Behavior",
        category: "Provider Behavior",
        finding: quote.charAt(0).toUpperCase() + quote.slice(1),
        evidence,
        confidence: "High",
      };
    }
  }
  return null;
}

function extractFollowUpFinding(fragment: string, evidence: string): FindingDraft | null {
  if (/\bfollow[- ]?up\b/i.test(fragment) || /\bcheck\s+back\b/i.test(fragment)) {
    return {
      type: "follow_up_signal",
      label: "Follow-up",
      category: "Growth Opportunities",
      finding: "Follow-up required",
      evidence,
      confidence: "High",
    };
  }
  return null;
}

function extractFromFragment(fragment: string, seen: Set<string>, entities: ObservationNoteExtractedEntity[]): void {
  const evidence = fragment.trim();
  if (!evidence || !fragmentHasIntelligenceSignal(evidence)) return;
  if (isUnknownEvidenceStatement(evidence) && !/\busing\b/i.test(evidence)) return;

  const candidates: Array<FindingDraft | null> = [
    extractSchedulingContact(fragment, evidence),
    extractProcedureFocus(fragment, evidence),
    extractCompetitorFinding(fragment, evidence),
    extractCurrentProductInUseFinding(fragment, evidence),
    extractClinicalPainFinding(fragment, evidence),
    extractWorkflowFrictionFinding(fragment, evidence),
    extractProductFinding(fragment, evidence),
    extractStaffWorkflowFinding(fragment, evidence),
    extractStaffFinding(fragment, evidence),
    extractProviderBehaviorFinding(fragment, evidence),
    extractFollowUpFinding(fragment, evidence),
  ];

  for (const candidate of candidates) {
    if (candidate) pushEntity(entities, seen, candidate);
  }
}

export function extractObservationNoteEntities(rawText: string): ObservationNoteExtraction {
  const fragments = splitObservationFragments(rawText);
  const entities: ObservationNoteExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const fragment of fragments.length > 0 ? fragments : [rawText.trim()]) {
    extractFromFragment(fragment, seen, entities);
  }

  const primaryCategory =
    entities.find((entity) => entity.confidence === "High")?.category ??
    entities.find((entity) => entity.confidence === "Medium")?.category ??
    null;

  return {
    entities: entities.slice(0, 8),
    primaryCategory,
    extractedAt: new Date().toISOString(),
    model: "rules",
  };
}
