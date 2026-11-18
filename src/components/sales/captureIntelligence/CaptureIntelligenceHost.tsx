/**

 * Log update — entry point for the note-and-approve workflow shell.

 */

export { AiNoteCaptureHost as CaptureIntelligenceHost } from "@/components/sales/aiNoteCapture/AiNoteCaptureHost";

export { useAiNoteCapture as useCaptureIntelligence } from "@/components/sales/aiNoteCapture/AiNoteCaptureHost";



import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";

import {

  type CaptureIntelligenceLaunchSurface,

  withCaptureLaunchSurface,

} from "@/lib/surgical-sales/captureIntelligenceLaunch";



export function buildCaptureIntelligenceOpenContext(

  surface: CaptureIntelligenceLaunchSurface,

  ctx: Omit<AiNoteCaptureContext, "launchSurface"> = {},

): AiNoteCaptureContext {

  return withCaptureLaunchSurface(ctx, surface);

}

export {
  buildIntelligenceCaptureScopeFromEngagement,
  buildLogUpdateContextFromEngagementScope,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";


