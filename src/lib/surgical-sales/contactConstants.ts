/** Surgical CRM contact enums — safe for client bundles (no server / Supabase imports). */

export const SURGICAL_CONTACT_ROLE_TYPES_V2 = [
  "surgeon",
  "physician_assistant",
  "nurse",
  "scheduler",
  "office_manager",
  "gatekeeper",
  "billing",
  "purchasing",
  "admin",
  "assistant",
  "other",
] as const;

export const SURGICAL_CONTACT_INFLUENCE_LEVELS = [
  "decision_maker",
  "influencer",
  "gatekeeper",
  "unknown",
] as const;

export const SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS = [
  "strong",
  "medium",
  "weak",
  "unknown",
] as const;

export const SURGICAL_CONTACT_VERIFICATION_STATUSES = ["suggested", "verified"] as const;

export type SurgicalContactVerificationStatus =
  (typeof SURGICAL_CONTACT_VERIFICATION_STATUSES)[number];

export const SURGICAL_CONTACT_RELATIONSHIP_TYPES = [
  "office_manager",
  "scheduler",
  "assistant",
  "gatekeeper",
  "billing_contact",
  "purchasing_contact",
  "colleague",
  "reports_to",
  "works_with",
  "other",
] as const;

export const SURGICAL_CONTACT_PREFERRED_METHODS = ["email", "phone", "text", "in_person", "unknown"] as const;

export type ContactSalesIntelligenceInput = Partial<{
  preferred_contact_method: (typeof SURGICAL_CONTACT_PREFERRED_METHODS)[number];
  best_time_to_contact: string | null;
  access_notes: string | null;
  personality_notes: string | null;
  do_not_contact: boolean;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
}>;
