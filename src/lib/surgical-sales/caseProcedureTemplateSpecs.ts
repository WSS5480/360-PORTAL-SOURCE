export type CaseTemplateLineSpec = {
  product_name: string;
  sku: string;
  expected_quantity: number;
};

export type CaseProcedureTemplateSpec = {
  id: string;
  label: string;
  description: string;
  procedure_type: string;
  lines: CaseTemplateLineSpec[];
};

export const CASE_PROCEDURE_TEMPLATE_SPECS: CaseProcedureTemplateSpec[] = [
  {
    id: "bariatric_endolumik",
    label: "Bariatric (Endolumik)",
    description: "Typical calibration tubes for sleeve gastrectomy — adjust quantities before saving.",
    procedure_type: "Bariatric — sleeve gastrectomy",
    lines: [
      { product_name: "Endolumik", sku: "EGCT40", expected_quantity: 1 },
      { product_name: "Endolumik", sku: "EGCT36", expected_quantity: 1 },
    ],
  },
  {
    id: "hernia_telabio",
    label: "Hernia (TelaBio)",
    description: "Hernia repair starter line — swap SKU when catalog is finalized.",
    procedure_type: "Hernia repair",
    lines: [{ product_name: "TelaBio", sku: "PLACEHOLDER-TELABIO", expected_quantity: 1 }],
  },
  {
    id: "orthopedic_skeletal",
    label: "Orthopedic (Skeletal Dynamics)",
    description: "Orthopedic / trauma placeholder SKU — replace when catalog is finalized.",
    procedure_type: "Orthopedic — bone fixation / trauma",
    lines: [{ product_name: "Skeletal Dynamics", sku: "PLACEHOLDER-SKELETAL-DYNAMICS", expected_quantity: 1 }],
  },
];

export type ResolvedCaseProcedureTemplateLine = {
  product_id: string;
  product_name: string;
  sku_id: string;
  sku: string;
  description: string | null;
  expected_quantity: number;
};

export type ResolvedCaseProcedureTemplate = {
  id: string;
  label: string;
  description: string;
  procedure_type: string;
  lines: ResolvedCaseProcedureTemplateLine[];
};
