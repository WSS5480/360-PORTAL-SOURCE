import { randomUUID } from "node:crypto";
import { nextAttemptAt, STALE_LOCK_MS, waitUntil } from "@/lib/integrations/outbound/backoff";
import { payloadHash } from "@/lib/integrations/outbound/payload";
import { isTrackingEnrichment } from "@/lib/integrations/outbound/shipmentPlan";
import type { AttemptRecord, OutboundJob, PlannedJob } from "@/lib/integrations/outbound/types";

export const DEFAULT_MAX_ATTEMPTS = 8;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function jobKey(job: { partnerId: string; eventType: string; businessKey: string }): string {
  return `${job.partnerId}:${job.eventType}:${job.businessKey}`;
}

export type JobMerge =
  | { action: "insert"; job: OutboundJob }
  | { action: "update"; job: OutboundJob }
  | { action: "keep"; job: OutboundJob }
  | { action: "keep-and-add"; job: OutboundJob; extra: PlannedJob };

export function mergePlannedJob(existing: OutboundJob | null, planned: PlannedJob, now: Date): JobMerge {
  const hash = payloadHash(planned.payload);
  if (!existing) {
    return {
      action: "insert",
      job: {
        ...planned,
        id: randomUUID(),
        payloadHash: hash,
        attemptCount: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: (planned.waitReason ? waitUntil(now) : now).toISOString(),
        lockedAt: null,
        lockedBy: null,
        lastHttpStatus: null,
        lastError: planned.waitReason,
        updatedAt: now.toISOString(),
      },
    };
  }

  if (existing.status === "processing") return { action: "keep", job: existing };
  if (existing.status === "failed") return { action: "keep", job: existing };
  if (existing.status === "pending" && planned.status === "pending" && existing.payloadHash === hash) {
    return { action: "keep", job: existing };
  }

  if (existing.status === "succeeded") {
    if (existing.payloadHash === hash) return { action: "keep", job: existing };
    if (existing.eventType === "payment-link" || (existing.eventType === "shipment" && isTrackingEnrichment(existing.payload, planned.payload))) {
      return {
        action: "update",
        job: {
          ...existing,
          payload: planned.payload,
          payloadHash: hash,
          status: "pending",
          blockedReason: null,
          waitReason: null,
          lastHttpStatus: null,
          lastError: null,
          nextAttemptAt: now.toISOString(),
          lockedAt: null,
          lockedBy: null,
          updatedAt: now.toISOString(),
        },
      };
    }
    return {
      action: "keep-and-add",
      job: existing,
      extra: {
        ...planned,
        businessKey: `${planned.businessKey}:revision`,
        status: "blocked",
        blockedReason:
          planned.eventType === "invoice"
            ? "invoice_total_changed_after_sync"
            : planned.eventType === "payment"
              ? "payment_conflict_after_sync"
              : "shipment_conflict_after_sync",
        waitReason: null,
      },
    };
  }

  return {
    action: "update",
    job: {
      ...existing,
      externalOrderNumber: planned.externalOrderNumber,
      payload: planned.payload,
      payloadHash: hash,
      status: planned.status,
      blockedReason: planned.blockedReason,
      waitReason: planned.waitReason,
      lastError: planned.waitReason ?? planned.blockedReason,
      nextAttemptAt: (planned.waitReason ? waitUntil(now) : now).toISOString(),
      lockedAt: null,
      lockedBy: null,
      updatedAt: now.toISOString(),
    },
  };
}

export function applyManualRetry(job: OutboundJob, now: Date): { ok: true; job: OutboundJob } | { ok: false; error: string } {
  if (job.status !== "failed" && job.status !== "blocked") {
    return { ok: false, error: "Only a failed or blocked synchronization can be retried." };
  }
  return {
    ok: true,
    job: {
      ...job,
      status: "pending",
      attemptCount: 0,
      blockedReason: null,
      waitReason: null,
      lastError: null,
      nextAttemptAt: now.toISOString(),
      lockedAt: null,
      lockedBy: null,
      updatedAt: now.toISOString(),
    },
  };
}

/**
 * In-process model of integration_claim_outbound_jobs.
 * Claims are serialized, stale processing locks are released, and SKIP LOCKED
 * is represented by never selecting a row another claim has already locked.
 */
export class OutboundJobQueue {
  jobs: OutboundJob[] = [];
  attempts: AttemptRecord[] = [];
  private tail: Promise<void> = Promise.resolve();

  private run<T>(work: () => T): Promise<T> {
    const run = this.tail.then(() => work());
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  upsert(planned: PlannedJob[], now: Date): Promise<OutboundJob[]> {
    return this.run(() => {
      for (const item of planned) this.applyPlanned(item, now);
      return clone(this.jobs);
    });
  }

  private applyPlanned(planned: PlannedJob, now: Date) {
    const existing = this.jobs.find((job) => jobKey(job) === jobKey(planned)) ?? null;
    const merged = mergePlannedJob(existing, planned, now);
    if (merged.action === "insert") this.jobs.push(merged.job);
    if (merged.action === "update") {
      const index = this.jobs.findIndex((job) => job.id === merged.job.id);
      if (index >= 0) this.jobs[index] = merged.job;
    }
    if (merged.action === "keep-and-add") {
      const revision = this.jobs.find((job) => jobKey(job) === jobKey(merged.extra));
      if (!revision) {
        const inserted = mergePlannedJob(null, merged.extra, now);
        if (inserted.action === "insert") this.jobs.push(inserted.job);
      }
    }
  }

  claim(workerId: string, limit: number, now: Date): Promise<OutboundJob[]> {
    return this.run(() => {
      const staleBefore = now.getTime() - STALE_LOCK_MS;
      for (const job of this.jobs) {
        if (job.status === "processing" && job.lockedAt && Date.parse(job.lockedAt) < staleBefore) {
          job.status = "pending";
          job.lockedAt = null;
          job.lockedBy = null;
          job.updatedAt = now.toISOString();
        }
      }
      const due = this.jobs
        .filter((job) => job.status === "pending" && Date.parse(job.nextAttemptAt) <= now.getTime())
        .sort((left, right) => (left.nextAttemptAt < right.nextAttemptAt ? -1 : left.nextAttemptAt > right.nextAttemptAt ? 1 : left.id < right.id ? -1 : 1))
        .slice(0, limit);
      for (const job of due) {
        job.status = "processing";
        job.lockedAt = now.toISOString();
        job.lockedBy = workerId;
        job.updatedAt = now.toISOString();
      }
      return clone(due);
    });
  }

  save(job: OutboundJob, attempt: AttemptRecord | null): Promise<void> {
    return this.run(() => {
      const index = this.jobs.findIndex((row) => row.id === job.id);
      if (index >= 0) this.jobs[index] = job;
      if (attempt) this.attempts.push(attempt);
    });
  }

  retry(jobId: string, now: Date): Promise<{ ok: true; job: OutboundJob } | { ok: false; error: string }> {
    return this.run(() => {
      const job = this.jobs.find((row) => row.id === jobId);
      if (!job) return { ok: false, error: "Synchronization job not found." };
      const result = applyManualRetry(job, now);
      if (!result.ok) return result;
      const index = this.jobs.findIndex((row) => row.id === jobId);
      this.jobs[index] = result.job;
      return { ok: true as const, job: clone(result.job) };
    });
  }
}
