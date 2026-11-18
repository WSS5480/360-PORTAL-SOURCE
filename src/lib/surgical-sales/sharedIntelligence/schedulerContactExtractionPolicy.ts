/**
 * Scheduler / contact extraction policy — Phase 0–1 ownership boundaries.
 *
 * Review Contacts: DIP only. UF may store quote-only staff workflow evidence.
 * CRM persistence: DIP Save + contact pipeline only — never auto-write from UF.
 */

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { normalizeExtractedPersonName } from "@/lib/surgical-sales/schedulingContactOwnership";

export const SCHEDULER_CONTACT_POLICY = {
  reviewContactsOwner: "dip" as const,
  ufCrmWrite: false as const,
  ufStaffWorkflowQuotes: "quote_only" as const,
  observationOieSchedulingContact: "oie_separate_path" as const,
  dipWorkflowContactFactTypes: ["workflow_contact", "scheduling"] as const,
};

export function normalizeSchedulerPersonName(raw: string): string {
  return normalizeExtractedPersonName(raw);
}

/** UF may emit staff_workflow quote facts — evidence only, no CRM contact creation. */
export function shouldEmitUfStaffWorkflowQuote(fragment: string): boolean {
  const text = fragment.trim();
  if (!text) return false;
  if (/\b(?:staff|team|office)\b/i.test(text) && /\b(?:schedul|coordinat|handles?)\b/i.test(text)) {
    return true;
  }
  if (
    /\b(?:circulat|scrub|surgeon|team members?)\b/i.test(text) &&
    /\b(?:communication|worked well|strong|consistent team|smooth)\b/i.test(text)
  ) {
    return true;
  }
  if (/\b(?:staff|team)\b/i.test(text) && /\b(?:organized|smooth|efficient|comfortable)\b/i.test(text)) {
    return true;
  }
  return false;
}

/** DIP owns named scheduler / workflow participants for Review Contacts. */
export function shouldEmitDipWorkflowContact(fact: DebriefAtomicFact): boolean {
  if (!SCHEDULER_CONTACT_POLICY.dipWorkflowContactFactTypes.includes(fact.fact_type as "workflow_contact" | "scheduling")) {
    return false;
  }
  const name = normalizeSchedulerPersonName(fact.entity);
  if (!name) return false;
  return true;
}

/** UF must not treat scheduler person names as product mentions. */
export function fragmentLooksLikeSchedulerContact(fragment: string): boolean {
  return /\b(?:in (?:his|her|their) office|scheduling coordin|handles? (?:a lot of )?the scheduling)\b/i.test(
    fragment,
  );
}
