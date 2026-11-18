import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";
import { formatProviderProcedureFocusBadge } from "./providerVisualIdentity";
import { buildProviderIntelligenceFieldBriefingStory } from "./buildProviderIntelligenceFieldBriefingStory";
import { buildProviderFieldIntelligenceModel } from "./providerFieldIntelligenceModel";
import { buildProviderIntelligenceReferenceView } from "./buildProviderIntelligenceReferenceView";
import { resolveNormalizedObservationPermission } from "./observationPermissionModel";

const DR_APPLE_SAVED_CONTACT = {
  id: "provider-apple",
  first_name: "Michael",
  last_name: "Apple",
  provider_observation_feasibility: "approved",
  provider_observation_access_path:
    "Observation interest: Yes. Observation approval: No. Access path identified: Partial. Blocker: Approval pathway",
  provider_observation_credentialing_needed: "required",
  provider_credentialing_status: "Vendor credentialing required before OR access",
  provider_observation_coordinator_contact: "Karen — contact info missing",
  provider_scheduling_contact: "And Follow appears involved in scheduler on the provider side.",
  provider_procedure_focus:
    "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing procedure volume",
  provider_competitive_products: "Bard Mesh — needs confirmation during observation",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: {
      source_type: "intro_call",
      source_label: "Intro call debrief",
      source_engagement_id: "eng-apple-intro",
      lifecycle_state: "validated",
      validated_at: "2026-06-01T12:00:00Z",
      evidence_text: "He gave me approval to come observe cases",
    },
    provider_observation_coordinator_contact: {
      source_type: "intro_call",
      source_label: "Intro call debrief",
      source_engagement_id: "eng-apple-intro",
      lifecycle_state: "confirmed",
      evidence_text:
        "Karen from his office handles most of the scheduling coordination and works closely with the hospital OR scheduling team, but I do not have her contact information yet.",
    },
    provider_procedure_focus: {
      source_type: "intro_call",
      lifecycle_state: "confirmed",
      evidence_text:
        "Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to.",
    },
    provider_competitive_products: {
      source_type: "intro_call",
      lifecycle_state: "captured",
      evidence_text:
        "He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.",
    },
  },
};

const DR_APPLE_ENGAGEMENTS = [
  {
    id: "eng-apple-intro",
    engagement_type: "intro_call",
    status: "completed",
    debrief_completed: true,
    debrief_completed_at: "2026-06-01T14:00:00Z",
    engagement_type_label: "Intro Call",
  },
] as never[];

describe("Provider Intelligence tab — Dr. Apple saved intro-call intelligence", () => {
  it("surfaces intelligence gaps instead of generic scheduling checklist questions", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      engagements: DR_APPLE_ENGAGEMENTS,
    });

    const evidenceGapText = view.needsMoreEvidence.map((chip) => chip.text).join("\n");
    expect(evidenceGapText).not.toMatch(/Karen contact information unknown/i);
    expect(evidenceGapText).not.toMatch(/Credentialing path needs confirmation/i);
    expect(evidenceGapText).not.toMatch(/first observation not scheduled/i);
    expect(evidenceGapText).toMatch(/confirm current product use/i);
    expect(evidenceGapText).toMatch(/identify provider pain points/i);
    expect(evidenceGapText).toMatch(/identify staff workflow pain points/i);

    const productGap = view.needsMoreEvidence.find((chip) => /confirm current product use/i.test(chip.text));
    expect(productGap?.description).toMatch(/Bard Mesh was mentioned/i);
    expect(productGap?.description).not.toMatch(/He was mentioned/i);

    const schedulerStep = view.progress.accessSteps.find((step) => step.id === "scheduler");
    expect(schedulerStep).toBeTruthy();
    expect(view.progress.accessSteps.some((step) => step.id === "credentialing" && step.actionable)).toBe(true);
    expect(view.progress.accessSteps.some((step) => step.id === "scheduled" && step.actionable)).toBe(true);
    expect(evidenceGapText).not.toMatch(/which case should be observed/i);
    expect(evidenceGapText).not.toMatch(/which date should observation happen/i);
    expect(evidenceGapText).not.toMatch(/observation allowance/i);
    expect(evidenceGapText).not.toMatch(/re-validate on next touch/i);
    expect(evidenceGapText).not.toMatch(/vendor list partial/i);
    expect(evidenceGapText).not.toMatch(/whether you can observe needs reconfirmation/i);
  });

  it("shows clinical emerging signals without completed access milestones in observation-ready stage", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      engagements: DR_APPLE_ENGAGEMENTS,
    });

    const emergingText = view.emergingSignals.map((chip) => chip.text).join("\n");
    expect(emergingText).not.toMatch(/Observation approval confirmed/i);
    expect(emergingText).not.toMatch(/Scheduler referenced/i);
    expect(emergingText).toMatch(/Robotic ventral hernia repair/i);
    expect(emergingText).toMatch(/Abdominal wall reconstruction/i);
    expect(emergingText).toMatch(/volume increasing/i);
    expect(emergingText).toMatch(/Bard Mesh mentioned in intro call/i);

    const accessLabels = view.progress.accessSteps.map((step) => step.label).join("\n");
    expect(accessLabels).toMatch(/Approval confirmed/i);
    expect(accessLabels).toMatch(/Scheduler contact/i);
  });

  it("renders evidence from saved intelligence without stale artifacts", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
      engagements: DR_APPLE_ENGAGEMENTS,
    });

    const evidenceBlob = view.fieldEvidence
      .flatMap((card) => [card.title, card.excerpt ?? "", ...card.intelligenceImpacts.map((i) => i.label)])
      .join("\n");

    expect(evidenceBlob).not.toMatch(/Observation approval: No/i);
    expect(evidenceBlob).not.toMatch(/Current product identified: He/i);
    expect(evidenceBlob).not.toMatch(/And Follow appears involved/i);
    const introCard = view.fieldEvidence.find((card) => card.title === "Intro Call");
    expect(introCard?.excerpt).toBeTruthy();
    expect(introCard?.excerpt).not.toMatch(/^Intro Call$/i);
    const introImpactKeys = introCard?.intelligenceImpacts.map(
      (impact) => `${impact.label}::${impact.impact}`,
    );
    expect(new Set(introImpactKeys).size).toBe(introImpactKeys?.length ?? 0);
    expect(evidenceBlob).toMatch(/Observation approval confirmed/i);
    expect(evidenceBlob).toMatch(/Karen/i);
    expect(evidenceBlob).toMatch(/Bard Mesh/i);
    expect(evidenceBlob).toMatch(/robotic ventral hernia repair/i);
    expect(evidenceBlob).toMatch(/abdominal wall reconstruction/i);

    const schedulingCard = view.fieldEvidence.find((card) => card.title === "Scheduling Contact");
    expect(schedulingCard?.excerpt).toMatch(/Karen/i);
    expect(schedulingCard?.excerpt).not.toMatch(/And Follow/i);
  });

  it("formats profile procedure focus without trend language", () => {
    const badge = formatProviderProcedureFocusBadge(DR_APPLE_SAVED_CONTACT);
    expect(badge).toBe(
      "Robotic ventral hernia repair · Abdominal wall reconstruction",
    );
    expect(badge).not.toMatch(/Increasing procedure volume/i);
  });

  it("includes both clinical trends and product intelligence in the AI Field Brief", () => {
    const model = buildProviderFieldIntelligenceModel({ contact: DR_APPLE_SAVED_CONTACT });
    const reference = buildProviderIntelligenceReferenceView({
      contact: DR_APPLE_SAVED_CONTACT,
      providerId: "provider-apple",
    });
    const permission = resolveNormalizedObservationPermission({
      contact: DR_APPLE_SAVED_CONTACT,
      engagements: DR_APPLE_ENGAGEMENTS,
    });

    const story = buildProviderIntelligenceFieldBriefingStory({
      contact: DR_APPLE_SAVED_CONTACT,
      model,
      permission,
      reference,
    }).join(" ");

    expect(story).toMatch(/robotic ventral hernia repair/i);
    expect(story).toMatch(/abdominal wall reconstruction/i);
    expect(story).toMatch(/Bard Mesh/i);
    expect(story).toMatch(/needs confirmation during observation/i);
    expect(story).toMatch(/confirmed observation approval/i);
    expect(story).not.toMatch(/remains unconfirmed|still being clarified|not yet been confirmed/i);
  });
});
