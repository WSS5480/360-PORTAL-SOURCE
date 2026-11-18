export const INTRO_CALL_TEMPLATE_TOOLS_RESOURCES = [
  "Provider profile and relationship history",
  "Procedure volume and case-mix notes",
  "Product portfolio one-pager (only when product focus selected)",
  "Observation debrief template",
].join("\n");

export const INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_GENERIC =
  "Agreed case types, what to watch for during observation, or evaluation triggers.";

export const INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT =
  "Agreed case subtype, observation focus areas, or evaluation gate.";

export function formatIntroCallBulletList(items: readonly string[]): string {
  return items.map((item) => `• ${item.trim()}`).join("\n");
}

export function formatIntroCallTemplateAdditionalNotes(input: {
  observationGoals: readonly string[];
  suggestedFollowUp: readonly string[];
}): string {
  const parts: string[] = [];
  if (input.observationGoals.length > 0) {
    parts.push(`Future observation goals:\n${formatIntroCallBulletList(input.observationGoals)}`);
  }
  if (input.suggestedFollowUp.length > 0) {
    parts.push(`Suggested follow-up:\n${formatIntroCallBulletList(input.suggestedFollowUp)}`);
  }
  return parts.join("\n\n");
}
