import { buildProductSupportOverviewBrief } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import {
  PRODUCT_SUPPORT_CASE_RESULT_LABELS,
  PRODUCT_SUPPORT_NEXT_STEP_LABELS,
  PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS,
  parseProductSupportCaseResult,
  parseProductSupportNextStep,
  parseProductSupportProviderReaction,
} from "@/lib/surgical-sales/productSupportCaseMoments";

export type ProductSupportFollowUpRecommendation = {
  id: string;
  text: string;
  source: string;
};

function readMomentLabels(caseRow: Record<string, unknown>) {
  const reaction = parseProductSupportProviderReaction(caseRow.case_support_provider_reaction as string | null | undefined);
  const result = parseProductSupportCaseResult(caseRow.case_support_case_result as string | null | undefined);
  const nextStep = parseProductSupportNextStep(caseRow.case_support_next_step as string | null | undefined);
  return {
    reaction: reaction ? PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS[reaction] : null,
    result: result ? PRODUCT_SUPPORT_CASE_RESULT_LABELS[result] : null,
    nextStep: nextStep ? PRODUCT_SUPPORT_NEXT_STEP_LABELS[nextStep] : null,
  };
}

export function buildProductSupportFollowUpRecommendations(input: {
  caseRow: Record<string, unknown>;
  procedureType?: string | null;
  supportType: string;
  products: ProductSupportOverviewProductLine[];
  operationalContext?: CaseOperationalContextView | null;
  linkedOpportunityHref?: string | null;
  status?: string | null;
  requiresBillingDocuments?: boolean;
  bill?: {
    po_uploaded: boolean;
    invoice_uploaded: boolean;
    quantities_confirmed: boolean;
    readiness?: import("@/lib/surgical-sales/billingReadiness").BillingReadinessLevel;
  } | null;
}): ProductSupportFollowUpRecommendation[] {
  const items: ProductSupportFollowUpRecommendation[] = [];
  const seen = new Set<string>();

  function push(text: string, source: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ id: `${source}:${key.slice(0, 32)}`, text: trimmed, source });
  }

  const bill = input.bill
    ? {
        ...input.bill,
        readiness:
          input.bill.readiness ??
          (input.bill.po_uploaded && input.bill.invoice_uploaded && input.bill.quantities_confirmed
            ? "ready"
            : input.bill.po_uploaded || input.bill.invoice_uploaded || input.bill.quantities_confirmed
              ? "partial"
              : "blocked"),
      }
    : input.bill;
  const brief = buildProductSupportOverviewBrief({ ...input, bill });
  for (const followUp of brief.followUps) {
    push(followUp, "Case evidence");
  }

  const suggested = String(input.caseRow.debrief_suggested_next_action ?? "").trim();
  if (suggested) push(suggested, "Captured on case");

  const moments = readMomentLabels(input.caseRow);
  if (moments.nextStep && moments.nextStep !== "No Next Step") {
    push(moments.nextStep, "Case outcome");
  }
  if (moments.result === "Follow Up Needed") {
    push("Follow up with surgeon on open case items", "Case outcome");
  }
  if (moments.reaction === "Positive") {
    push("Send literature or reinforcement while momentum is high", "Case outcome");
  }

  const defaults = [
    "Send literature if requested during the case",
    "Schedule debrief when follow-up topics remain open",
    "Confirm product evaluation next steps with surgeon",
    "Arrange staff training if requested",
  ];
  for (const item of defaults) {
    if (items.length >= 8) break;
    push(item, "Suggested");
  }

  return items.slice(0, 8);
}
