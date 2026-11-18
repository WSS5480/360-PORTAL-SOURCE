"use client";



import React from "react";

import { buildProductSupportFieldNoteTimeline } from "@/lib/surgical-sales/buildProductSupportFieldNoteTimeline";
import { CaseFieldNoteList } from "./CaseFieldNoteList";

import { observationFieldExecutionCss } from "./observationFieldExecutionCss";

import { ObservationCaseNoteCapture } from "./ObservationCaseNoteCapture";



type NoteActivity = {

  id: string;

  activity_type: string;

  body: string;

  metadata_json?: Record<string, unknown>;

  created_at: string;

  actor_display_name?: string;

};



export function ObservationCaseFieldNotes({

  activities,

  disabled,

  onSaveNote,

  onBeginCapture,

  onDeleteNote,

  onMarkComplete,

  showMarkCompleteNudge = false,

}: {

  activities?: NoteActivity[];

  disabled?: boolean;

  onSaveNote: (
    body: string,
    meta?: { captureMode?: "voice" | "quick" },
  ) => Promise<void | import("@/lib/surgical-sales/observationCaptureFeedback").ObservationCaptureFeedbackResult>;

  onBeginCapture?: () => void | Promise<void>;

  onDeleteNote?: (noteId: string) => Promise<void>;

  onMarkComplete?: () => void | Promise<void>;

  showMarkCompleteNudge?: boolean;

}) {

  const timeline = React.useMemo(

    () => buildProductSupportFieldNoteTimeline(activities, "Rep"),

    [activities],

  );



  return (

    <div className="case-obs-execution case-obs-field-notes-tab">

      <style dangerouslySetInnerHTML={{ __html: observationFieldExecutionCss }} />



      <ObservationCaseNoteCapture

        disabled={disabled}

        onSaveNote={onSaveNote}

        onBeginCapture={onBeginCapture}

        onMarkComplete={onMarkComplete}

        showMarkCompleteNudge={showMarkCompleteNudge}

      />



      {timeline.length > 0 ? (

        <div className="case-obs-execution-note-stream" aria-label="Note stream">

          <CaseFieldNoteList
            entries={timeline}
            disabled={disabled}
            onDeleteNote={onDeleteNote}
          />

        </div>

      ) : (

        <p className="case-obs-execution-empty">No notes yet.</p>

      )}

    </div>

  );

}


