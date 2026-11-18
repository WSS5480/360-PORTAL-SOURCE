/**
 * Rep-facing labels for staff-efficiency observations — never expose raw ontology suffixes.
 */

import { normalizeConceptText } from "@/lib/surgical-sales/canonicalFindingIdentity";

function stripStaffWrapper(raw: string): string {
  return raw
    .trim()
    .replace(/^staff workflow:\s*/i, "")
    .replace(/^(the\s+)?(team|staff)\s+(appeared|seemed|was|were)\s+/i, "")
    .replace(/\s+again$/i, "")
    .trim();
}

function normalizedStaffTopic(raw: string): string {
  return normalizeConceptText(stripStaffWrapper(raw)) || stripStaffWrapper(raw).toLowerCase();
}

/** Map staff-efficiency concept text to natural rep-facing language. */
export function staffEfficiencyRepLabel(raw: string): string {
  const topic = normalizedStaffTopic(raw);
  const source = `${raw} ${topic}`.toLowerCase();

  if (/consistent team members?|same team members?|familiar team/.test(source)) {
    return "Consistent team members help cases run smoother";
  }
  if (
    /strong team communication|strong communication|communication between the circulat|communication.*surgeon/.test(
      source,
    )
  ) {
    return "Strong team communication during the case";
  }
  if (/staff satisfaction|team satisfaction|retention/.test(source)) {
    return "Staff satisfaction and retention are priorities";
  }
  if (/familiar/i.test(source)) {
    return "Staff appeared familiar with workflow";
  }
  if (/organized/i.test(source)) {
    return "Staff appeared organized";
  }
  if (/comfortable|comfort with|comfortable with/i.test(source)) {
    return "Staff appeared comfortable with current process";
  }
  if (
    /coordinated|good team|knew what they were doing|knew their role|worked well together|coordinated team|positive staff workflow|worked well overall/.test(
      source,
    )
  ) {
    return "Staff workflow appeared coordinated";
  }
  if (/efficient|efficiency/i.test(source)) {
    return "Staff workflow appeared efficient";
  }
  if (/prepared/i.test(source)) {
    return "Staff appeared prepared for the case";
  }
  if (/smooth/i.test(source)) {
    return "Staff workflow appeared smooth";
  }

  if (!topic || topic === "staff workflow context" || topic.length <= 2 || /^staff signal/.test(source)) {
    return "Staff workflow appeared positive";
  }

  // Avoid awkward auto-prefixed labels from noisy ontology/GPT fragments.
  if (topic.split(/\s+/).length > 4 || /importance|influence|priority|concern|improve\b/.test(topic)) {
    return "Staff workflow appeared positive";
  }

  if (/^[a-z\s-]+$/.test(topic) && topic.split(/\s+/).length <= 4) {
    return `Staff appeared ${topic}`;
  }

  return "Staff workflow appeared positive";
}

/** True when a label looks like a raw ontology staff-workflow prefix leak. */
export function isOntologyStaffWorkflowLabel(label: string): boolean {
  return /^staff workflow:\s+[A-Z][a-z]+$/i.test(label.trim());
}
