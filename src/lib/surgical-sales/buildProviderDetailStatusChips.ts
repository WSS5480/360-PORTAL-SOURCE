import type { ProviderCommercialMomentum } from "@/lib/surgical-sales/providerCommercialMomentum";
import { providerCommercialMomentumChipTone } from "@/lib/surgical-sales/providerCommercialMomentum";
import type { IntelligenceStrengthLabel } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import type { ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";
import { normalizeProviderRelationshipStage } from "@/lib/surgical-sales/providerRelationshipStage";

/** Commercial workflow labels for Provider Detail header chips. */
export const PROVIDER_DETAIL_CHIP_LABEL = {
  commercialDiscovery: "Commercial Discovery",
  discoveryNeeded: "Discovery Needed",
  relationshipBuilding: "Relationship Building",
  activeRelationship: "Active Relationship",
  establishedCustomer: "Established Customer",
  intelligenceBuilding: "Intelligence Building",
  strongCommercialUnderstanding: "Strong Commercial Understanding",
  needsFollowUp: "Needs Follow-Up",
  dormant: "Dormant",
} as const;

export type ProviderDetailStatusChipTone = "neutral" | "brand" | "success" | "warn" | "muted";

export type ProviderDetailStatusChip = {
  id: string;
  label: string;
  tone: ProviderDetailStatusChipTone;
};

const MAX_CHIPS = 4;

function normalizeLabelKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function relationshipChip(stageRaw: string): ProviderDetailStatusChip | null {
  const stage = normalizeProviderRelationshipStage(stageRaw);
  if (!stage) return null;

  if (stage === "dormant" || stage === "archived") {
    return { id: "relationship-dormant", label: PROVIDER_DETAIL_CHIP_LABEL.dormant, tone: "muted" };
  }
  if (stage === "established_customer") {
    return {
      id: "relationship-established",
      label: PROVIDER_DETAIL_CHIP_LABEL.establishedCustomer,
      tone: "success",
    };
  }
  if (stage === "active_relationship") {
    return {
      id: "relationship-active",
      label: PROVIDER_DETAIL_CHIP_LABEL.activeRelationship,
      tone: "brand",
    };
  }
  if (stage === "active_evaluation") {
    return {
      id: "relationship-evaluation",
      label: "Active evaluation",
      tone: "brand",
    };
  }
  if (stage === "early_discovery") {
    return {
      id: "relationship-early",
      label: PROVIDER_DETAIL_CHIP_LABEL.commercialDiscovery,
      tone: "neutral",
    };
  }

  return null;
}

function intelligenceChip(status: IntelligenceStrengthLabel): ProviderDetailStatusChip | null {
  if (status === "Strong") {
    return {
      id: "intel-strong",
      label: PROVIDER_DETAIL_CHIP_LABEL.strongCommercialUnderstanding,
      tone: "success",
    };
  }
  if (status === "Building") {
    return {
      id: "intel-building",
      label: PROVIDER_DETAIL_CHIP_LABEL.intelligenceBuilding,
      tone: "brand",
    };
  }
  return {
    id: "intel-discovery",
    label: PROVIDER_DETAIL_CHIP_LABEL.discoveryNeeded,
    tone: "neutral",
  };
}

function pushChip(
  chips: ProviderDetailStatusChip[],
  seen: Set<string>,
  chip: ProviderDetailStatusChip | null,
): void {
  if (!chip || chips.length >= MAX_CHIPS) return;
  const key = normalizeLabelKey(chip.label);
  if (seen.has(key)) return;
  seen.add(key);
  chips.push(chip);
}

/**
 * Builds up to 4 concise commercial workflow chips for Provider Detail header.
 * Drops duplicate labels when relationship and intelligence states align.
 */
export function buildProviderDetailStatusChips(input: {
  relationshipStage: string;
  intelligenceOverall: IntelligenceStrengthLabel;
  planningStatus?: ProviderPlanningStatus | null;
  momentum?: ProviderCommercialMomentum | null;
}): ProviderDetailStatusChip[] {
  const chips: ProviderDetailStatusChip[] = [];
  const seen = new Set<string>();
  const stage = input.relationshipStage.trim().toLowerCase();

  if (input.momentum) {
    pushChip(chips, seen, {
      id: `momentum-${input.momentum.state}`,
      label: input.momentum.label,
      tone: providerCommercialMomentumChipTone(input.momentum.tone),
    });
  } else if (stage !== "dormant" && stage !== "archived") {
    pushChip(chips, seen, intelligenceChip(input.intelligenceOverall));
  }

  if (input.planningStatus === "needs_update" && stage !== "dormant" && stage !== "archived") {
    pushChip(chips, seen, {
      id: "needs-follow-up",
      label: PROVIDER_DETAIL_CHIP_LABEL.needsFollowUp,
      tone: "warn",
    });
  }

  if (!input.momentum) {
    pushChip(chips, seen, relationshipChip(stage));
  }

  return chips;
}

export function providerDetailStatusChipClassName(tone: ProviderDetailStatusChipTone): string {
  if (tone === "success") return " provider-hd-badge--ok";
  if (tone === "brand") return " provider-hd-badge--brand";
  if (tone === "warn") return " provider-hd-badge--warn";
  if (tone === "muted") return " provider-hd-badge--muted";
  return "";
}
