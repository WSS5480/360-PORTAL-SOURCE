/**
 * FedEx Express packaging presets with standard dimensions (exterior, inches).
 * Used to pre-fill package dimensions when creating labels.
 * FedEx One Rate / standard packaging specs.
 */
export type FedExPackagePreset = {
  id: string;
  label: string;
  /** FedEx API packagingType (for Express) or null to use dimensions with YOUR_PACKAGING */
  fedexPackagingType: string | null;
  /** Dimensions: length x width x height (inches) */
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  /** Default weight (lbs) - user can override */
  defaultWeightLbs: number;
};

export const FEDEX_PACKAGE_PRESETS: FedExPackagePreset[] = [
  {
    id: "custom",
    label: "Custom (enter dimensions)",
    fedexPackagingType: null,
    lengthIn: 0,
    widthIn: 0,
    heightIn: 0,
    defaultWeightLbs: 1,
  },
  {
    id: "FEDEX_ENVELOPE",
    label: "FedEx Envelope",
    fedexPackagingType: "FEDEX_ENVELOPE",
    lengthIn: 12.5,
    widthIn: 9.5,
    heightIn: 1,
    defaultWeightLbs: 1,
  },
  {
    id: "FEDEX_PAK",
    label: "FedEx Pak",
    fedexPackagingType: "FEDEX_PAK",
    lengthIn: 15.5,
    widthIn: 12,
    heightIn: 2,
    defaultWeightLbs: 2,
  },
  {
    id: "FEDEX_EXTRA_SMALL_BOX",
    label: "FedEx Extra Small Box",
    fedexPackagingType: "FEDEX_EXTRA_SMALL_BOX",
    lengthIn: 12.5,
    widthIn: 10.5,
    heightIn: 1.25,
    defaultWeightLbs: 2,
  },
  {
    id: "FEDEX_SMALL_BOX",
    label: "FedEx Small Box",
    fedexPackagingType: "FEDEX_SMALL_BOX",
    lengthIn: 12.375,
    widthIn: 10.875,
    heightIn: 1.5,
    defaultWeightLbs: 5,
  },
  {
    id: "FEDEX_MEDIUM_BOX",
    label: "FedEx Medium Box",
    fedexPackagingType: "FEDEX_MEDIUM_BOX",
    lengthIn: 13.25,
    widthIn: 11.5,
    heightIn: 2.375,
    defaultWeightLbs: 10,
  },
  {
    id: "FEDEX_LARGE_BOX",
    label: "FedEx Large Box",
    fedexPackagingType: "FEDEX_LARGE_BOX",
    lengthIn: 17.5,
    widthIn: 12.375,
    heightIn: 3,
    defaultWeightLbs: 15,
  },
  {
    id: "FEDEX_EXTRA_LARGE_BOX",
    label: "FedEx Extra Large Box",
    fedexPackagingType: "FEDEX_EXTRA_LARGE_BOX",
    lengthIn: 18,
    widthIn: 13,
    heightIn: 6,
    defaultWeightLbs: 20,
  },
  {
    id: "FEDEX_TUBE",
    label: "FedEx Tube",
    fedexPackagingType: "FEDEX_TUBE",
    lengthIn: 38,
    widthIn: 6,
    heightIn: 6,
    defaultWeightLbs: 5,
  },
];

export function getFedExPresetById(id: string): FedExPackagePreset | null {
  return FEDEX_PACKAGE_PRESETS.find((p) => p.id === id) ?? null;
}

/** Find a preset whose dimensions match (within 0.1" tolerance). Returns null if no match. */
export function findPresetByDimensions(
  lengthIn: number,
  widthIn: number,
  heightIn: number
): FedExPackagePreset | null {
  const tol = 0.1;
  const presets = FEDEX_PACKAGE_PRESETS.filter((p) => p.id !== "custom" && p.lengthIn > 0);
  for (const p of presets) {
    if (
      Math.abs(p.lengthIn - lengthIn) <= tol &&
      Math.abs(p.widthIn - widthIn) <= tol &&
      Math.abs(p.heightIn - heightIn) <= tol
    ) {
      return p;
    }
  }
  return null;
}
