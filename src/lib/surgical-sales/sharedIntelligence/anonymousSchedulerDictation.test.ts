/**
 * Regression: realistic observation dictations without named contacts.
 * Guards the Sofia-style note failures:
 * - "Worked — Scrub Tech" junk
 * - missing unnamed scheduler / two-week outreach
 * - "Alternative product discussed: mesh"
 * - raw clinical-data transcript chips
 */

import { describe, expect, it } from "vitest";

import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import {
  adaptUniversalFactsToFollowUpNextVisitItems,
  adaptUniversalFactsToThisObservationItems,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { groupRepFriendlyIntelligenceItems } from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const SOFIA_STYLE_NOTE = [
  "Observed a robotic ventral hernia repair today.",
  "The surgeon was using their current mesh of choice and mentioned they're generally satisfied with the clinical outcomes, but positioning the mesh during larger defects still takes longer than they'd like.",
  "They asked whether there were any products designed to improve conformability without adding complexity to the procedure.",
  "We discussed some available clinical data, and they said they'd be interested in reviewing it before considering an evaluation.",
  "The OR staff worked well together throughout the case, and the scrub tech commented that setup has become more efficient over the last few months.",
  "The scheduler stopped by after the procedure and confirmed she's the best contact for arranging future observations.",
  "She suggested reaching out in two weeks because several similar cases are already scheduled.",
  "Overall the case went smoothly, there were no inventory or equipment issues, and no additional clinical support was needed today.",
].join(" ");

const NAMED_VARIANT = [
  "Observed Dr. Priya Nair during an open inguinal hernia repair.",
  "They used MiraMesh for the case. Handling on bigger defects slows the team down.",
  "She asked for comparison information on options with better conformability.",
  "Morgan coordinated the observation and said backup sizes were not stocked.",
  "Sarah asked me to reach out in about three weeks.",
].join(" ");

function uiLinesFromNote(note: string, providerName: string, caseId = "case-1"): string {
  const extraction = extractUniversalSurgicalFacts({
    raw_note: note,
    declared_source_type: "observation_case",
    context: { provider_display_name: providerName },
  });
  const createdAt = "2026-07-16T13:14:00Z";
  const run: UniversalFactExtractionRun = {
    capture_id: "cap-1",
    declared_source_type: "observation_case",
    extraction_model: "rules",
    created_at: createdAt,
    operational_note_id: "note-1",
    facts: extraction.facts.map((fact, index) => ({
      ...fact,
      id: `f-${index}`,
      capture_id: "cap-1",
      provider_id: "provider-1",
      organization_id: null,
      case_id: caseId,
      encounter_id: null,
      suppressed: false,
      created_at: createdAt,
    })),
  };
  const items = adaptUniversalFactsToThisObservationItems({
    caseRuns: [run],
    caseId,
    hasCurrentNotes: true,
    providerName,
  });
  return groupRepFriendlyIntelligenceItems(items)
    .flatMap((group) => group.items.map((item) => `${group.title}: ${item.text}`))
    .join("\n");
}

describe("anonymous scheduler / scrub-tech dictation quality", () => {
  it("does not invent Worked as a scrub-tech contact name", () => {
    const signals = extractUniversalCategorySignals(
      "The OR staff worked well together throughout the case, and the scrub tech commented that setup has become more efficient over the last few months.",
    );
    expect(signals.some((s) => /Worked/i.test(s.normalized_label) || s.person_mentioned === "Worked")).toBe(
      false,
    );
  });

  it("captures unnamed scheduler + timed outreach from Sofia-style note", () => {
    const extraction = extractUniversalSurgicalFacts({
      raw_note: SOFIA_STYLE_NOTE,
      declared_source_type: "observation_case",
      context: { provider_display_name: "Sofia Ferreira" },
    });
    const labels = extraction.facts.map((f) => `${f.concept}:${f.normalized_label}`).join("\n");

    expect(labels).toMatch(/contact_role:.*Scheduling Coordinator/i);
    expect(labels).toMatch(/next_action:.*Reach out in two weeks/i);
    expect(labels).toMatch(/sizing_or_fit_issue|larger defects/i);
    expect(labels).toMatch(/product_interest:.*(?:conformability|clinical-data|alternatives|published)/i);
    expect(labels).not.toMatch(/contact_role:.*Worked/i);
    expect(labels).not.toMatch(/Product interest:\s*mesh\b/i);
  });

  it("renders rep-facing chips without junk mesh/worked contacts", () => {
    const ui = uiLinesFromNote(SOFIA_STYLE_NOTE, "Sofia Ferreira");
    const extraction = extractUniversalSurgicalFacts({
      raw_note: SOFIA_STYLE_NOTE,
      declared_source_type: "observation_case",
      context: { provider_display_name: "Sofia Ferreira" },
    });
    const createdAt = "2026-07-16T13:14:00Z";
    const run: UniversalFactExtractionRun = {
      capture_id: "cap-1",
      declared_source_type: "observation_case",
      extraction_model: "rules",
      created_at: createdAt,
      operational_note_id: "note-1",
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `f-${index}`,
        capture_id: "cap-1",
        provider_id: "provider-1",
        organization_id: null,
        case_id: "case-sofia",
        encounter_id: null,
        suppressed: false,
        created_at: createdAt,
      })),
    };
    const followUps = adaptUniversalFactsToFollowUpNextVisitItems({
      universalFactsReadModel: { caseRuns: [run], providerRuns: [run], programRuns: [run] },
      caseId: "case-sofia",
    })
      .map((item) => item.text)
      .join("\n");

    expect(ui).toMatch(/Larger defects|positioning|fit concern|Conformability|alternatives/i);
    expect(ui).toMatch(/Scheduling Coordinator|best contact/i);
    expect(followUps).toMatch(/Reach out in two weeks/i);
    expect(ui).not.toMatch(/Worked\s*[—-]\s*Scrub Tech/i);
    expect(ui).not.toMatch(/Alternative product discussed:\s*mesh/i);
    expect(ui).not.toMatch(/We discussed some available clinical data,\s*$/m);
  });

  it("still captures named contacts in alternate wording", () => {
    const ui = uiLinesFromNote(NAMED_VARIANT, "Priya Nair");
    expect(ui).toMatch(/MiraMesh/i);
    expect(ui).toMatch(/Morgan|Sarah/i);
    expect(ui).toMatch(/conformability|comparison|larger|bigger defects/i);
  });
});
