import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatTomSandyReviewUpdatePipelineAuditReport,
  runTomSandyReviewUpdatePipelineAudit,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdatePipelineAudit";

describe("Review Updates pipeline audit — Tom Sandy", () => {
  it("produces deduped review items without provider-as-contact or duplicate Jennifer tasks", () => {
    const audit = runTomSandyReviewUpdatePipelineAudit();

    const contactItems = audit.reviewItems.filter((item) => item.type === "contact_candidate");
    const followUps = audit.reviewItems.filter((item) => item.type === "follow_up_task");
    const observationItems = audit.reviewItems.filter(
      (item) => item.type === "observation_access_update",
    );
    const credentialingItems = audit.reviewItems.filter(
      (item) =>
        item.type === "organization_intelligence_update" &&
        /credential/i.test(item.topicTitle ?? ""),
    );

    expect(contactItems.map((item) => item.displayName)).toEqual(["Jennifer"]);
    expect(contactItems.some((item) => /tom/i.test(item.displayName ?? ""))).toBe(false);

    expect(followUps.length).toBe(3);
    expect(followUps.some((d) => /get jennifer's phone or email/i.test(d.taskTitle ?? ""))).toBe(true);
    expect(
      followUps.some((d) => /upcoming robotic hernia|observation opportunities/i.test(d.taskTitle ?? "")),
    ).toBe(true);

    expect(observationItems).toHaveLength(1);
    expect(credentialingItems).toHaveLength(0);

    expect(
      audit.removedItems.some(
        (trace) =>
          trace.reviewType === "contact_candidate" && trace.removalReason === "matches_provider",
      ) ||
        !audit.upstreamCollections
          .find((c) => c.id === "normalized_atomic_facts")
          ?.records.some(
            (row) =>
              row.fact_type === "workflow_contact" &&
              /tom/i.test(String(row.entity ?? "")),
          ),
    ).toBe(true);

    expect(
      audit.removedItems.some(
        (trace) =>
          trace.reviewType === "follow_up_task" &&
          trace.removalReason === "duplicate_semantic_intent",
      ),
    ).toBe(true);

    expect(
      audit.removedItems.some(
        (trace) =>
          trace.reviewType === "follow_up_task" &&
          trace.removalReason === "merged_into_observation_readiness",
      ),
    ).toBe(false);

    for (const trace of audit.emittedItems) {
      expect(trace.sourceFactId).toBeTruthy();
      expect(trace.sourceCollection).toBeTruthy();
      expect(trace.reviewType).toBeTruthy();
      expect(trace.dedupeKey).toBeTruthy();
    }
  });

  it("writes Tom Sandy audit report artifact", () => {
    const report = formatTomSandyReviewUpdatePipelineAuditReport();
    expect(report).toContain("# Review Updates Pipeline Audit — Tom Sandy");
    expect(report).toContain("Jennifer");
    expect(report).toContain("## 4. Items Removed");

    const outPath = join(
      process.cwd(),
      "src/lib/surgical-sales/debriefIntelligencePipeline/DEBRIEF_REVIEW_UPDATE_PIPELINE_AUDIT_TOM_SANDY.md",
    );
    writeFileSync(outPath, report, "utf8");
  });
});
