"use client";

import type { ReactNode } from "react";
import { CaptureIntelligenceHost } from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { SalesCmdMobileMenuFallback } from "@/components/sales/SalesCmdMobileMenuFallback";
import { aiNoteCaptureCss } from "@/components/sales/aiNoteCapture/aiNoteCaptureCss";
import { surgicalCasesListMobileCss } from "@/app/portal/sales/cases/surgicalCasesListMobileCss";
import { salesCommandNativeCss } from "@/app/portal/sales/salesCommandNativeCss";
import { salesCommandDesktopScaleCss } from "@/app/portal/sales/salesCommandDesktopScaleCss";
import { salesPortalMobileCss } from "@/app/portal/sales/salesPortalMobileCss";
import { opportunitiesListMobileCss } from "@/app/portal/sales/opportunities/opportunitiesListMobileCss";
import { salesCmdMobileMenuCss } from "@/app/portal/sales/salesCmdMobileMenuCss";
import { salesAnalyticsMobileCss } from "@/app/portal/sales/analytics/salesAnalyticsMobileCss";
import { salesRevenuePipelineCss } from "@/app/portal/sales/pipeline/salesRevenuePipelineCss";
import { salesContactDetailMobileCss } from "@/app/portal/sales/contacts/salesContactDetailMobileCss";
import { contactRelationshipProfileCss } from "@/app/portal/sales/contacts/contactRelationshipProfileCss";
import { salesTimeOffMobileCss } from "@/app/portal/sales/time-off/salesTimeOffMobileCss";
import { engagementsListMobileCss } from "@/app/portal/sales/engagements/engagementsListMobileCss";
import { missionControlCss } from "@/app/portal/sales/missionControl";
import { salesMobileReadinessCss } from "@/app/portal/sales/salesMobileReadinessCss";
import { salesMobileTypeFloorCss } from "@/app/portal/sales/salesMobileTypeFloorCss";

// Readiness floors go last so they win over per-page rules of equal specificity.
const salesCommandGlobalNativeCss = `${missionControlCss}\n${salesCommandNativeCss}\n${surgicalCasesListMobileCss}\n${salesPortalMobileCss}\n${opportunitiesListMobileCss}\n${salesCommandDesktopScaleCss}\n${salesCmdMobileMenuCss}\n${salesAnalyticsMobileCss}\n${salesRevenuePipelineCss}\n${salesContactDetailMobileCss}\n${contactRelationshipProfileCss}\n${salesTimeOffMobileCss}\n${engagementsListMobileCss}\n${aiNoteCaptureCss}\n${salesMobileReadinessCss}`;

export function SalesCommandChrome({ children }: { children: ReactNode }) {
  return (
    <CaptureIntelligenceHost>
      <style dangerouslySetInnerHTML={{ __html: salesCommandGlobalNativeCss }} />
      <SalesCmdMobileMenuFallback />
      {children}
      {/* Pages inject their own <style> tags, so the type floor has to come after them to win ties. */}
      <style dangerouslySetInnerHTML={{ __html: salesMobileTypeFloorCss }} />
    </CaptureIntelligenceHost>
  );
}
