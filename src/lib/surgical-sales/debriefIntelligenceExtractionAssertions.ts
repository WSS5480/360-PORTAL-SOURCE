/**
 * Generic behavioral assertions for debrief intelligence extraction scenarios.
 * Scenario-specific names and dictation live in fixtures — not here.
 */

import { expect } from "vitest";

import { isConcreteFieldActionStep } from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";
import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { buildDebriefReviewSections } from "@/lib/surgical-sales/buildDebriefReviewSections";
import {
  buildDebriefRecommendedNextSteps,
  buildRepFriendlySuggestedUpdates,
} from "@/lib/surgical-sales/debriefRepFriendlyReview";
import { isExcludedNarrativeReviewPhrase } from "@/lib/surgical-sales/debriefReviewNarrativeExclusions";
import { contactsReadyToPersist } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefPersonMentionLevel } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  allRepFriendlyEvidenceAnchoredInDictation,
  type DebriefExtractionPipelineResult,
} from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { quoteIsAnchoredInDictation } from "@/lib/surgical-sales/debriefDictationEvidence";
import type { DebriefIntelligenceCategory } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type { ClassifiedEngagementOutcomeId } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";

const GENERIC_CONTACT_PHRASE_RE =
  /\bnamed contact\b|\boffice contact\b|\ba contact handles\b|\bunnamed contact\b/i;

const GENERIC_NEXT_STEP_PHRASE_RE =
  /\bidentify surgical\b|\bobservation approval pathway\b|\bplatform and steps confirmation\b|\bwhat is the credentialing pathway\b|\bconfirm credentialing process\b/i;

const TECHNICAL_CRM_LANGUAGE_RE =
  /\bprovider_office\b|\bprovider-linked\b|\bshared_workflow\b|\bdeployment readiness\b|\boperational signals?\b|\bpartially mapped\b|\bcredentialing_required\b|\breadiness signals?\b/i;

const KNOWN_CREDENTIALING_PLATFORMS = [
  "intellicentrics",
  "symplr",
  "vendormate",
  "green security",
  "ghx",
  "reptrax",
];

export type NamedParticipantExpectation = {
  displayName: string;
  mentionLevels: DebriefPersonMentionLevel[];
  rolePattern?: RegExp;
  email?: string;
  phone?: string;
};

export type DebriefIntelligenceScenarioExpectations = {
  outcomeId: ClassifiedEngagementOutcomeId;
  observationApprovalExplicit: boolean;
  /** When true, interest OR partial access path is acceptable. */
  observationInterestOrPartial?: boolean;
  pathwayUnchangedByDebriefAlone: boolean;
  namedParticipants?: NamedParticipantExpectation[];
  minProposedContacts?: number;
  maxProposedContacts?: number;
  noAutoPersistReadyContacts?: boolean;
  credentialingPathwayDetected?: boolean;
  credentialingPlatformMustStayUnknown?: boolean;
  accessPathwayPattern?: RegExp;
  nextStepPattern?: RegExp;
  categoriesMustInclude?: DebriefIntelligenceCategory[];
  categoriesMustExclude?: DebriefIntelligenceCategory[];
  signalKindsMustExclude?: string[];
  preserveNamedPeopleInCopy?: boolean;
  minRepFriendlyUpdates?: number;
  requireRepFriendlyReviewSections?: boolean;
  forbidGenericContactLabels?: boolean;
  forbidTechnicalCrmLanguage?: boolean;
  forbidInventedCredentialingPlatforms?: boolean;
};

export type DebriefIntelligenceExtractionScenario = {
  id: string;
  label: string;
  dictation: string;
  expect: DebriefIntelligenceScenarioExpectations;
};

function repFriendlyUpdates(result: DebriefExtractionPipelineResult) {
  const sections = buildDebriefReviewSections(result.extraction);
  if (sections.intelligenceCaptured.length > 0) {
    return [{ category: "access_intelligence" as const, label: "Intelligence Captured", updates: sections.intelligenceCaptured }];
  }
  return buildRepFriendlySuggestedUpdates({
    extraction: result.extraction,
    review: result.parse,
    proposedContacts: result.proposedContacts,
  });
}

function actionableReviewCards(result: DebriefExtractionPipelineResult) {
  return buildDebriefActionableReviewCards({
    extraction: result.extraction,
    proposedContacts: result.proposedContacts,
    dictation: result.dictation,
  });
}

function repFacingCopy(result: DebriefExtractionPipelineResult): string {
  const cards = actionableReviewCards(result);
  const nextSteps = buildDebriefRecommendedNextSteps({
    review: result.parse,
    extraction: result.extraction,
    proposedContacts: result.proposedContacts,
    followUp: { required: [], helpful: [] },
  });
  return [
    ...cards.flatMap((c) => [
      c.headline,
      ...c.fields.map((f) => `${f.label} ${f.value}`),
      ...c.evidenceQuotes,
    ]),
    ...result.proposedContacts.map((c) => c.displayName),
    ...nextSteps,
  ].join("\n");
}

function allRepFriendlyCopy(result: DebriefExtractionPipelineResult): string {
  return [
    repFacingCopy(result),
    ...result.extraction.intelligenceUpdates.map(
      (u) => `${u.extractedStatement} ${u.proposedValue} ${u.evidenceQuote}`,
    ),
  ].join("\n");
}

function observationInterestOrPartial(result: DebriefExtractionPipelineResult): boolean {
  const access = result.observationAccess;
  return (
    access.observationInterest ||
    access.accessPathIdentified === "partial" ||
    access.accessPathIdentified === "yes"
  );
}

function credentialingPathwayDetected(result: DebriefExtractionPipelineResult): boolean {
  const blob = allRepFriendlyCopy(result).toLowerCase();
  const dictation = result.dictation.toLowerCase();
  const combined = `${blob}\n${dictation}`;
  return /\bcredential|vendor\s+approv|vendor\s+access|approval\s+pathway\b/.test(combined);
}

function findParticipant(result: DebriefExtractionPipelineResult, displayName: string) {
  return result.proposedContacts.find(
    (c) => c.displayName.toLowerCase() === displayName.toLowerCase(),
  );
}

export function assertDebriefIntelligenceExtractionScenario(
  result: DebriefExtractionPipelineResult,
  expected: DebriefIntelligenceScenarioExpectations,
): void {
  expect(result.classifiedOutcomeId, "outcome classification").toBe(expected.outcomeId);
  expect(result.observationApprovalExplicit, "observation approval explicit").toBe(
    expected.observationApprovalExplicit,
  );

  if (expected.observationInterestOrPartial) {
    expect(observationInterestOrPartial(result), "observation interest or partial access").toBe(true);
  }

  if (expected.pathwayUnchangedByDebriefAlone) {
    expect(result.pathwayStageBefore, "pathway before debrief").toBe("discovery");
    expect(result.pathwayStageAfterDebriefAlone, "pathway unchanged by debrief alone").toBe(
      result.pathwayStageBefore,
    );
    expect(result.engagementOutcomeAdvancesPathway, "outcome must not auto-advance pathway").toBe(
      false,
    );
  }

  expect(result.proposedContacts.length).toBeGreaterThanOrEqual(expected.minProposedContacts ?? 0);
  if (expected.maxProposedContacts != null) {
    expect(result.proposedContacts.length).toBeLessThanOrEqual(expected.maxProposedContacts);
  }

  expect(result.recommendedNextSteps.length).toBeLessThanOrEqual(5);
  for (const step of result.recommendedNextSteps) {
    expect(GENERIC_NEXT_STEP_PHRASE_RE.test(step), `generic next step: ${step}`).toBe(false);
    expect(isConcreteFieldActionStep(step), `non-actionable next step: ${step}`).toBe(true);
  }

  for (const participant of expected.namedParticipants ?? []) {
    const contact = findParticipant(result, participant.displayName);
    expect(contact, `named participant ${participant.displayName}`).toBeTruthy();
    expect(participant.mentionLevels, `${participant.displayName} mention level`).toContain(
      contact!.mentionLevel,
    );
    if (participant.rolePattern) {
      expect(contact!.roleLabel, `${participant.displayName} role`).toMatch(participant.rolePattern);
    }
    if (participant.email) {
      expect(contact!.email.toLowerCase()).toBe(participant.email.toLowerCase());
    }
    if (participant.phone) {
      expect(contact!.phone).toContain(participant.phone);
    }
    const hasContactInfo = Boolean(contact!.email.trim() || contact!.phone.trim());
    expect(contact!.mentionLevel, `${participant.displayName} must not auto-confirm`).not.toBe(
      "confirmed_support_contact",
    );
    if (!participant.email && !participant.phone) {
      expect(contact!.contactDetailsMissing, `${participant.displayName} missing details`).toBe(
        true,
      );
    }
    if (participant.email || participant.phone) {
      expect(hasContactInfo, `${participant.displayName} contact info captured`).toBe(true);
    }
  }

  if (expected.noAutoPersistReadyContacts) {
    expect(contactsReadyToPersist(result.proposedContacts), "auto-persist ready contacts").toHaveLength(
      0,
    );
  }

  if (expected.credentialingPathwayDetected) {
    expect(credentialingPathwayDetected(result), "credentialing / vendor approval pathway").toBe(true);
  }

  if (expected.credentialingPlatformMustStayUnknown) {
    const output = allRepFriendlyCopy(result).toLowerCase();
    expect(output).not.toMatch(/\bcredentialing platform(?:\s+is|\s*:\s*|\s+uses?\s+)\S+/i);
    for (const platform of KNOWN_CREDENTIALING_PLATFORMS) {
      if (!result.dictation.toLowerCase().includes(platform)) {
        expect(output, `must not invent platform ${platform}`).not.toContain(platform);
      }
    }
  }

  if (expected.accessPathwayPattern) {
    expect(allRepFriendlyCopy(result)).toMatch(expected.accessPathwayPattern);
  }

  if (expected.nextStepPattern) {
    const combined = [
      ...result.recommendedNextSteps,
      ...(result.extraction.unresolvedItems ?? []),
      result.classifiedRationale,
      allRepFriendlyCopy(result),
    ].join(" ");
    expect(combined).toMatch(expected.nextStepPattern);
  }

  for (const cat of expected.categoriesMustInclude ?? []) {
    expect(result.primaryCategories, `category includes ${cat}`).toContain(cat);
  }
  for (const cat of expected.categoriesMustExclude ?? []) {
    expect(result.primaryCategories, `category excludes ${cat}`).not.toContain(cat);
  }

  for (const kind of expected.signalKindsMustExclude ?? []) {
    expect(result.signalKinds, `signal kind excludes ${kind}`).not.toContain(kind);
  }

  const reviewCards = actionableReviewCards(result);

  if (expected.minRepFriendlyUpdates != null) {
    expect(reviewCards.length).toBeGreaterThanOrEqual(expected.minRepFriendlyUpdates);
  }

  const evidenceAnchorCategories = new Set([
    "workflow_participant",
    "clinical_focus",
    "observation_access",
    "follow_up_task",
  ]);

  for (const card of reviewCards) {
    expect(card.headline.trim(), "actionable card headline").not.toHaveLength(0);
    expect(isExcludedNarrativeReviewPhrase(card.headline), `narrative headline ${card.id}`).toBe(
      false,
    );
    if (card.evidenceQuotes.length > 0 && evidenceAnchorCategories.has(card.category)) {
      for (const quote of card.evidenceQuotes) {
        expect(
          quoteIsAnchoredInDictation(quote.replace(/^["']|["']$/g, ""), result.dictation),
          `evidence anchored for ${card.id}`,
        ).toBe(true);
      }
    }
    if ("confidence" in card && card.confidence) {
      expect(card.confidence, "actionable card confidence").toMatch(/^(High|Medium|Low)$/);
    }
  }

  if (expected.requireRepFriendlyReviewSections) {
    expect(reviewCards.length, "structured review cards present").toBeGreaterThan(0);
    if (
      expected.observationInterestOrPartial ||
      expected.categoriesMustInclude?.includes("access_intelligence")
    ) {
      expect(
        reviewCards.some((c) => c.category === "observation_access"),
        "observation access structured card",
      ).toBe(true);
    }
    const reviewCopy = repFacingCopy(result);
    expect(reviewCopy).not.toMatch(/\b(access summary|key takeaway)\b/i);
    expect(reviewCopy).not.toMatch(/\bLearned\b/);
    expect(reviewCopy).not.toMatch(/appears possible/i);
    if (expected.nextStepPattern) {
      expect(reviewCopy).toMatch(expected.nextStepPattern);
    }
  }

  if (expected.preserveNamedPeopleInCopy) {
    for (const participant of expected.namedParticipants ?? []) {
      const first = participant.displayName.split(/\s+/)[0]!;
      expect(repFacingCopy(result), `preserve name ${first}`).toMatch(
        new RegExp(`\\b${first}\\b`, "i"),
      );
      const expectsWorkflowAction = (expected.namedParticipants ?? []).some(
        (p) =>
          p.displayName.toLowerCase().includes(first.toLowerCase()) &&
          p.mentionLevels.includes("workflow_participant") &&
          !p.email &&
          !p.phone,
      );
      if (expectsWorkflowAction) {
        const cards = buildDebriefActionableReviewCards({
          extraction: result.extraction,
          proposedContacts: result.proposedContacts,
          dictation: result.dictation,
        });
        const workflowCard = cards.find(
          (c) =>
            c.category === "workflow_participant" &&
            (c.displayName ?? "").toLowerCase().includes(first.toLowerCase()),
        );
        expect(workflowCard, `workflow contact card for ${first}`).toBeTruthy();
      }
    }
  }

  if (expected.forbidGenericContactLabels) {
    for (const participant of expected.namedParticipants ?? []) {
      const first = participant.displayName.split(/\s+/)[0]!;
      for (const card of reviewCards.filter((c) => c.category === "workflow_participant")) {
        const copy = [card.headline, ...card.fields.map((f) => f.value)].join(" ");
        if (GENERIC_CONTACT_PHRASE_RE.test(copy) && !copy.includes(first)) {
          expect.fail(
            `Generic contact label used instead of ${participant.displayName}: ${copy}`,
          );
        }
      }
    }
  }

  if (expected.forbidTechnicalCrmLanguage) {
    expect(repFacingCopy(result)).not.toMatch(TECHNICAL_CRM_LANGUAGE_RE);
  }

  if (expected.forbidInventedCredentialingPlatforms) {
    const output = allRepFriendlyCopy(result).toLowerCase();
    for (const platform of KNOWN_CREDENTIALING_PLATFORMS) {
      if (!result.dictation.toLowerCase().includes(platform)) {
        expect(output).not.toContain(platform);
      }
    }
  }

  if ((expected.minRepFriendlyUpdates ?? 0) > 0) {
    expect(allRepFriendlyEvidenceAnchoredInDictation(result)).toBe(true);
  }
}
