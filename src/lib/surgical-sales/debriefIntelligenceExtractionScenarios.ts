/**
 * Five dictation-style scenarios for debrief intelligence extraction.
 * Each scenario defines its own dictation and expectations — assertion logic stays generic.
 */

import type { DebriefIntelligenceExtractionScenario } from "@/lib/surgical-sales/debriefIntelligenceExtractionAssertions";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

export const DEBRIEF_INTELLIGENCE_EXTRACTION_SCENARIOS: DebriefIntelligenceExtractionScenario[] = [
  {
    id: "direct_incomplete",
    label: "Direct but incomplete",
    dictation:
      "Met with Tom today. Observation access wasn't denied but he wants us to work through whoever handles vendor approvals first. He mentioned Susan usually coordinates that process. Need to figure out what credentialing platform they use.",
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      observationInterestOrPartial: true,
      pathwayUnchangedByDebriefAlone: true,
      namedParticipants: [
        {
          displayName: "Susan",
          mentionLevels: ["workflow_participant"],
          rolePattern: /credential|vendor|approval|coordinat|workflow/i,
        },
      ],
      minProposedContacts: 1,
      maxProposedContacts: 1,
      noAutoPersistReadyContacts: true,
      credentialingPathwayDetected: true,
      credentialingPlatformMustStayUnknown: true,
      categoriesMustInclude: ["access_intelligence", "people_contacts"],
      signalKindsMustExclude: ["approval_signal"],
      nextStepPattern: /credential|platform|approval|vendor|susan/i,
      minRepFriendlyUpdates: 1,
      requireRepFriendlyReviewSections: true,
      preserveNamedPeopleInCopy: true,
      forbidGenericContactLabels: true,
      forbidTechnicalCrmLanguage: true,
      forbidInventedCredentialingPlatforms: true,
    },
  },
  {
    id: "casual_unnamed_workflow_owner",
    label: "Casual / unnamed workflow owner",
    dictation:
      "Good meeting overall. Sounds like there's a lady in the office that handles most of this stuff but I didn't catch her name. Tom said once we get through credentialing we can probably get into a case. Need to figure out what system they use.",
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      observationInterestOrPartial: true,
      pathwayUnchangedByDebriefAlone: true,
      maxProposedContacts: 0,
      noAutoPersistReadyContacts: true,
      credentialingPathwayDetected: true,
      credentialingPlatformMustStayUnknown: true,
      categoriesMustInclude: ["access_intelligence"],
      signalKindsMustExclude: ["approval_signal"],
      nextStepPattern: /credential|system|platform|office|workflow|owner/i,
      minRepFriendlyUpdates: 1,
      requireRepFriendlyReviewSections: true,
      forbidTechnicalCrmLanguage: true,
      forbidInventedCredentialingPlatforms: true,
    },
  },
  {
    id: "multiple_named_workflow_participants",
    label: "Multiple named workflow participants",
    dictation:
      "Tom told me Karen handles scheduling. Melissa handles credentialing. Need to talk to both before we can get observation approval.",
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      pathwayUnchangedByDebriefAlone: true,
      namedParticipants: [
        {
          displayName: "Karen",
          mentionLevels: ["workflow_participant"],
          rolePattern: /schedul/i,
        },
        {
          displayName: "Melissa",
          mentionLevels: ["workflow_participant"],
          rolePattern: /credential/i,
        },
      ],
      minProposedContacts: 2,
      maxProposedContacts: 2,
      noAutoPersistReadyContacts: true,
      categoriesMustInclude: ["people_contacts"],
      signalKindsMustExclude: ["approval_signal"],
      nextStepPattern: /karen|melissa|contact|schedul|credential/i,
      minRepFriendlyUpdates: 2,
      requireRepFriendlyReviewSections: true,
      preserveNamedPeopleInCopy: true,
      forbidGenericContactLabels: true,
      forbidTechnicalCrmLanguage: true,
    },
  },
  {
    id: "no_names_access_pathway_only",
    label: "No names, access pathway only",
    dictation:
      "Need to work through the office first. Observation seems possible but not until vendor approval is complete.",
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      observationInterestOrPartial: true,
      pathwayUnchangedByDebriefAlone: true,
      maxProposedContacts: 0,
      noAutoPersistReadyContacts: true,
      accessPathwayPattern: /office|vendor|approval/i,
      categoriesMustInclude: ["access_intelligence"],
      signalKindsMustExclude: ["approval_signal"],
      nextStepPattern: /office|vendor|approval|identif/i,
      minRepFriendlyUpdates: 1,
      requireRepFriendlyReviewSections: true,
      forbidTechnicalCrmLanguage: true,
    },
  },
  {
    id: "intro_call_tom_sandy_jennifer",
    label: "Intro call — Tom Sandy / Jennifer / Test3 Hospital",
    dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      observationInterestOrPartial: true,
      pathwayUnchangedByDebriefAlone: true,
      namedParticipants: [
        {
          displayName: "Jennifer",
          mentionLevels: ["workflow_participant"],
          rolePattern: /schedul/i,
        },
      ],
      minProposedContacts: 1,
      maxProposedContacts: 3,
      noAutoPersistReadyContacts: true,
      credentialingPathwayDetected: true,
      credentialingPlatformMustStayUnknown: true,
      categoriesMustInclude: ["access_intelligence", "clinical_focus", "people_contacts"],
      signalKindsMustExclude: ["approval_signal"],
      nextStepPattern: /jennifer|contact|credential|platform|pathway/i,
      minRepFriendlyUpdates: 2,
      requireRepFriendlyReviewSections: true,
      preserveNamedPeopleInCopy: true,
      forbidGenericContactLabels: true,
      forbidTechnicalCrmLanguage: true,
      forbidInventedCredentialingPlatforms: true,
    },
  },
  {
    id: "explicit_contact_information",
    label: "Explicit contact information",
    dictation:
      "Tom said Melissa Jones handles scheduling. Her email is melissa@testhospital.org.",
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      pathwayUnchangedByDebriefAlone: true,
      namedParticipants: [
        {
          displayName: "Melissa Jones",
          mentionLevels: ["potential_support_contact"],
          rolePattern: /schedul/i,
          email: "melissa@testhospital.org",
        },
      ],
      minProposedContacts: 1,
      maxProposedContacts: 1,
      noAutoPersistReadyContacts: true,
      categoriesMustInclude: ["people_contacts"],
      signalKindsMustExclude: ["approval_signal"],
      minRepFriendlyUpdates: 1,
      requireRepFriendlyReviewSections: true,
      preserveNamedPeopleInCopy: true,
      forbidGenericContactLabels: true,
      forbidTechnicalCrmLanguage: true,
    },
  },
];
