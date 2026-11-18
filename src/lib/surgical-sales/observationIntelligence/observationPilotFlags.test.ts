import { afterEach, describe, expect, it } from "vitest";

import {
  isBulkIntelligenceCaptureHiddenForPilot,
  isObservationAiFirstExtractionEnabled,
} from "./observationPilotFlags";

const ENV_KEYS = [
  "OBSERVATION_AI_FIRST_EXTRACTION",
  "OBSERVATION_PILOT_HIDE_BULK_CAPTURE",
  "NEXT_PUBLIC_OBSERVATION_PILOT_HIDE_BULK_CAPTURE",
] as const;

const saved = new Map<string, string | undefined>();
for (const key of ENV_KEYS) saved.set(key, process.env[key]);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("observation pilot flags (§0 / §7b)", () => {
  it("AI-first extraction is off unless the env flag is exactly '1'", () => {
    delete process.env.OBSERVATION_AI_FIRST_EXTRACTION;
    expect(isObservationAiFirstExtractionEnabled()).toBe(false);
    process.env.OBSERVATION_AI_FIRST_EXTRACTION = "true";
    expect(isObservationAiFirstExtractionEnabled()).toBe(false);
    process.env.OBSERVATION_AI_FIRST_EXTRACTION = "1";
    expect(isObservationAiFirstExtractionEnabled()).toBe(true);
  });

  it("bulk capture hide honors both the server and NEXT_PUBLIC variants", () => {
    delete process.env.OBSERVATION_PILOT_HIDE_BULK_CAPTURE;
    delete process.env.NEXT_PUBLIC_OBSERVATION_PILOT_HIDE_BULK_CAPTURE;
    expect(isBulkIntelligenceCaptureHiddenForPilot()).toBe(false);

    process.env.OBSERVATION_PILOT_HIDE_BULK_CAPTURE = "1";
    expect(isBulkIntelligenceCaptureHiddenForPilot()).toBe(true);

    delete process.env.OBSERVATION_PILOT_HIDE_BULK_CAPTURE;
    process.env.NEXT_PUBLIC_OBSERVATION_PILOT_HIDE_BULK_CAPTURE = "1";
    expect(isBulkIntelligenceCaptureHiddenForPilot()).toBe(true);
  });
});

describe("bulk findings route gate (§7b)", () => {
  it("rejects bulk capture with 403 when the pilot hide flag is on", async () => {
    process.env.OBSERVATION_PILOT_HIDE_BULK_CAPTURE = "1";
    const { POST } = await import(
      "@/app/api/portal/sales/providers/[providerId]/intelligence-capture/findings/route"
    );
    const res = await POST(
      new Request("http://localhost/api/portal/sales/providers/p1/intelligence-capture/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findings: [] }),
      }),
      { params: Promise.resolve({ providerId: "p1" }) },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/disabled during the observation pilot/i);
  });
});
