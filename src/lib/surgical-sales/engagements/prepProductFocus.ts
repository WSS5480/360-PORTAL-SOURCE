import { resolveIntroCallProductPrepBundle } from "@/lib/surgical-sales/engagements/introCallProductContext";
import { resolveExplicitPrepProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export const PREP_PRODUCT_FOCUS_NONE_LABEL = "No product / portfolio discovery";

export const PREP_PRODUCT_FOCUS_NONE_SUMMARY =
  "Procedure fit, workflow friction, access path, and observation — before product alignment.";

/** Short guidance shown when a product focus is intentionally selected. */
export const PREP_PRODUCT_FOCUS_GUIDANCE: Record<
  PreCallPlanProductLine,
  { label: string; summary: string }
> = {
  ACSIS: {
    label: "ACSIS",
    summary: "Hernia and fixation workflow — ventral closure, tack vs suture habits, evaluation case profile.",
  },
  BioTissue: {
    label: "BioTissue",
    summary: "Chronic and advanced wound workflow — biologic selection, clinic throughput, committee path.",
  },
  Merakris: {
    label: "Merakris",
    summary: "Chronic wound skin-substitute workflow — NPWT and dressing rules, clinic throughput, committee path.",
  },
  TelaBio: {
    label: "TelaBio",
    summary: "Fascial reinforcement workflow — robotic ventral closure and reinforcement evaluation fit.",
  },
  "Skeletal Dynamics": {
    label: "Skeletal Dynamics",
    summary: "Distal extremity fixation workflow — trauma trays, implant profile, evaluation case mix.",
  },
  Endolumik: {
    label: "Endolumik",
    summary: "Foregut and bougie workflow — sizing confirmation, staff training load, robotic case fit.",
  },
};

export function resolvePrepProductFocusView(input: {
  productLine?: string | null;
  providerSpecialty?: string | null;
}): {
  mode: "workflow_discovery" | "product_focus";
  productLine: PreCallPlanProductLine | "";
  label: string;
  summary: string;
  workflowFocus: string | null;
} {
  const productLine = resolveExplicitPrepProductLine(input.productLine);
  if (!productLine) {
    return {
      mode: "workflow_discovery",
      productLine: "",
      label: PREP_PRODUCT_FOCUS_NONE_LABEL,
      summary: PREP_PRODUCT_FOCUS_NONE_SUMMARY,
      workflowFocus: null,
    };
  }
  const meta = PREP_PRODUCT_FOCUS_GUIDANCE[productLine];
  const bundle = resolveIntroCallProductPrepBundle({
    productLine,
    providerSpecialty: input.providerSpecialty,
  });
  return {
    mode: "product_focus",
    productLine,
    label: meta.label,
    summary: meta.summary,
    workflowFocus: bundle.workflowFocus,
  };
}
