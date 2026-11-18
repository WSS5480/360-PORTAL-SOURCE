"use client";



import React from "react";

import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";

import {

  INTELLIGENCE_CAPTURE_FLOW_UI,

  intelligenceCaptureMethodDef,

} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureMethods";

import { intelligenceCaptureCategoryDef } from "@/lib/surgical-sales/intelligenceCaptureCategories";

import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";

import { normalizeCaptureTextToFindings } from "@/lib/surgical-sales/intelligenceCapture/normalizeCaptureTextToFindings";

import { INTELLIGENCE_CAPTURE_FINDING_UI } from "@/lib/surgical-sales/intelligenceCapture/mapCategoryFinding";

import {

  LOG_UPDATE_DICTATION_CAPTURED,

  LOG_UPDATE_VOICE_IDLE,

  LOG_UPDATE_VOICE_LISTENING,

  LOG_UPDATE_VOICE_PAUSE,

  LOG_UPDATE_VOICE_PAUSED,

  LOG_UPDATE_VOICE_RESUME,

  LOG_UPDATE_VOICE_START,

  LOG_UPDATE_VOICE_STOP,

  LOG_UPDATE_VOICE_TRANSCRIBING,

  LOG_UPDATE_VOICE_UNAVAILABLE,

} from "@/lib/surgical-sales/logUpdateUx";
import { userFacingError } from "@/lib/errors/userFacingError";



export function IntelligenceCaptureBulkTextPanel({

  categoryId,

  providerId,

  onBack,

  onFindingSaved,

}: {

  categoryId: IntelligenceCaptureCategoryId;

  providerId: string;

  onBack: () => void;

  onFindingSaved: (provider: Record<string, unknown>) => void | Promise<void>;

}) {

  const [text, setText] = React.useState("");

  const [saving, setSaving] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const [confirmation, setConfirmation] = React.useState<string | null>(null);

  const [dictationCaptured, setDictationCaptured] = React.useState(false);



  const category = intelligenceCaptureCategoryDef(categoryId);

  const method = intelligenceCaptureMethodDef("freeform_note");

  const voiceAvailable = isVoiceCaptureAvailable();



  const dictation = useSpeechDictation(setText, salesDictationOptions({ onDictationCaptured: () => setDictationCaptured(true) }));



  const previewFindings = React.useMemo(() => normalizeCaptureTextToFindings(text), [text]);



  const handleSave = React.useCallback(async () => {

    if (saving) return;

    const findings = normalizeCaptureTextToFindings(text);

    if (!findings.length) {

      setError(INTELLIGENCE_CAPTURE_FLOW_UI.bulkEmptyError);

      return;

    }



    setSaving(true);

    setError(null);

    setConfirmation(null);

    try {

      const endpoint =

        findings.length === 1

          ? `/api/portal/sales/providers/${encodeURIComponent(providerId)}/intelligence-capture/finding`

          : `/api/portal/sales/providers/${encodeURIComponent(providerId)}/intelligence-capture/findings`;



      const body =

        findings.length === 1

          ? { categoryId, finding: findings[0] }

          : { categoryId, findings };



      const res = await fetch(endpoint, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(body),

      });

      const j = (await res.json()) as {

        ok?: boolean;

        error?: string;

        savedCount?: number;

        confirmationMessage?: string;

        provider?: Record<string, unknown>;

      };

      if (!res.ok || !j.ok) {

        throw new Error(j.error ?? "");

      }

      setText("");

      setDictationCaptured(false);

      setConfirmation(

        j.confirmationMessage ??

          INTELLIGENCE_CAPTURE_FLOW_UI.bulkSavedConfirmation(j.savedCount ?? findings.length),

      );

      if (j.provider) {

        await onFindingSaved(j.provider);

      }

    } catch (err) {

      setError(userFacingError(err, "Could not save those findings."));

    } finally {

      setSaving(false);

    }

  }, [categoryId, onFindingSaved, providerId, saving, text]);



  const micLabel =

    dictation.transcribing

      ? LOG_UPDATE_VOICE_TRANSCRIBING

      : dictation.dictating

        ? LOG_UPDATE_VOICE_STOP

        : dictation.dictationPaused

          ? LOG_UPDATE_VOICE_RESUME

          : LOG_UPDATE_VOICE_START;



  const voiceStatus =

    dictation.transcribing

      ? LOG_UPDATE_VOICE_TRANSCRIBING

      : dictation.dictating

        ? LOG_UPDATE_VOICE_LISTENING

        : dictation.dictationPaused

          ? LOG_UPDATE_VOICE_PAUSED

          : LOG_UPDATE_VOICE_IDLE;



  return (

    <div className="intel-capture-bulk-panel">

      <header className="intel-capture-bulk-head">

        <button type="button" className="intel-capture-category-back" onClick={onBack}>

          ← {INTELLIGENCE_CAPTURE_FLOW_UI.backToMethods}

        </button>

        <h3 className="intel-capture-bulk-title">

          {category.name} · {method.name}

        </h3>

        <p className="intel-capture-bulk-desc">{method.description}</p>

      </header>



      <div className="intel-capture-bulk-voice">

        <button

          type="button"

          className={`intel-capture-bulk-mic${

            dictation.dictating ? " intel-capture-bulk-mic--active" : ""

          }`}

          disabled={saving || dictation.transcribing}

          onClick={() => {

            if (dictation.dictating) {

              dictation.stopDictation();

              return;

            }

            if (dictation.dictationPaused) {

              dictation.resumeDictation(text);

              return;

            }

            dictation.startDictation(text);

          }}

          aria-label={micLabel}

        >

          🎙

        </button>

        <div className="intel-capture-bulk-voice-meta">

          <span className="intel-capture-bulk-voice-status">{voiceStatus}</span>

          {!voiceAvailable ? (

            <span className="intel-capture-bulk-voice-hint">{LOG_UPDATE_VOICE_UNAVAILABLE}</span>

          ) : null}

          {dictationCaptured ? (

            <span className="intel-capture-bulk-voice-captured">{LOG_UPDATE_DICTATION_CAPTURED}</span>

          ) : null}

          {dictation.dictationError ? (

            <span className="intel-capture-bulk-voice-error" role="alert">

              {dictation.dictationError}

            </span>

          ) : null}

        </div>

        {dictation.dictating ? (

          <button

            type="button"

            className="intel-capture-bulk-voice-pause"

            disabled={saving}

            onClick={() => dictation.pauseDictation(text)}

          >

            {LOG_UPDATE_VOICE_PAUSE}

          </button>

        ) : null}

      </div>



      <label className="intel-capture-finding-label">

        {INTELLIGENCE_CAPTURE_FINDING_UI.inputLabel}

        <textarea

          className="intel-capture-finding-input intel-capture-finding-input--bulk"

          value={text}

          onChange={(e) => setText(e.target.value)}

          placeholder={INTELLIGENCE_CAPTURE_FLOW_UI.freeformPlaceholder}

          rows={10}

          disabled={saving}

        />

      </label>



      {previewFindings.length > 0 ? (

        <section className="intel-capture-bulk-preview" aria-label="Findings preview">

          <h4 className="intel-capture-bulk-preview-title">

            {previewFindings.length} finding{previewFindings.length === 1 ? "" : "s"} to save

          </h4>

          <ul className="intel-capture-bulk-preview-list">

            {previewFindings.map((finding, index) => (

              <li key={`${index}-${finding.slice(0, 24)}`} className="intel-capture-bulk-preview-item">

                {finding}

              </li>

            ))}

          </ul>

        </section>

      ) : null}



      <div className="intel-capture-finding-actions">

        <button

          type="button"

          className="intel-capture-finding-save"

          disabled={saving || previewFindings.length === 0}

          onClick={() => void handleSave()}

        >

          {saving ? INTELLIGENCE_CAPTURE_FLOW_UI.savingFindings : INTELLIGENCE_CAPTURE_FLOW_UI.saveFindings}

        </button>

      </div>



      {confirmation ? (

        <p className="intel-capture-finding-confirmation" role="status">

          {confirmation}

        </p>

      ) : null}

      {error ? (

        <p className="intel-capture-finding-error" role="alert">

          {error}

        </p>

      ) : null}

    </div>

  );

}


