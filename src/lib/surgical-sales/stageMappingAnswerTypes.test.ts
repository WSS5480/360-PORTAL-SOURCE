import { describe, expect, it } from "vitest";
import {
  stageMappingOffersOptionalContact,
  stageMappingChoiceRequiresContact,
} from "./stageMappingAnswerTypes";
import { STAGE_MAPPING_SIGNAL_SPECS } from "./stageMappingQuestions";

describe("stageMappingAnswerTypes", () => {
  it("offers optional contact for inline-contact signals except scheduling ownership", () => {
    expect(stageMappingOffersOptionalContact(STAGE_MAPPING_SIGNAL_SPECS.clinical_champion)).toBe(true);
    expect(stageMappingOffersOptionalContact(STAGE_MAPPING_SIGNAL_SPECS.facility_vendor_pathway)).toBe(
      true,
    );
    expect(stageMappingOffersOptionalContact(STAGE_MAPPING_SIGNAL_SPECS.scheduling_owner)).toBe(false);
    expect(stageMappingOffersOptionalContact(STAGE_MAPPING_SIGNAL_SPECS.observation_approval)).toBe(
      false,
    );
  });

  it("does not require contact for any current mapping choice", () => {
    for (const spec of Object.values(STAGE_MAPPING_SIGNAL_SPECS)) {
      for (const choice of spec.choices) {
        expect(stageMappingChoiceRequiresContact(spec, choice.value)).toBe(false);
      }
    }
  });
});
