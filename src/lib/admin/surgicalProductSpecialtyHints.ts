export type SurgicalProductSpecialtyHint = {
  /** Lowercase terms as they commonly appear on distributor websites. */
  terms: string[];
  labels: string[];
  weight: number;
};

/** Canonical product/brand → primary clinical specialty. Used for website product extraction. */
export type KnownProductMapping = {
  /** Display name in the CRM product catalog */
  name: string;
  /** Lowercase match terms found on distributor websites */
  terms: string[];
  specialty: string;
  /** Drop these other canonical product names when this mapping matches */
  suppresses?: string[];
};

/**
 * Known product lines with explicit specialty assignments.
 * Keep brands separate — do not bucket unrelated products under one specialty.
 */
export const KNOWN_PRODUCT_MAPPINGS: KnownProductMapping[] = [
  {
    name: "ACSIS",
    terms: ["acsis", "adjustable curve suction irrigation"],
    specialty: "General Surgery",
    suppresses: ["Platform Innovations"],
  },
  {
    name: "Platform Innovations",
    terms: ["platform innovations"],
    specialty: "General Surgery",
  },
  {
    name: "TelaBio",
    terms: ["telabio", "ovitex"],
    specialty: "Hernia Repair",
  },
  {
    name: "Phasix",
    terms: ["phasix"],
    specialty: "Hernia Repair",
  },
  {
    name: "Ventralight",
    terms: ["ventralight"],
    specialty: "Hernia Repair",
  },
  {
    name: "Skeletal Dynamics",
    terms: ["skeletal dynamics"],
    specialty: "Orthopedics",
  },
  {
    name: "Acumed",
    terms: ["acumed"],
    specialty: "Orthopedics",
  },
  {
    name: "Endolumik",
    terms: ["endolumik"],
    specialty: "Bariatric Surgery",
  },
  {
    name: "Membrane Wrap",
    terms: ["membrane wrap"],
    specialty: "Wound Care",
  },
  {
    name: "Amchoplast",
    terms: ["amchoplast"],
    specialty: "Wound Care",
  },
  {
    name: "Dermacyte",
    terms: ["dermacyte"],
    specialty: "Wound Care",
  },
  {
    name: "Ultramist",
    terms: ["ultramist"],
    specialty: "Wound Care",
  },
  {
    name: "BioTissue",
    terms: ["biotissue"],
    specialty: "Wound Care",
  },
  {
    name: "Merakris",
    terms: ["merakris"],
    specialty: "Wound Care",
    suppresses: ["Dermacyte"],
  },
  {
    name: "Biolab",
    terms: ["biolab"],
    specialty: "Wound Care",
  },
  {
    name: "Strattice",
    terms: ["strattice"],
    specialty: "Wound Care",
  },
  {
    name: "GalaFlex",
    terms: ["gala flex", "galaflex"],
    specialty: "Breast Surgery",
  },
];

/**
 * Terms that help infer site-wide specialties but are NOT standalone CRM products.
 * Example: "hernia mesh" signals Hernia Repair without creating a product row.
 */
export const SPECIALTY_ONLY_SIGNALS: SurgicalProductSpecialtyHint[] = [
  {
    terms: [
      "hernia mesh",
      "hernia repair",
      "abdominal wall reconstruction",
      "inguinal hernia",
      "ventral hernia",
      "bard mesh",
      "parietex",
      "progrip",
      "symbotex",
    ],
    labels: ["Hernia Repair"],
    weight: 4,
  },
  {
    terms: [
      "amniotic membrane",
      "skin substitute",
      "biologic matrix",
      "tissue matrix",
      "advanced wound",
      "wound healing",
    ],
    labels: ["Wound Care"],
    weight: 3,
  },
  {
    terms: ["intragastric balloon", "endoluminal balloon", "gastric balloon", "gastric calibration"],
    labels: ["Bariatric Surgery"],
    weight: 4,
  },
  {
    terms: ["extremity fixation", "fracture plate", "distal radius plate", "joint replacement"],
    labels: ["Orthopedics"],
    weight: 4,
  },
  {
    terms: ["breast reconstruction matrix", "oncoplastic", "mastectomy"],
    labels: ["Breast Surgery"],
    weight: 4,
  },
];

/** @deprecated Use KNOWN_PRODUCT_MAPPINGS + SPECIALTY_ONLY_SIGNALS. Kept for specialty scoring. */
export const SURGICAL_PRODUCT_SPECIALTY_HINTS: SurgicalProductSpecialtyHint[] = [
  ...KNOWN_PRODUCT_MAPPINGS.map((mapping) => ({
    terms: mapping.terms,
    labels: [mapping.specialty],
    weight: 5,
  })),
  ...SPECIALTY_ONLY_SIGNALS,
];
