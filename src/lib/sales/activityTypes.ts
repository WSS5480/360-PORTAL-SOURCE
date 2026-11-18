export const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "other"] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  other: "Other",
};

export const LOST_REASONS = [
  { value: "no_budget", label: "No budget / funding" },
  { value: "chose_competitor", label: "Chose a competitor" },
  { value: "no_response", label: "No response / stalled" },
  { value: "timing", label: "Bad timing" },
  { value: "clinical_fit", label: "Clinical / product fit" },
  { value: "other", label: "Other" },
] as const;
