/**



 * Standardized field-operations CTA labels for provider overview surfaces.



 */







import { PROVIDER_FIELD_OPS_CTA } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";



import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";







/** Primary field actions */



export const FIELD_OPS_PRIMARY_CTA = {



  scheduleIntroCall: PROVIDER_FIELD_OPS_CTA.scheduleIntroCall,



  logTouchpoint: PROVIDER_FIELD_OPS_CTA.logFieldUpdate,



  startObservation: PROVIDER_FIELD_OPS_CTA.startObservation,



  supportCase: PROVIDER_FIELD_OPS_CTA.supportCase,



  debriefTouchpoint: PROVIDER_FIELD_OPS_CTA.debriefTouchpoint,



} as const;







/** Secondary / navigation actions */



export const FIELD_OPS_SECONDARY_CTA = {



  openFieldBriefing: "Open Field Briefing",



  viewIntelligence: PROVIDER_FIELD_OPS_CTA.openIntelligenceMap,



  addOperationalNote: PROVIDER_FIELD_OPS_CTA.addFieldNote,



  logUpdate: PROVIDER_FIELD_OPS_CTA.logFieldUpdate,



  newEngagement: PROVIDER_FIELD_OPS_CTA.startEngagement,



} as const;







export function normalizeFieldOpsPrimaryCta(raw: string): string {



  const t = raw.trim().toLowerCase();



  if (!t) return FIELD_OPS_PRIMARY_CTA.scheduleIntroCall;







  if (t.includes("access follow-up") || t.includes("follow-up")) {
    return "Start Access Follow-Up";
  }

  if (t.includes("debrief")) return FIELD_OPS_PRIMARY_CTA.debriefTouchpoint;



  if (t.includes("intro call") || t.includes("intro") || t.includes("schedule engagement")) {



    return FIELD_OPS_PRIMARY_CTA.scheduleIntroCall;



  }



  if (t.includes("observation request") || t.includes("request or observation")) {



    return FIELD_OPS_PRIMARY_CTA.startObservation;



  }



  if (t.includes("or observation") || t.includes("start observation")) {



    return FIELD_OPS_PRIMARY_CTA.startObservation;



  }



  if (t.includes("support case") || (t.includes("case") && !t.includes("schedule"))) {



    return FIELD_OPS_PRIMARY_CTA.supportCase;



  }



  if (t.includes("log touchpoint") || t.includes("log update") || t.includes("log field")) {



    return FIELD_OPS_PRIMARY_CTA.logTouchpoint;



  }



  if (t.includes("field briefing") || t.includes("tactical briefing") || t.includes("open briefing") || t.includes("prepare")) {



    return FIELD_OPS_SECONDARY_CTA.openFieldBriefing;



  }



  if (t.includes("intelligence") || t.includes("understanding")) {



    return FIELD_OPS_SECONDARY_CTA.viewIntelligence;



  }



  if (t.includes("note")) return FIELD_OPS_SECONDARY_CTA.addOperationalNote;







  return scanLine(raw, 32);



}







export function normalizeFieldOpsSecondaryCta(raw: string | null | undefined): string | null {



  if (!raw?.trim()) return null;



  const t = raw.trim().toLowerCase();



  if (t.includes("engagement")) return FIELD_OPS_PRIMARY_CTA.scheduleIntroCall;



  if (t.includes("briefing")) return FIELD_OPS_SECONDARY_CTA.openFieldBriefing;



  if (t.includes("intelligence")) return FIELD_OPS_SECONDARY_CTA.viewIntelligence;



  return scanLine(raw, 28);



}




