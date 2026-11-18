import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SALES_PATHWAY_EVALUATION_ACTIVITIES } from "@/lib/surgical-sales/salesPathwayCanonical";

describe("missionBoardEvaluationPath route schema", () => {
  it("accepts evaluation path enum values", () => {
    const schema = z.object({
      evaluation_path: z.enum(SALES_PATHWAY_EVALUATION_ACTIVITIES),
    });
    expect(schema.safeParse({ evaluation_path: "360 Experience" }).success).toBe(true);
  });
});
