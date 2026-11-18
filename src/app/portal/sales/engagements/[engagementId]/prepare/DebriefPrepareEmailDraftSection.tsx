"use client";

import React from "react";
import {
  DEBRIEF_PREPARE_EMAIL_OUTREACH_GOALS,
  type DebriefPrepareEmailOutreachGoal,
} from "@/lib/surgical-sales/engagements/debriefPrepareProviderEmailDraft";
import { DEBRIEF_PRODUCT_KNOWLEDGE_IDS } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import { userFacingError } from "@/lib/errors/userFacingError";

export function DebriefPrepareEmailDraftSection({ engagementId }: { engagementId: string }) {
  const [outreachGoal, setOutreachGoal] = React.useState<DebriefPrepareEmailOutreachGoal | null>(
    null,
  );
  const [targetProductId, setTargetProductId] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [usedAi, setUsedAi] = React.useState<boolean | null>(null);
  const [copyState, setCopyState] = React.useState<"idle" | "copied">("idle");

  const canGenerate = Boolean(outreachGoal && targetProductId.trim());

  async function generateDraft() {
    if (!outreachGoal || !targetProductId.trim()) {
      setError("Select an outreach goal and target product first.");
      return;
    }

    setGenerating(true);
    setError(null);
    setCopyState("idle");

    try {
      const res = await fetch(
        `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/debrief/workspace/email-draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outreachGoal,
            targetProductId,
          }),
        },
      );
      const payload = (await res.json()) as {
        ok?: boolean;
        error?: string;
        subject?: string;
        body?: string;
        usedAi?: boolean;
      };

      if (!res.ok || !payload.ok || !payload.subject || !payload.body) {
        throw new Error(payload.error ?? "");
      }

      setSubject(payload.subject);
      setBody(payload.body);
      setUsedAi(payload.usedAi ?? true);
    } catch (e: unknown) {
      const message = userFacingError(e, "Could not generate email draft.");
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function copyDraft() {
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2_000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <div className="dpb-plan__email-draft" data-testid="debrief-email-draft-section">
      <div className="dpb-plan__email-goals" role="radiogroup" aria-label="Email outreach goal">
        {DEBRIEF_PREPARE_EMAIL_OUTREACH_GOALS.map((goal) => (
          <label
            key={goal.id}
            className={`dpb-plan__outcome${outreachGoal === goal.id ? " dpb-plan__outcome--selected" : ""}`}
          >
            <input
              type="radio"
              name="email-outreach-goal"
              value={goal.id}
              checked={outreachGoal === goal.id}
              onChange={() => setOutreachGoal(goal.id)}
            />
            <span>
              <strong>{goal.label}</strong>
              <small>{goal.hint}</small>
            </span>
          </label>
        ))}
      </div>

      <label className="dpb-plan__email-product-label" htmlFor="debrief-email-product">
        Target product
      </label>
      <select
        id="debrief-email-product"
        className="dpb-plan__input dpb-plan__email-product"
        value={targetProductId}
        onChange={(event) => setTargetProductId(event.target.value)}
      >
        <option value="">Select a product…</option>
        {DEBRIEF_PRODUCT_KNOWLEDGE_IDS.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>

      <div className="dpb-plan__assist-row">
        <button
          type="button"
          className="dpb-plan__assist-btn"
          disabled={!canGenerate || generating}
          onClick={() => void generateDraft()}
        >
          {generating ? "Drafting…" : "Draft Follow-Up Email"}
        </button>
        {usedAi === false ? (
          <span className="dpb-plan__email-meta">Template draft (AI unavailable)</span>
        ) : null}
      </div>

      {error ? (
        <p className="dpb-plan__email-error" role="alert">
          {error}
        </p>
      ) : null}

      {subject || body ? (
        <div className="dpb-plan__email-result" data-testid="debrief-email-draft-result">
          <div className="dpb-plan__email-result-head">
            <h3 className="dpb-plan__email-result-title">Draft email</h3>
            <button type="button" className="dpb-plan__assist-btn dpb-plan__assist-btn--inline" onClick={() => void copyDraft()}>
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
          <label className="dpb-plan__email-field-label" htmlFor="debrief-email-subject">
            Subject
          </label>
          <input
            id="debrief-email-subject"
            type="text"
            className="dpb-plan__input"
            value={subject}
            readOnly
          />
          <label className="dpb-plan__email-field-label" htmlFor="debrief-email-body">
            Body
          </label>
          <textarea
            id="debrief-email-body"
            className="dpb-plan__textarea"
            rows={10}
            value={body}
            readOnly
          />
        </div>
      ) : null}
    </div>
  );
}
