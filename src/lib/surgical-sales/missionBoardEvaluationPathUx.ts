import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";

export const MISSION_BOARD_EVALUATION_PATH_MODAL_TITLE = "Choose evaluation path";

export const MISSION_BOARD_EVALUATION_PATH_OPTIONS: ReadonlyArray<{
  id: SalesPathwayEvaluationActivity;
  label: string;
  description: string;
}> = [
  {
    id: "Product Trial",
    label: "Product Trial",
    description: "Use when provider wants to try product in a real case.",
  },
  {
    id: "360 Experience",
    label: "360 Experience",
    description: "Use when provider wants a structured 360 Medical experience/demo/education pathway.",
  },
  {
    id: "In-Service",
    label: "In-Service",
    description: "Use when staff education or facility workflow training is needed.",
  },
  {
    id: "Surgeon Education",
    label: "Surgeon Education",
    description: "Use when provider wants clinical/product education before trial.",
  },
  {
    id: "Additional Observation",
    label: "Additional Observation",
    description: "Use when opportunity is not confirmed enough yet.",
  },
];
