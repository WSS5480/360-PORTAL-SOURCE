"use client";

import React from "react";
import type { PrepareWhatMattersMost } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import type { PrepareWhatMattersMostLineId } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import {
  buildPatchForTodayMatter,
  PREPARE_TODAY_DISPLAY_LABELS,
  PREPARE_TODAY_MATTER_LINE_IDS,
  readTodayMatterSavedValueFromPlan,
  readTodayMatterValueFromPlan,
  type PrepareTodayPlanFields,
} from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import { PrepareTodayMatterSheet } from "./PrepareTodayMatterSheet";
import { userFacingError } from "@/lib/errors/userFacingError";

const HIGHLIGHT_MS = 2400;

function truncatePreview(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function PrepareTodayEditableCards({
  title,
  sectionKicker,
  tier = "secondary",
  lineFilter,
  lines,
  planFields,
  engagementId,
  engagementType,
  onSaved,
  onError,
}: {
  title: string;
  sectionKicker?: string;
  tier?: "primary" | "secondary";
  lineFilter?: readonly PrepareWhatMattersMostLineId[];
  lines: PrepareWhatMattersMost["lines"];
  planFields: PrepareTodayPlanFields;
  engagementId: string;
  engagementType: string;
  onSaved: () => void | Promise<void>;
  onError: (message: string | null) => void;
}) {
  const visibleIds = React.useMemo(() => {
    const allowed = lineFilter?.length ? lineFilter : PREPARE_TODAY_MATTER_LINE_IDS;
    return PREPARE_TODAY_MATTER_LINE_IDS.filter((id) => allowed.includes(id));
  }, [lineFilter]);

  const fallbackById = React.useMemo(() => {
    const map = new Map<PrepareWhatMattersMostLineId, string>();
    for (const line of lines) map.set(line.id, line.value);
    return map;
  }, [lines]);

  const [values, setValues] = React.useState<Record<PrepareWhatMattersMostLineId, string>>(() =>
    Object.fromEntries(
      PREPARE_TODAY_MATTER_LINE_IDS.map((id) => [
        id,
        readTodayMatterValueFromPlan(id, planFields, fallbackById.get(id) ?? "", engagementType),
      ]),
    ) as Record<PrepareWhatMattersMostLineId, string>,
  );

  const savedById = React.useMemo(
    () =>
      Object.fromEntries(
        PREPARE_TODAY_MATTER_LINE_IDS.map((id) => [
          id,
          readTodayMatterSavedValueFromPlan(id, planFields, engagementType),
        ]),
      ) as Record<PrepareWhatMattersMostLineId, string>,
    [planFields, engagementType],
  );

  const [editingId, setEditingId] = React.useState<PrepareWhatMattersMostLineId | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [highlightIds, setHighlightIds] = React.useState<Set<PrepareWhatMattersMostLineId>>(() => new Set());
  const [zoneHighlight, setZoneHighlight] = React.useState(false);
  const highlightTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setValues(
      Object.fromEntries(
        PREPARE_TODAY_MATTER_LINE_IDS.map((id) => {
          const saved = savedById[id]?.trim();
          if (saved) return [id, saved];
          return [id, fallbackById.get(id)?.trim() ?? ""];
        }),
      ) as Record<PrepareWhatMattersMostLineId, string>,
    );
  }, [savedById, fallbackById]);

  React.useEffect(() => {
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  function flashCards(ids: PrepareWhatMattersMostLineId[]) {
    setHighlightIds(new Set(ids));
    setZoneHighlight(true);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightIds(new Set());
      setZoneHighlight(false);
      highlightTimerRef.current = null;
    }, HIGHLIGHT_MS);
  }

  async function saveLine(id: PrepareWhatMattersMostLineId, nextValue: string) {
    setSaving(true);
    onError(null);
    try {
      const body = buildPatchForTodayMatter({
        lineId: id,
        value: nextValue,
        planFields,
        engagementType,
      });
      const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");
      setValues((prev) => ({ ...prev, [id]: nextValue.trim() }));
      setEditingId(null);
      await onSaved();
    } catch (e: unknown) {
      onError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const editingLabel = editingId ? PREPARE_TODAY_DISPLAY_LABELS[editingId] : "";

  if (visibleIds.length === 0) return null;

  return (
    <>
      <section
        className={`pfm-mission-focus pfm-mission-focus--${tier}${zoneHighlight ? " pfm-mission-zone--ai-highlight" : ""}`}
        aria-labelledby={`pfm-mission-focus-${tier}`}
      >
        <div className="pfm-mission-zone-head pfm-mission-focus-head">
          <div>
            <h2 id={`pfm-mission-focus-${tier}`} className="pfm-mission-focus-title">
              {title}
            </h2>
            {sectionKicker ? <p className="pfm-mission-focus-kicker">{sectionKicker}</p> : null}
          </div>
        </div>
        <div className={`pfm-today-cards pfm-today-cards--${tier}`}>
          {visibleIds.map((id) => {
            const value = values[id] ?? "";
            const empty = !value.trim();
            const highlighted = highlightIds.has(id);
            return (
              <div key={id} className="pfm-today-card-wrap">
                <button
                  type="button"
                  className={`pfm-today-card pfm-today-card--${id}${empty ? " pfm-today-card--empty" : ""}${highlighted ? " pfm-today-card--ai-highlight" : ""}`}
                  disabled={saving}
                  aria-label={`Edit ${PREPARE_TODAY_DISPLAY_LABELS[id]}`}
                  onClick={() => setEditingId(id)}
                >
                  {tier !== "primary" ? (
                    <span className="pfm-today-card-label">{PREPARE_TODAY_DISPLAY_LABELS[id]}</span>
                  ) : null}
                  <p className="pfm-today-card-value">
                    {empty ? "Tap to add…" : truncatePreview(value, tier === "primary" ? 140 : 100)}
                  </p>
                  <span className="pfm-today-card-edit" aria-hidden>
                    ✎
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <PrepareTodayMatterSheet
        open={editingId !== null}
        title="Edit focus"
        label={editingLabel}
        initialValue={editingId ? values[editingId] ?? "" : ""}
        busy={saving}
        onClose={() => setEditingId(null)}
        onSave={(v) => (editingId ? saveLine(editingId, v) : undefined)}
      />
    </>
  );
}
