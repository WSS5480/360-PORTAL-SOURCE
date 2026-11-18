import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import {
  LOG_UPDATE_BUTTON_LABEL,
  LOG_UPDATE_QUICK_CAPTURE_ACTION,
  LOG_UPDATE_REVIEW_ACTION,
} from "@/lib/surgical-sales/logUpdateUx";
import { PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI } from "@/lib/surgical-sales/providerProfileIntelligenceCaptureCopy";

export const CAPTURE_INTELLIGENCE_LAUNCH_SURFACES = [
  "global",
  "provider",
  "mission_board",
  "case",
  "opportunity",
  "organization",
] as const;

export type CaptureIntelligenceLaunchSurface = (typeof CAPTURE_INTELLIGENCE_LAUNCH_SURFACES)[number];

export type CaptureIntelligenceLaunchConfig = {
  title: string;
  reviewHint: string;
  composeTitle?: string;
  composeSubtitle?: string;
  composePlaceholder?: string;
  composeReviewCta?: string;
  composeQuickCaptureCta?: string;
  hidePhotoCapture?: boolean;
};

const LAUNCH_CONFIG: Record<CaptureIntelligenceLaunchSurface, CaptureIntelligenceLaunchConfig> = {
  global: {
    title: LOG_UPDATE_BUTTON_LABEL,
    reviewHint: "Uncheck anything you do not want to save.",
  },
  provider: {
    title: PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.title,
    reviewHint: "Updates apply to this provider's understanding. Uncheck anything you do not want to save.",
    composeTitle: PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.title,
    composeSubtitle: PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.subtitle,
    composePlaceholder: PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.placeholder,
    composeQuickCaptureCta: LOG_UPDATE_QUICK_CAPTURE_ACTION,
    composeReviewCta: PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.reviewCta,
    hidePhotoCapture: true,
  },
  mission_board: {
    title: "Field note",
    reviewHint: "Uncheck anything you do not want to save.",
    composeTitle: "Field note",
    composeSubtitle: "Dictate or type what you learned in the field.",
    composePlaceholder: "Who you spoke with, what changed, and what to do next…",
    composeQuickCaptureCta: LOG_UPDATE_QUICK_CAPTURE_ACTION,
    composeReviewCta: LOG_UPDATE_REVIEW_ACTION,
    hidePhotoCapture: true,
  },
  case: {
    title: LOG_UPDATE_BUTTON_LABEL,
    reviewHint: "Updates apply to this case. Uncheck anything you do not want to save.",
  },
  opportunity: {
    title: LOG_UPDATE_BUTTON_LABEL,
    reviewHint: "Updates apply to this evaluation. Uncheck anything you do not want to save.",
  },
  organization: {
    title: LOG_UPDATE_BUTTON_LABEL,
    reviewHint: "Updates apply to this facility. Uncheck anything you do not want to save.",
  },
};

/** Routes where the global capture FAB / quick menu must not appear (setup & onboarding). */
const CAPTURE_EXCLUDED_PATH_PATTERNS: RegExp[] = [
  /^\/portal\/sales\/providers\/new\/?$/,
  /^\/portal\/sales\/cases\/new\/?$/,
  /** Field briefing and case detail have contextual Log update — avoid fixed desktop overlap. */
  /^\/portal\/sales\/engagements\/[^/]+\/prepare\/?$/,
  /^\/portal\/sales\/cases\/[^/]+\/?$/,
];

export function isCaptureIntelligenceExcludedPath(pathname: string): boolean {
  const path = (pathname || "").split("?")[0].replace(/\/$/, "") || "/";
  return CAPTURE_EXCLUDED_PATH_PATTERNS.some((re) => re.test(path));
}

export function captureIntelligenceLaunchConfig(
  surface?: CaptureIntelligenceLaunchSurface | null,
): CaptureIntelligenceLaunchConfig {
  if (surface && surface in LAUNCH_CONFIG) return LAUNCH_CONFIG[surface];
  return LAUNCH_CONFIG.global;
}

export function inferCaptureIntelligenceLaunchSurface(
  ctx: AiNoteCaptureContext,
): CaptureIntelligenceLaunchSurface {
  if (ctx.launchSurface) return ctx.launchSurface;
  if (ctx.caseId) return "case";
  if (ctx.opportunityId && !ctx.caseId) return "opportunity";
  if (ctx.providerId && !ctx.organizationId && !ctx.caseId && !ctx.opportunityId) return "provider";
  if (ctx.organizationId) return "organization";
  return "global";
}

export function withCaptureLaunchSurface(
  ctx: AiNoteCaptureContext,
  surface: CaptureIntelligenceLaunchSurface,
): AiNoteCaptureContext {
  return { ...ctx, launchSurface: surface };
}
