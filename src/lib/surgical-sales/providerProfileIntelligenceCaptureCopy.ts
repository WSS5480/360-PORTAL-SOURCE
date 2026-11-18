/** Provider profile — simplified intelligence capture & activity logging copy. */

export const PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI = {
  title: "Field note",
  subtitle: "Dictate or type. Review updates before saving.",
  placeholder:
    "Scheduler is Karen. Credentialing required before OR access. They use Bard Mesh for most ventral hernia cases.",
  reviewCta: "Review updates",
} as const;

export const PROVIDER_PROFILE_LOG_ACTIVITY_UI = {
  title: "Log Activity",
  kicker: "One line from the field — saved as a touchpoint only, without intelligence extraction.",
  fieldLabel: "What happened?",
  placeholder: "Example: Called office, left voicemail, will follow up Friday.",
} as const;
