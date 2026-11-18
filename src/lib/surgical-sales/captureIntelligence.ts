import type { AiNoteCaptureClassification } from "@/lib/surgical-sales/aiNoteCapture/types";
import {
  captureIntelligenceLaunchConfig,
  inferCaptureIntelligenceLaunchSurface,
  type CaptureIntelligenceLaunchSurface,
} from "@/lib/surgical-sales/captureIntelligenceLaunch";

export type { CaptureIntelligenceLaunchSurface };

import { LOG_UPDATE_BUTTON_LABEL } from "@/lib/surgical-sales/logUpdateUx";

export const CAPTURE_INTELLIGENCE_TITLE = LOG_UPDATE_BUTTON_LABEL;
export const CAPTURE_INTELLIGENCE_FAB_LABEL = LOG_UPDATE_BUTTON_LABEL;
export const CAPTURE_INTELLIGENCE_SHORT_LABEL = LOG_UPDATE_BUTTON_LABEL;

export function captureIntelligenceTitleForContext(ctx: {
  launchSurface?: CaptureIntelligenceLaunchSurface;
  caseId?: string;
  providerId?: string;
  opportunityId?: string;
  organizationId?: string;
}): string {
  return captureIntelligenceLaunchConfig(inferCaptureIntelligenceLaunchSurface(ctx)).title;
}

export function captureIntelligenceReviewHintForContext(ctx: {
  launchSurface?: CaptureIntelligenceLaunchSurface;
  caseId?: string;
  providerId?: string;
  opportunityId?: string;
  organizationId?: string;
}): string {
  return captureIntelligenceLaunchConfig(inferCaptureIntelligenceLaunchSurface(ctx)).reviewHint;
}

/** Primary review destinations shown in the review step. */
export const CAPTURE_INTELLIGENCE_REVIEW_SECTIONS: Array<{
  id: string;
  label: string;
  categories: AiNoteCaptureClassification[];
}> = [
  {
    id: "provider_intelligence",
    label: "Provider understanding",
    categories: ["provider_intelligence", "workflow_field_suggestion"],
  },
  { id: "case_note", label: "Case Note", categories: ["case_observation"] },
  { id: "opportunity_signal", label: "Product fit update", categories: ["opportunity_signal"] },
  {
    id: "organization_intelligence",
    label: "Organization Intelligence",
    categories: ["organization_intelligence"],
  },
  { id: "task", label: "Task", categories: ["follow_up_task"] },
  { id: "product_usage", label: "Product Usage", categories: ["product_usage"] },
];

export function captureIntelligenceSectionForCategory(
  category: AiNoteCaptureClassification,
): (typeof CAPTURE_INTELLIGENCE_REVIEW_SECTIONS)[number] | null {
  for (const section of CAPTURE_INTELLIGENCE_REVIEW_SECTIONS) {
    if (section.categories.includes(category)) return section;
  }
  if (category === "competitive_intelligence") {
    return CAPTURE_INTELLIGENCE_REVIEW_SECTIONS.find((s) => s.id === "provider_intelligence") ?? null;
  }
  if (category === "resource_or_document_note") {
    return CAPTURE_INTELLIGENCE_REVIEW_SECTIONS.find((s) => s.id === "case_note") ?? null;
  }
  return null;
}

export function groupItemsByCaptureIntelligenceSection<T extends { category: AiNoteCaptureClassification }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const section of CAPTURE_INTELLIGENCE_REVIEW_SECTIONS) {
    map.set(section.id, []);
  }
  map.set("other", []);
  for (const item of items) {
    const section = captureIntelligenceSectionForCategory(item.category);
    const key = section?.id ?? "other";
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
