"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { patchObservationCase } from "./caseObservationPatch";
import { userFacingError } from "@/lib/errors/userFacingError";

const AUTOSAVE_MS = 900;

export function CaseObservationOpenQuestionsSection({
  caseId,
  caseRow,
  disabled,
  onCasePatched,
  onMessage,
  variant = "default",
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onMessage: (message: string) => void;
  variant?: "default" | "onsite";
}) {
  const [questions, setQuestions] = React.useState(() => String(caseRow.live_observation_questions ?? ""));
  const savedRef = React.useRef(questions);
  const saveTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const next = String(caseRow.live_observation_questions ?? "");
    setQuestions(next);
    savedRef.current = next;
  }, [caseRow.live_observation_questions]);

  React.useEffect(
    () => () => {
      if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    },
    [],
  );

  function queueSave(nextValue: string) {
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        if (disabled || nextValue === savedRef.current) return;
        try {
          const saved = await patchObservationCase(caseId, {
            live_observation_questions: nextValue.trim() || null,
          });
          savedRef.current = nextValue;
          onCasePatched(saved);
        } catch (error: unknown) {
          onMessage(userFacingError(error, "Could not save open questions"));
        }
      })();
    }, AUTOSAVE_MS);
  }

  return (
    <section
      className={variant === "onsite" ? "case-obs-onsite-block" : "case-obs-workflow-section"}
      aria-labelledby="case-obs-questions-title"
    >
      <h3 id="case-obs-questions-title" className={variant === "onsite" ? "case-obs-onsite-block-title" : "case-obs-workflow-section-title"}>
        Open questions
      </h3>
      {variant === "default" ? (
        <p className="case-obs-workflow-section-lead">Questions to resolve during or after the observation.</p>
      ) : null}
      <textarea
        value={questions}
        onChange={(event) => {
          const next = event.target.value;
          setQuestions(next);
          queueSave(next);
        }}
        rows={4}
        disabled={disabled}
        placeholder="What still needs an answer from the surgeon, staff, or coordinator?"
        style={{ ...sc.input, resize: "vertical" }}
      />
    </section>
  );
}
