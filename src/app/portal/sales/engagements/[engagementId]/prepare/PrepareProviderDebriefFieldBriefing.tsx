"use client";

import Link from "next/link";
import React from "react";
import type { PrepareProviderDebriefBriefing } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import {
  DEBRIEF_PREPARE_DESIRED_OUTCOMES,
  type DebriefPrepareDesiredOutcome,
  type DebriefPrepareLearnItem,
  type DebriefPrepareQuestionCard,
  type DebriefPrepareWorkspaceView,
} from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import { dedupePrepareLearnQuestions } from "@/lib/surgical-sales/engagements/buildDebriefGuidanceIntelligence";
import { userFacingError } from "@/lib/errors/userFacingError";
import { DebriefPrepareEmailDraftSection } from "./DebriefPrepareEmailDraftSection";
import {
  DebriefPrepareKnownFactsList,
  DebriefPrepareSummaryStrip,
} from "./DebriefPrepareSummaryStrip";
import {
  DebriefPreparePlanGroup,
  DebriefPreparePlanSection,
} from "./debriefPreparePlanLayout";

const SAVE_DEBOUNCE_MS = 650;

function PlanSection({
  title,
  children,
  hint,
  actions,
  collapsible,
  defaultCollapsed,
  tone,
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  tone?: "default" | "emphasis" | "optional";
}) {
  return (
    <DebriefPreparePlanSection
      title={title}
      hint={hint}
      actions={actions}
      collapsible={collapsible}
      defaultCollapsed={defaultCollapsed}
      tone={tone}
    >
      {children}
    </DebriefPreparePlanSection>
  );
}

function ConfirmChecklist({
  items,
  onChange,
  onAdd,
  onGenerateMore,
  generating,
}: {
  items: DebriefPrepareLearnItem[];
  onChange: (items: DebriefPrepareLearnItem[]) => void;
  onAdd: (text: string) => void;
  onGenerateMore: () => void;
  generating: boolean;
}) {
  const [draft, setDraft] = React.useState("");

  return (
    <div className="dpb-plan__checklist-wrap">
      <ul className="dpb-plan__checklist">
        {items.map((item) => (
          <li key={item.id}>
            <label className="dpb-plan__check">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) => {
                  onChange(
                    items.map((row) =>
                      row.id === item.id ? { ...row, checked: event.target.checked } : row,
                    ),
                  );
                }}
              />
              <span>{item.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="dpb-plan__assist-row">
        <button
          type="button"
          className="dpb-plan__assist-btn"
          disabled={generating}
          onClick={() => void onGenerateMore()}
        >
          {generating ? "Generating…" : "Generate More"}
        </button>
      </div>
      <div className="dpb-plan__add-row">
        <input
          type="text"
          className="dpb-plan__input dpb-plan__input--inline"
          value={draft}
          placeholder="Add my own…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const text = draft.trim();
              if (!text) return;
              onAdd(text);
              setDraft("");
            }
          }}
        />
        <button
          type="button"
          className="dpb-plan__add-btn"
          onClick={() => {
            const text = draft.trim();
            if (!text) return;
            onAdd(text);
            setDraft("");
          }}
        >
          Add My Own
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  card,
  onEdit,
  onDelete,
  onUse,
}: {
  card: DebriefPrepareQuestionCard;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(card.text);

  React.useEffect(() => {
    if (!editing) setDraft(card.text);
  }, [card.text, editing]);

  if (editing) {
    return (
      <div className="dpb-plan__qcard dpb-plan__qcard--editing">
        <textarea
          className="dpb-plan__textarea dpb-plan__textarea--compact"
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Edit question"
        />
        <div className="dpb-plan__qcard-actions">
          <button
            type="button"
            className="dpb-plan__qcard-btn dpb-plan__qcard-btn--primary"
            onClick={() => {
              const text = draft.trim();
              if (!text) return;
              onEdit(text);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="dpb-plan__qcard-btn"
            onClick={() => {
              setDraft(card.text);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`dpb-plan__qcard${card.used ? " dpb-plan__qcard--used" : ""}`}
      data-testid={`question-card-${card.id}`}
    >
      <p className="dpb-plan__qcard-text">{card.text}</p>
      <div className="dpb-plan__qcard-actions">
        <button type="button" className="dpb-plan__qcard-btn" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="dpb-plan__qcard-btn" onClick={onDelete}>
          Delete
        </button>
        <button
          type="button"
          className="dpb-plan__qcard-btn dpb-plan__qcard-btn--primary"
          onClick={onUse}
        >
          {card.used ? "Used" : "Use"}
        </button>
      </div>
    </div>
  );
}

export function PrepareProviderDebriefFieldBriefing({
  briefing,
  engagementId,
  engagementHref,
  providerId,
  organizationId,
}: {
  briefing: PrepareProviderDebriefBriefing;
  engagementId: string;
  engagementHref: string;
  providerId?: string | null;
  organizationId?: string | null;
}) {
  const [workspace, setWorkspace] = React.useState<DebriefPrepareWorkspaceView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmGenerating, setConfirmGenerating] = React.useState(false);
  const [questionsGenerating, setQuestionsGenerating] = React.useState(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceRef = React.useRef<DebriefPrepareWorkspaceView | null>(null);

  React.useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  React.useEffect(() => {
    if (!briefing.plan) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWorkspace() {
      setLoading(true);
      setLoadError(null);
      try {
        if (!engagementId.trim()) {
          setWorkspace(null);
          setLoadError("Open this from the meeting you want to debrief.");
          return;
        }

        const res = await fetch(
          `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/debrief/workspace`,
          { cache: "no-store" },
        );
        const payload = (await res.json()) as {
          ok?: boolean;
          error?: string;
          workspace?: DebriefPrepareWorkspaceView;
        };
        if (!cancelled) {
          if (res.ok && payload.ok && payload.workspace) {
            setWorkspace(payload.workspace);
          } else {
            setWorkspace(null);
            setLoadError(userFacingError(payload.error, "Could not load planning workspace."));
          }
        }
      } catch {
        if (!cancelled) {
          setWorkspace(null);
          setLoadError("Could not load planning workspace.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [briefing.plan, engagementId]);

  const persistWorkspace = React.useCallback(
    async (next: DebriefPrepareWorkspaceView) => {
      setSaveState("saving");
      try {
        const res = await fetch(
          `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/debrief/workspace`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetingObjective: next.meetingObjective,
              hypothesis: next.hypothesis,
              learnItems: next.learnItems,
              questionCards: next.questionCards,
              desiredOutcome: next.desiredOutcome,
              desiredOutcomeOther: next.desiredOutcomeOther,
              meetingNotes: next.meetingNotes,
            }),
          },
        );
        const payload = (await res.json()) as {
          ok?: boolean;
          workspace?: DebriefPrepareWorkspaceView;
        };
        if (res.ok && payload.ok) {
          if (payload.workspace) setWorkspace(payload.workspace);
          setSaveState("saved");
          return;
        }
        setSaveState("error");
      } catch {
        setSaveState("error");
      }
    },
    [engagementId],
  );

  const scheduleSave = React.useCallback(
    (next: DebriefPrepareWorkspaceView) => {
      setWorkspace(next);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persistWorkspace(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistWorkspace],
  );

  React.useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const updateWorkspace = React.useCallback(
    (patch: Partial<DebriefPrepareWorkspaceView>) => {
      const current = workspaceRef.current;
      if (!current) return;
      scheduleSave({ ...current, ...patch });
    },
    [scheduleSave],
  );

  const addLearnItem = React.useCallback(
    (text: string) => {
      const current = workspaceRef.current;
      if (!current) return;
      const id = `learn-${Date.now()}`;
      scheduleSave({
        ...current,
        learnItems: [...current.learnItems, { id, text, checked: false }],
      });
    },
    [scheduleSave],
  );

  const addQuestionCard = React.useCallback(
    (text: string) => {
      const current = workspaceRef.current;
      if (!current) return;
      const id = `question-${Date.now()}`;
      scheduleSave({
        ...current,
        questionCards: [...current.questionCards, { id, text, used: false }],
      });
    },
    [scheduleSave],
  );

  async function callAssist(action: "generate_hypothesis" | "generate_more_confirm" | "generate_more_questions") {
    const res = await fetch(
      `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/debrief/workspace/assist`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    const payload = (await res.json()) as {
      ok?: boolean;
      hypothesis?: string;
      items?: string[];
      questions?: string[];
    };
    if (!res.ok || !payload.ok) return null;
    return payload;
  }

  async function generateMoreConfirm() {
    const current = workspaceRef.current;
    if (!current) return;
    setConfirmGenerating(true);
    try {
      const payload = await callAssist("generate_more_confirm");
      if (!payload?.items?.length) return;
      const mergedTexts = dedupePrepareLearnQuestions(
        [...current.learnItems.map((item) => item.text), ...payload.items],
        6,
      );
      if (mergedTexts.length <= current.learnItems.length) return;
      const byText = new Map(current.learnItems.map((item) => [item.text.toLowerCase(), item]));
      const learnItems = mergedTexts.map((text, index) => {
        const existing = byText.get(text.toLowerCase());
        if (existing) return existing;
        return {
          id: `learn-gen-${Date.now()}-${index}`,
          text,
          checked: false,
        };
      });
      scheduleSave({
        ...current,
        learnItems,
      });
    } finally {
      setConfirmGenerating(false);
    }
  }

  async function generateMoreQuestions() {
    const current = workspaceRef.current;
    if (!current) return;
    setQuestionsGenerating(true);
    try {
      const payload = await callAssist("generate_more_questions");
      if (!payload?.questions?.length) return;
      const existing = new Set(current.questionCards.map((card) => card.text.toLowerCase()));
      const newCards = payload.questions
        .filter((text) => !existing.has(text.toLowerCase()))
        .map((text, index) => ({
          id: `question-gen-${Date.now()}-${index}`,
          text,
          used: false,
        }));
      if (newCards.length === 0) return;
      scheduleSave({
        ...current,
        questionCards: [...current.questionCards, ...newCards],
      });
    } finally {
      setQuestionsGenerating(false);
    }
  }

  const [questionDraft, setQuestionDraft] = React.useState("");

  if (briefing.missing_case_message && !briefing.plan) {
    return (
      <div className="dpb-coach-stack">
        <p className="dpb-coach-alert" role="status">
          {briefing.missing_case_message}
        </p>
        <div className="dpb-coach-links">
          {briefing.linked_case_href ? (
            <Link href={briefing.linked_case_href} className="dpb-coach-link">
              Open observation case
            </Link>
          ) : null}
          <Link href={engagementHref} className="dpb-coach-link dpb-coach-link--muted">
            Back to engagement
          </Link>
        </div>
      </div>
    );
  }

  if (!briefing.plan) {
    return (
      <div className="dpb-coach-stack" data-testid="debrief-preparation-workspace">
        <p className="dpb-coach-empty" role="status">
          Debrief planning is not available yet.
        </p>
        <div className="dpb-coach-links">
          <Link href={engagementHref} className="dpb-coach-link dpb-coach-link--muted">
            Back to engagement
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dpb-coach-stack" data-testid="debrief-preparation-workspace">
        <div className="dpb-prepare-loading" role="status" aria-busy="true">
          <div className="dpb-prepare-loading__bar" />
          <div className="dpb-prepare-loading__bar dpb-prepare-loading__bar--short" />
          <p className="dpb-coach-empty">Loading your planning workspace…</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="dpb-coach-stack" data-testid="debrief-preparation-workspace">
        <p className="dpb-coach-alert" role="alert">
          {loadError || "Could not load planning workspace."}
        </p>
        <div className="dpb-coach-links">
          <Link href={engagementHref} className="dpb-coach-link dpb-coach-link--muted">
            Back to engagement
          </Link>
        </div>
      </div>
    );
  }

  const learnChecked = workspace.learnItems.filter((item) => item.checked).length;
  const learnTotal = workspace.learnItems.length;
  const questionsReady = workspace.questionCards.filter((card) => !card.used).length;

  return (
    <div className="dpb-plan-stack" data-testid="debrief-preparation-workspace">
      <DebriefPrepareSummaryStrip
        workspace={workspace}
        completedObservationCount={briefing.completed_observation_count}
        saveState={saveState}
      />

      <DebriefPreparePlanGroup
        label="Ground yourself"
        hint="What the observation program already established"
      >
        <PlanSection title="What We Know" hint="Validated patterns across completed cases">
          <DebriefPrepareKnownFactsList facts={workspace.knownFacts} />
          {workspace.whyItMatters ? (
            <p className="dpb-plan__signal">{workspace.whyItMatters}</p>
          ) : null}
        </PlanSection>

        <PlanSection
          title="Meeting Objective"
          hint="One sentence — what you need from this debrief"
          tone="emphasis"
        >
          <textarea
            className="dpb-plan__textarea dpb-plan__textarea--objective"
            rows={2}
            value={workspace.meetingObjective}
            placeholder="e.g. Confirm whether visualization friction is routine enough to warrant an ACSIS evaluation case"
            onChange={(event) => updateWorkspace({ meetingObjective: event.target.value })}
            aria-label="Meeting objective"
          />
        </PlanSection>
      </DebriefPreparePlanGroup>

      <DebriefPreparePlanGroup
        label="Build your read"
        hint="Your commercial hypothesis before you walk in"
      >
        <PlanSection
          title="My Hypothesis"
          hint="Pre-filled from your observation patterns — edit to make it yours"
        >
          <textarea
            id="debrief-hypothesis"
            className="dpb-plan__textarea"
            rows={4}
            value={workspace.hypothesis}
            placeholder="What do you believe is going on — and what do you need to learn?"
            onChange={(event) => updateWorkspace({ hypothesis: event.target.value })}
            aria-label="My hypothesis"
          />
        </PlanSection>

        <PlanSection
          title="What We Need To Learn"
          hint={
            learnTotal > 0
              ? `${learnChecked} of ${learnTotal} marked ready — confirm the highest-priority gaps in the room`
              : "Top open gaps from the observation program"
          }
        >
          <ConfirmChecklist
            items={workspace.learnItems}
            onChange={(learnItems) => updateWorkspace({ learnItems })}
            onAdd={addLearnItem}
            onGenerateMore={() => void generateMoreConfirm()}
            generating={confirmGenerating}
          />
        </PlanSection>
      </DebriefPreparePlanGroup>

      <DebriefPreparePlanGroup
        label="In the room"
        hint="Conversation tools for the debrief itself"
      >
        <PlanSection
          title="Questions To Ask"
          hint={
            questionsReady > 0
              ? `${questionsReady} prompt${questionsReady === 1 ? "" : "s"} ready — mark Used as you go`
              : "Conversational prompts you can edit or use live"
          }
        >
          <div className="dpb-plan__qcards">
            {workspace.questionCards.map((card) => (
              <QuestionCard
                key={card.id}
                card={card}
                onEdit={(text) => {
                  updateWorkspace({
                    questionCards: workspace.questionCards.map((row) =>
                      row.id === card.id ? { ...row, text } : row,
                    ),
                  });
                }}
                onDelete={() => {
                  updateWorkspace({
                    questionCards: workspace.questionCards.filter((row) => row.id !== card.id),
                  });
                }}
                onUse={() => {
                  updateWorkspace({
                    questionCards: workspace.questionCards.map((row) =>
                      row.id === card.id ? { ...row, used: true } : row,
                    ),
                  });
                }}
              />
            ))}
          </div>
          <div className="dpb-plan__assist-row">
            <button
              type="button"
              className="dpb-plan__assist-btn"
              disabled={questionsGenerating}
              onClick={() => void generateMoreQuestions()}
            >
              {questionsGenerating ? "Generating…" : "Generate More Questions"}
            </button>
          </div>
          <div className="dpb-plan__add-row">
            <input
              type="text"
              className="dpb-plan__input dpb-plan__input--inline"
              value={questionDraft}
              placeholder="Add my own question…"
              onChange={(event) => setQuestionDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const text = questionDraft.trim();
                  if (!text) return;
                  addQuestionCard(text);
                  setQuestionDraft("");
                }
              }}
            />
            <button
              type="button"
              className="dpb-plan__add-btn"
              onClick={() => {
                const text = questionDraft.trim();
                if (!text) return;
                addQuestionCard(text);
                setQuestionDraft("");
              }}
            >
              Add My Own Question
            </button>
          </div>
        </PlanSection>

        <PlanSection title="Desired Outcome" hint="What success looks like walking out of the room">
          <div className="dpb-plan__outcomes" role="radiogroup" aria-label="Desired outcome">
            {DEBRIEF_PREPARE_DESIRED_OUTCOMES.map((option) => (
              <label
                key={option.id}
                className={`dpb-plan__outcome${workspace.desiredOutcome === option.id ? " dpb-plan__outcome--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="desired-outcome"
                  value={option.id}
                  checked={workspace.desiredOutcome === option.id}
                  onChange={() =>
                    updateWorkspace({ desiredOutcome: option.id as DebriefPrepareDesiredOutcome })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {workspace.desiredOutcome === "other" ? (
            <input
              type="text"
              className="dpb-plan__input"
              value={workspace.desiredOutcomeOther}
              placeholder="Describe your desired outcome…"
              onChange={(event) => updateWorkspace({ desiredOutcomeOther: event.target.value })}
            />
          ) : null}
        </PlanSection>
      </DebriefPreparePlanGroup>

      <DebriefPreparePlanGroup label="Follow-up tools" hint="Optional — use before or after the debrief">
        <PlanSection
          title="Follow-Up Email Draft"
          hint="AI draft from your observation intelligence — pick goal and product first"
          collapsible
          defaultCollapsed
          tone="optional"
        >
          <DebriefPrepareEmailDraftSection engagementId={engagementId} />
        </PlanSection>

        <PlanSection
          title="Meeting Notes"
          hint="Parking-lot context, attendees, relationship notes"
          collapsible
          defaultCollapsed
          tone="optional"
        >
          <textarea
            className="dpb-plan__textarea"
            rows={4}
            value={workspace.meetingNotes}
            placeholder="Who else is in the room, prior relationship context, logistics…"
            onChange={(event) => updateWorkspace({ meetingNotes: event.target.value })}
            aria-label="Meeting notes"
          />
        </PlanSection>
      </DebriefPreparePlanGroup>
    </div>
  );
}
