import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  assertionCeilingForSource,
  assertionFromObservationConfirmation,
  clampAssertionToCeiling,
  compareIntelligenceAssertion,
  defaultAssertionForSource,
  inferAssertionFromLegacySourceType,
  nextFieldAssertion,
  parseIntelligenceAssertion,
  resolveAssertionForCapture,
  resolveAssertionWrite,
  resolveFieldAssertion,
} from "@/lib/surgical-sales/intelligenceAssertion";
import {
  applyIntelligenceFieldMetadataToPatch,
  parseProviderIntelligenceFieldMetadata,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  buildOpportunityIntelligencePromotionFromObservationExtraction,
  mergeOpportunityIntelligenceContactPatch,
} from "@/lib/surgical-sales/promoteOpportunityIntelligenceFromObservation";
import { extractFieldObservationNoteEntities } from "@/lib/surgical-sales/fieldObservationIntelligence";
import {
  assertProviderIntelligenceWritableDbKey,
  EVALUATION_OUTCOME_RESERVED_DB_KEYS,
  isProviderIntelligenceDbKey,
} from "@/lib/surgical-sales/providerIntelligenceFields";

const FLAG = "ASSERTION_AWARE_INTELLIGENCE";
let savedFlag: string | undefined;

beforeEach(() => {
  savedFlag = process.env[FLAG];
});

afterEach(() => {
  if (savedFlag === undefined) delete process.env[FLAG];
  else process.env[FLAG] = savedFlag;
});

function enableFlag() {
  process.env[FLAG] = "1";
}

function disableFlag() {
  delete process.env[FLAG];
}

describe("assertion ladder", () => {
  it("orders provider_reported < observed < validated", () => {
    expect(compareIntelligenceAssertion("observed", "provider_reported")).toBeGreaterThan(0);
    expect(compareIntelligenceAssertion("validated", "observed")).toBeGreaterThan(0);
    expect(compareIntelligenceAssertion("observed", "observed")).toBe(0);
    expect(compareIntelligenceAssertion("provider_reported", "validated")).toBeLessThan(0);
  });

  it("derives source ceilings: field_note ≤ provider_reported, observation_case ≤ observed", () => {
    expect(assertionCeilingForSource("field_note")).toBe("provider_reported");
    expect(assertionCeilingForSource("observation_case")).toBe("observed");
    expect(assertionCeilingForSource("debrief")).toBe("validated");
    expect(assertionCeilingForSource("evaluation")).toBe("validated");
    expect(assertionCeilingForSource("outcome")).toBe("validated");
  });

  it("debrief defaults to provider_reported (validated only via corroboration)", () => {
    expect(defaultAssertionForSource("debrief")).toBe("provider_reported");
    expect(defaultAssertionForSource("field_note")).toBe("provider_reported");
    expect(defaultAssertionForSource("observation_case")).toBe("observed");
  });

  it("clamps a claimed assertion to the source ceiling", () => {
    expect(clampAssertionToCeiling("validated", "provider_reported")).toBe("provider_reported");
    expect(clampAssertionToCeiling("provider_reported", "validated")).toBe("provider_reported");
  });

  it("infers legacy assertions conservatively from source_type", () => {
    expect(inferAssertionFromLegacySourceType("observation")).toBe("observed");
    expect(inferAssertionFromLegacySourceType("case")).toBe("observed");
    expect(inferAssertionFromLegacySourceType("promote")).toBe("observed");
    expect(inferAssertionFromLegacySourceType("ai_capture")).toBe("provider_reported");
    expect(inferAssertionFromLegacySourceType(undefined)).toBe("provider_reported");
  });

  it("resolves field assertion from metadata, preferring explicit assertion", () => {
    expect(resolveFieldAssertion({ assertion: "validated", source_type: "ai_capture" })).toBe(
      "validated",
    );
    expect(resolveFieldAssertion({ source_type: "observation" })).toBe("observed");
    expect(resolveFieldAssertion(undefined)).toBe("provider_reported");
  });

  it("resolves capture assertion from declared source first, then legacy source_type", () => {
    expect(resolveAssertionForCapture({ declared_source_type: "field_note" })).toBe(
      "provider_reported",
    );
    expect(resolveAssertionForCapture({ declared_source_type: "observation_case" })).toBe(
      "observed",
    );
    expect(resolveAssertionForCapture({ source_type: "observation" })).toBe("observed");
    expect(resolveAssertionForCapture({})).toBe("provider_reported");
  });

  it("maps OIE confirmation state to assertion at the promotion boundary", () => {
    expect(assertionFromObservationConfirmation("witnessed")).toBe("observed");
    expect(assertionFromObservationConfirmation("reported")).toBe("provider_reported");
    expect(assertionFromObservationConfirmation(null)).toBe("observed");
  });

  it("parses only valid assertion strings", () => {
    expect(parseIntelligenceAssertion("observed")).toBe("observed");
    expect(parseIntelligenceAssertion("bogus")).toBeUndefined();
    expect(parseIntelligenceAssertion(42)).toBeUndefined();
  });
});

describe("assertion write precedence (C2)", () => {
  it("higher assertion upgrades, equal merges, lower is blocked on replace", () => {
    expect(
      resolveAssertionWrite({ existing: "provider_reported", incoming: "observed", mergeStrategy: "replace" }),
    ).toBe("upgrade");
    expect(
      resolveAssertionWrite({ existing: "observed", incoming: "observed", mergeStrategy: "replace" }),
    ).toBe("merge");
    expect(
      resolveAssertionWrite({ existing: "observed", incoming: "provider_reported", mergeStrategy: "replace" }),
    ).toBe("blocked_downgrade");
    expect(
      resolveAssertionWrite({ existing: "validated", incoming: "observed", mergeStrategy: "replace" }),
    ).toBe("blocked_downgrade");
  });

  it("lower assertion may append as context, never replace", () => {
    expect(
      resolveAssertionWrite({ existing: "observed", incoming: "provider_reported", mergeStrategy: "append" }),
    ).toBe("append_context");
  });

  it("field assertion never downgrades after a write", () => {
    expect(nextFieldAssertion("observed", "provider_reported")).toBe("observed");
    expect(nextFieldAssertion("provider_reported", "observed")).toBe("observed");
    expect(nextFieldAssertion(undefined, "provider_reported")).toBe("provider_reported");
  });
});

describe("metadata stamping (C1 + Phase B declared source)", () => {
  const actor = { userId: "u1", userName: "Rep" };
  const value = "Visualization challenges during laparoscopic cases slow OR turnover.";

  it("stamps declared_source_type regardless of the flag", () => {
    disableFlag();
    const patch: Record<string, unknown> = {};
    applyIntelligenceFieldMetadataToPatch(patch, {
      existingMetadata: {},
      changedKeys: ["provider_workflow_pain_points"],
      fieldValues: { provider_workflow_pain_points: value },
      captureContext: { source_type: "ai_capture", declared_source_type: "field_note" },
      actor,
    });
    const meta = parseProviderIntelligenceFieldMetadata(patch.provider_intelligence_field_metadata);
    expect(meta.provider_workflow_pain_points?.declared_source_type).toBe("field_note");
    expect(meta.provider_workflow_pain_points?.assertion).toBeUndefined();
  });

  it("stamps assertion from the declared source when the flag is on", () => {
    enableFlag();
    const patch: Record<string, unknown> = {};
    applyIntelligenceFieldMetadataToPatch(patch, {
      existingMetadata: {},
      changedKeys: ["provider_workflow_pain_points"],
      fieldValues: { provider_workflow_pain_points: value },
      captureContext: { source_type: "observation", declared_source_type: "observation_case" },
      actor,
    });
    const meta = parseProviderIntelligenceFieldMetadata(patch.provider_intelligence_field_metadata);
    expect(meta.provider_workflow_pain_points?.assertion).toBe("observed");
  });

  it("never downgrades a stored assertion when a lower source touches the field", () => {
    enableFlag();
    const patch: Record<string, unknown> = {};
    applyIntelligenceFieldMetadataToPatch(patch, {
      existingMetadata: {
        provider_workflow_pain_points: {
          source_type: "observation",
          updated_at: "2026-06-01T00:00:00.000Z",
          assertion: "observed",
        },
      },
      changedKeys: ["provider_workflow_pain_points"],
      fieldValues: { provider_workflow_pain_points: value },
      captureContext: { source_type: "ai_capture", declared_source_type: "field_note" },
      actor,
    });
    const meta = parseProviderIntelligenceFieldMetadata(patch.provider_intelligence_field_metadata);
    expect(meta.provider_workflow_pain_points?.assertion).toBe("observed");
  });

  it("round-trips assertion and declared_source_type through parse", () => {
    const meta = parseProviderIntelligenceFieldMetadata({
      provider_procedure_focus: {
        source_type: "engagement",
        updated_at: "2026-06-01T00:00:00.000Z",
        assertion: "validated",
        declared_source_type: "debrief",
      },
    });
    expect(meta.provider_procedure_focus?.assertion).toBe("validated");
    expect(meta.provider_procedure_focus?.declared_source_type).toBe("debrief");
  });
});

describe("OIE promotion (C2 headline scenario: field note must not block observation)", () => {
  const noteBody = "Competitor tray was on the field during the case.";
  const priorFieldNote = "Provider mentioned they sometimes see competitor products.";

  function contactWithFieldNoteValue(assertion?: string) {
    return {
      provider_competitive_products: priorFieldNote,
      provider_intelligence_field_metadata: {
        provider_competitive_products: {
          source_type: "ai_capture",
          updated_at: "2026-06-01T00:00:00.000Z",
          ...(assertion ? { assertion } : {}),
        },
      },
    } as Record<string, unknown>;
  }

  it("flag off: keeps legacy first-writer-wins skip", () => {
    disableFlag();
    const extraction = extractFieldObservationNoteEntities(noteBody);
    const { patches, skips } = buildOpportunityIntelligencePromotionFromObservationExtraction(
      extraction,
      contactWithFieldNoteValue(),
    );
    expect(patches.find((p) => p.dbKey === "provider_competitive_products")).toBeUndefined();
    expect(
      skips.find((s) => s.db_key === "provider_competitive_products")?.skip_reason,
    ).toBe("existing_value");
  });

  it("flag on: observation promotes over a provider-reported field note, preserving prior text", () => {
    enableFlag();
    const extraction = extractFieldObservationNoteEntities(noteBody);
    const contact = contactWithFieldNoteValue("provider_reported");
    const { patches, skips } = buildOpportunityIntelligencePromotionFromObservationExtraction(
      extraction,
      contact,
    );
    const patch = patches.find((p) => p.dbKey === "provider_competitive_products");
    expect(patch).toBeDefined();
    expect(patch?.upgrade).toBe(true);
    expect(patch?.value).toContain(priorFieldNote);
    expect(skips.find((s) => s.db_key === "provider_competitive_products")).toBeUndefined();

    const merged = mergeOpportunityIntelligenceContactPatch(contact, patches);
    expect(String(merged.provider_competitive_products)).toContain(priorFieldNote);
    expect(String(merged.provider_competitive_products)).not.toBe(priorFieldNote);
  });

  it("flag on: equal or higher existing assertion still blocks promotion", () => {
    enableFlag();
    const extraction = extractFieldObservationNoteEntities(noteBody);
    const { patches, skips } = buildOpportunityIntelligencePromotionFromObservationExtraction(
      extraction,
      contactWithFieldNoteValue("observed"),
    );
    expect(patches.find((p) => p.dbKey === "provider_competitive_products")).toBeUndefined();
    expect(
      skips.find((s) => s.db_key === "provider_competitive_products")?.skip_reason,
    ).toBe("equal_or_higher_assertion");
  });

  it("flag on: legacy metadata without assertion infers from source_type (ai_capture → upgradeable)", () => {
    enableFlag();
    const extraction = extractFieldObservationNoteEntities(noteBody);
    const { patches } = buildOpportunityIntelligencePromotionFromObservationExtraction(
      extraction,
      contactWithFieldNoteValue(),
    );
    expect(patches.find((p) => p.dbKey === "provider_competitive_products")?.upgrade).toBe(true);
  });
});

describe("structural tripwires (C3)", () => {
  it("rejects evaluation/outcome lifecycle keys from log-update extraction", () => {
    for (const key of EVALUATION_OUTCOME_RESERVED_DB_KEYS) {
      expect(() => assertProviderIntelligenceWritableDbKey(key), key).toThrow(
        /evaluation\/outcome lifecycle/,
      );
    }
  });

  it("still allows normal provider intelligence keys", () => {
    for (const key of [
      "provider_workflow_pain_points",
      "provider_product_interests",
    ]) {
      expect(() => assertProviderIntelligenceWritableDbKey(key), key).not.toThrow();
      expect(isProviderIntelligenceDbKey(key), key).toBe(true);
    }
  });
});
