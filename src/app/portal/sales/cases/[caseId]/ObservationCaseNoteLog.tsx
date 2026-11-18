"use client";



import React from "react";

import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";

import { buildProductSupportFieldNoteTimeline } from "@/lib/surgical-sales/buildProductSupportFieldNoteTimeline";

import { observationCaseIntelligenceTimelineCss } from "./observationCaseIntelligenceTimelineCss";

import { CaseFieldNoteList } from "./CaseFieldNoteList";



type NoteActivity = {

  id: string;

  activity_type: string;

  body: string;

  metadata_json?: Record<string, unknown>;

  created_at: string;

  actor_display_name?: string;

};



export function ObservationCaseNoteLog({

  activities,

  limit,

  order = "desc",

  disabled,

  onDeleteNote,

}: {

  activities?: NoteActivity[];

  limit?: number;

  order?: "asc" | "desc";

  disabled?: boolean;

  onDeleteNote?: (noteId: string) => Promise<void>;

}) {

  const timeline = React.useMemo(() => {

    const rows = buildProductSupportFieldNoteTimeline(activities, "Rep");

    const sorted =

      order === "asc"

        ? rows

        : [...rows].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;

  }, [activities, limit, order]);



  return (

    <section className="case-obs-note-log" aria-labelledby="case-obs-note-log-title">

      <style dangerouslySetInnerHTML={{ __html: observationCaseIntelligenceTimelineCss }} />

      <h2 id="case-obs-note-log-title" className="case-obs-detail-card-title">

        {OBSERVATION_DETAIL_SECTION_LABELS.noteLog}

      </h2>



      {timeline.length === 0 ? (

        <p className="case-obs-intel-timeline-empty">No notes yet.</p>

      ) : (

        <div className="case-obs-note-log-list">

          <CaseFieldNoteList

            entries={timeline}

            disabled={disabled}

            onDeleteNote={onDeleteNote}

            itemClassName="case-obs-note-log-item"

            timeClassName="case-obs-note-log-time"

            bodyClassName="case-obs-note-log-body"

          />

        </div>

      )}

    </section>

  );

}


