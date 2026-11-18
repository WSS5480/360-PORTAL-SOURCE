import type {
  CaseOperationalContextView,
  CaseReadinessDimension,
} from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import { operationalVisibilityStateLabel } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import type { BillingReadinessLevel } from "@/lib/surgical-sales/billingReadiness";

export type ProductSupportOverviewProductLine = {
  id: string;
  name: string;
  skuCode?: string | null;
  expectedQuantity?: number | null;
  actualQuantity?: number | null;
};

export type ProductSupportReadinessRow = {
  id: string;
  label: string;
  summary: string;
  state: OperationalVisibilityState;
  stateLabel: string;
};

export type ProductSupportOverviewBrief = {
  procedureLabel: string;
  supportReason: string;
  products: ProductSupportOverviewProductLine[];
  readiness: ProductSupportReadinessRow[];
  followUps: string[];
};

function pushUnique(target: string[], seen: Set<string>, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(trimmed);
}

function readBool(caseRow: Record<string, unknown>, key: string): boolean {
  const value = caseRow[key];
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function formatQuantityStatus(line: ProductSupportOverviewProductLine): string {
  const sku = line.skuCode?.trim();
  const skuPart = sku ? `SKU ${sku}` : null;

  const expected = line.expectedQuantity;
  const actual = line.actualQuantity;
  const hasExpected = expected != null && Number.isFinite(Number(expected));
  const hasActual = actual != null && Number.isFinite(Number(actual));

  let qtyPart = "Quantity pending";
  if (hasActual && hasExpected) {
    qtyPart = `Used ${actual} of ${expected} expected`;
  } else if (hasActual) {
    qtyPart = `Used ${actual}`;
  } else if (hasExpected) {
    qtyPart = `Expected ${expected}`;
  }

  return [skuPart, qtyPart].filter(Boolean).join(" · ");
}

function findDimension(
  context: CaseOperationalContextView | null | undefined,
  id: CaseReadinessDimension["id"],
): CaseReadinessDimension | null {
  return context?.dimensions.find((dimension) => dimension.id === id) ?? null;
}

function readinessRow(
  id: string,
  label: string,
  summary: string,
  state: OperationalVisibilityState,
): ProductSupportReadinessRow {
  return {
    id,
    label,
    summary,
    state,
    stateLabel: operationalVisibilityStateLabel(state),
  };
}

function credentialingAccessRow(
  caseRow: Record<string, unknown>,
  context: CaseOperationalContextView | null | undefined,
): ProductSupportReadinessRow {
  const cred = String(caseRow.observation_access_credentialing ?? "unknown").trim().toLowerCase();
  const pathway = String(caseRow.observation_access_pathway ?? "").trim();
  const facilityAccess = context?.facility.items.find((item) =>
    /credential|vendor access|or access|access rule/i.test(item.label),
  );
  const facilityCred = context?.facility.items.find((item) => /credential/i.test(item.label));

  if (cred === "verified") {
    return readinessRow(
      "credentialing_access",
      "Credentialing/access",
      "Vendor credentialing verified for case day",
      "strong",
    );
  }
  if (cred === "not_required") {
    return readinessRow(
      "credentialing_access",
      "Credentialing/access",
      "Vendor access confirmed — credentialing not required",
      "strong",
    );
  }
  if (cred === "in_progress") {
    return readinessRow(
      "credentialing_access",
      "Credentialing/access",
      "Credentialing in progress",
      "developing",
    );
  }
  if (cred === "required_not_started") {
    return readinessRow(
      "credentialing_access",
      "Credentialing/access",
      "Start vendor credentialing before case day",
      "early",
    );
  }
  if (pathway) {
    return readinessRow("credentialing_access", "Credentialing/access", pathway, "developing");
  }
  if (facilityAccess?.value) {
    return readinessRow(
      "credentialing_access",
      "Credentialing/access",
      facilityAccess.value,
      facilityAccess.inherited ? "developing" : "strong",
    );
  }
  if (facilityCred?.value) {
    return readinessRow(
      "credentialing_access",
      "Credentialing/access",
      facilityCred.value,
      facilityCred.inherited ? "developing" : "strong",
    );
  }
  return readinessRow(
    "credentialing_access",
    "Credentialing/access",
    "Confirm vendor credentialing and OR access",
    "early",
  );
}

function dimensionReadinessRow(
  id: CaseReadinessDimension["id"],
  label: string,
  context: CaseOperationalContextView | null | undefined,
  fallbackSummary: string,
): ProductSupportReadinessRow {
  const dimension = findDimension(context, id);
  if (dimension) {
    return readinessRow(id, label, dimension.line, dimension.status);
  }
  return readinessRow(id, label, fallbackSummary, "early");
}

function classifySuggestedFollowUp(text: string): string | null {
  const lower = text.toLowerCase();
  if (/document|po|invoice|paperwork|billing/.test(lower)) return "Documentation follow-up";
  if (/reorder|replen|restock/.test(lower)) return "Reorder follow-up";
  if (/evaluat|trial|demo/.test(lower)) return "Evaluation follow-up";
  if (/product|usage|feedback|fit/.test(lower)) return "Product feedback follow-up";
  if (/surgeon|provider|staff|callback|call back|follow up with/.test(lower)) return "Surgeon follow-up";
  return null;
}

export function buildProductSupportOverviewBrief(input: {
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
    readiness: BillingReadinessLevel;
  } | null;
}): ProductSupportOverviewBrief {
  const followUps: string[] = [];
  const followUpSeen = new Set<string>();
  const status = String(input.status ?? input.caseRow.status ?? "").trim().toLowerCase();
  const followUpNeeded = readBool(input.caseRow, "follow_up_needed");
  const suggestedAction = String(input.caseRow.debrief_suggested_next_action ?? "").trim();
  const hasProducts = input.products.length > 0;

  if (followUpNeeded && hasProducts) {
    pushUnique(followUps, followUpSeen, "Product feedback follow-up");
  }
  if (followUpNeeded) {
    pushUnique(followUps, followUpSeen, "Surgeon follow-up");
  }

  if (suggestedAction) {
    const classified = classifySuggestedFollowUp(suggestedAction);
    if (classified) {
      pushUnique(followUps, followUpSeen, classified);
    } else {
      pushUnique(followUps, followUpSeen, suggestedAction);
    }
  }

  if (input.linkedOpportunityHref) {
    pushUnique(followUps, followUpSeen, "Evaluation follow-up — related evaluation linked");
  }

  if (status === "docs_needed") {
    pushUnique(followUps, followUpSeen, "Documentation follow-up — case paperwork due");
  }

  if (input.requiresBillingDocuments && input.bill) {
    if (!input.bill.po_uploaded) {
      pushUnique(followUps, followUpSeen, "Documentation follow-up — purchase order needed");
    }
    if (!input.bill.invoice_uploaded && ["completed", "docs_needed", "billing_review", "invoiced"].includes(status)) {
      pushUnique(followUps, followUpSeen, "Documentation follow-up — invoice needed");
    }
    if (!input.bill.quantities_confirmed && hasProducts) {
      pushUnique(followUps, followUpSeen, "Product feedback follow-up — confirm quantities used");
    }
  }

  const productNeeds = String(input.caseRow.case_product_needs ?? "").trim();
  if (/reorder|replen|restock/i.test(productNeeds)) {
    pushUnique(followUps, followUpSeen, "Reorder follow-up");
  }

  const context = input.operationalContext ?? null;
  const readiness: ProductSupportReadinessRow[] = [
    dimensionReadinessRow(
      "implants_on_site",
      "Product availability",
      context,
      "Confirm implants and sets are on site",
    ),
    dimensionReadinessRow(
      "trays_ready",
      "Tray/instrument status",
      context,
      "Confirm trays are sterilized and ready",
    ),
    credentialingAccessRow(input.caseRow, context),
    dimensionReadinessRow(
      "facility_logistics",
      "Facility logistics",
      context,
      "Confirm SPD, room, and delivery logistics",
    ),
  ];

  return {
    procedureLabel: input.procedureType?.trim() || "Procedure not set",
    supportReason: input.supportType.trim() || "Field product support",
    products: input.products,
    readiness,
    followUps,
  };
}

export function formatProductSupportOverviewLineStatus(line: ProductSupportOverviewProductLine): string {
  return formatQuantityStatus(line);
}
