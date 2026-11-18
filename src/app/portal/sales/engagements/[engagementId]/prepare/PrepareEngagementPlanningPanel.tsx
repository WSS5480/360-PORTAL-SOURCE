"use client";



import React from "react";

import { buildEngagementPlanningPatch } from "@/components/sales/EngagementPlanningSection";

import { PreparePlaybookAssistant } from "./PreparePlaybookAssistant";

import type { PrepareForMeetingView as PrepareView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";

import {

  buildEngagementWorkflowDraftFromRow,

  mergeTemplateIntoOfficeVisitDraft,

  mergeTemplateIntoWorkflowDraft,

  officeVisitTemplateDraftFromWorkflow,

  strategicPreCallKeysFromDraft,

  type EngagementWorkflowDraft,

} from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

import {

  isOfficeVisitEngagement,

  resolveEngagementWorkflowMode,

  supportsPlaybookTemplates,

  workflowFieldConfigsForMode,

  type EngagementWorkflowModeOverride,

} from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";

import { formatPortalApiError } from "@/lib/utils/formatPortalApiError";

import {

  isPreCallPlanProductLine,

  type PreCallPlanProductLine,

} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";

import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";

import {
  countPreCallPlanSectionsDrafted,
  isPreCallPlanDraftEmpty,
} from "@/lib/surgical-sales/engagements/preCallPlanSectionCompletion";
import { autoMarkEngagementPreparedClient } from "@/lib/surgical-sales/engagements/preparePreCallPlanSaveClient";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { PreparePreCallPlanForm } from "./PreparePreCallPlanForm";
import { userFacingError } from "@/lib/errors/userFacingError";



const PLANNING_PATCH_DEBOUNCE_MS = 650;



export type PrepareEngagementPlanningPanelHandle = {

  savePlanNow: () => Promise<boolean>;

  isPlanEmpty: () => boolean;

  hasMeaningfulPlan: () => boolean;

};



function buildTemplateSuggestContext(

  data: PrepareView,

  engagement: Record<string, unknown>,

): TemplateSuggestContext {

  const rawProductLine = String(engagement.product_line ?? "").trim();

  const productLine: PreCallPlanProductLine | "" = isPreCallPlanProductLine(rawProductLine)

    ? rawProductLine

    : "";

  return {

    productLine,

    opportunityProductLine: data.capture_scope.productFocus,

    providerSpecialty: data.provider_snapshot.specialty,

    crmEngagementType: data.upcoming_engagement.engagement_type,

    organizationName: data.provider_snapshot.organization_name,

  };

}



export const PrepareEngagementPlanningPanel = React.forwardRef<

  PrepareEngagementPlanningPanelHandle,

  {

    data: PrepareView;

    engagement: Record<string, unknown>;

    disabled?: boolean;

    onEngagementUpdated: (row: Record<string, unknown>) => void;

    onError: (message: string | null) => void;

    onSavingChange?: (saving: boolean) => void;

    onAutoPrepared?: () => void | Promise<void>;

  }

>(function PrepareEngagementPlanningPanel(

  { data, engagement, disabled, onEngagementUpdated, onError, onSavingChange, onAutoPrepared },

  ref,

) {

  const engagementId = data.engagement_id;

  const engagementType = String(engagement.engagement_type ?? "");

  const workflowModeOverride = (engagement.engagement_workflow_mode as EngagementWorkflowModeOverride | null) ?? null;

  const workflowMode = resolveEngagementWorkflowMode(engagementType, workflowModeOverride);

  const isOfficeVisit360 = isOfficeVisitEngagement(engagementType);

  const showPlaybooks = supportsPlaybookTemplates(workflowMode, engagementType);

  const isIntroCall = isIntroCallPathwayMission(engagementType);

  const planFieldConfigs = React.useMemo(
    () => workflowFieldConfigsForMode(workflowMode, engagementType),
    [workflowMode, engagementType],
  );



  const [appliedTemplateId, setAppliedTemplateId] = React.useState<string | null>(null);

  const [selectedPlaybook, setSelectedPlaybook] = React.useState<PreCallPlanTemplate | null>(null);

  const [saving, setSaving] = React.useState(false);

  const [draft, setDraft] = React.useState<EngagementWorkflowDraft>(() =>

    buildEngagementWorkflowDraftFromRow(engagement, engagementType, workflowModeOverride),

  );

  const draftRef = React.useRef<EngagementWorkflowDraft>(draft);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const engagementRef = React.useRef(engagement);

  engagementRef.current = engagement;

  draftRef.current = draft;



  const suggestContext = React.useMemo(

    () => buildTemplateSuggestContext(data, engagement),

    [data, engagement],

  );

  const defaultProductLine = suggestContext.productLine ?? "";

  const templateDraft = React.useMemo(
    () =>
      isOfficeVisit360 ? officeVisitTemplateDraftFromWorkflow(draft) : strategicPreCallKeysFromDraft(draft),
    [draft, isOfficeVisit360],
  );



  React.useEffect(() => {

    const next = buildEngagementWorkflowDraftFromRow(engagement, engagementType, workflowModeOverride);

    setDraft(next);

    draftRef.current = next;

  }, [engagement.updated_at, engagement.id, engagementType, workflowModeOverride]);



  const flushPatch = React.useCallback(

    async (nextDraft: EngagementWorkflowDraft): Promise<boolean> => {

      setSaving(true);

      onSavingChange?.(true);

      onError(null);

      try {

        const patch = buildEngagementPlanningPatch(engagementRef.current, nextDraft);

        const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {

          method: "PATCH",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify(patch),

        });

        const j = (await res.json()) as { ok?: boolean; error?: unknown; engagement?: Record<string, unknown> };

        if (!res.ok || !j.ok || !j.engagement) {

          throw new Error(formatPortalApiError(j.error, "Could not save plan"));

        }

        onEngagementUpdated(j.engagement);

        engagementRef.current = j.engagement;

        if (
          countPreCallPlanSectionsDrafted(nextDraft, planFieldConfigs) > 0 &&
          !String(j.engagement.prepared_at ?? "").trim()
        ) {

          const marked = await autoMarkEngagementPreparedClient(engagementId);

          if (marked.ok) await onAutoPrepared?.();

        }

        return true;

      } catch (e: unknown) {

        onError(userFacingError(e, "Could not save plan"));

        return false;

      } finally {

        setSaving(false);

        onSavingChange?.(false);

      }

    },

    [engagementId, onAutoPrepared, onEngagementUpdated, onError, onSavingChange, planFieldConfigs],

  );



  const schedulePatch = React.useCallback(

    (nextDraft: EngagementWorkflowDraft) => {

      setDraft(nextDraft);

      draftRef.current = nextDraft;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {

        debounceRef.current = null;

        void flushPatch(draftRef.current);

      }, PLANNING_PATCH_DEBOUNCE_MS);

    },

    [flushPatch],

  );



  React.useImperativeHandle(

    ref,

    () => ({

      savePlanNow: async () => {

        if (debounceRef.current) {

          clearTimeout(debounceRef.current);

          debounceRef.current = null;

        }

        return flushPatch(draftRef.current);

      },

      isPlanEmpty: () => isPreCallPlanDraftEmpty(draftRef.current, planFieldConfigs),

      hasMeaningfulPlan: () => countPreCallPlanSectionsDrafted(draftRef.current, planFieldConfigs) > 0,

    }),

    [flushPatch, planFieldConfigs],

  );



  React.useEffect(() => {

    return () => {

      if (debounceRef.current) clearTimeout(debounceRef.current);

    };

  }, []);



  return (

    <div className="pfm-precall-workspace">

      <div className="pfm-precall-planning-surface">

      {showPlaybooks ? (

        <PreparePlaybookAssistant

          draft={templateDraft}

          disabled={disabled}

          defaultProductLine={defaultProductLine}

          suggestContext={suggestContext}

          introCallMode={isIntroCall}

          officeVisit360Mode={isOfficeVisit360}

          officeVisit360WorkflowDraft={isOfficeVisit360 ? draft : undefined}

          onSelectedTemplateChange={setSelectedPlaybook}

          onApply={(next, meta) => {

            const merged =
              isOfficeVisit360 && meta?.officeVisit360WorkflowDraft
                ? meta.officeVisit360WorkflowDraft
                : isOfficeVisit360
                  ? mergeTemplateIntoOfficeVisitDraft(draftRef.current, next)
                  : mergeTemplateIntoWorkflowDraft(draftRef.current, next);

            schedulePatch(merged);

            if (meta?.appliedTemplateId) setAppliedTemplateId(meta.appliedTemplateId);

          }}

        />

      ) : null}



      <PreparePreCallPlanForm

        engagement={engagement}

        engagementId={engagementId}

        draft={draft}

        selectedPlaybook={selectedPlaybook}

        disabled={disabled}

        saving={saving}

        isIntroCall={isIntroCall}

        isOfficeVisit360={isOfficeVisit360}

        onFieldChange={(key, value) => schedulePatch({ ...draftRef.current, [key]: value })}

        onAssistError={onError}

      />

      </div>

    </div>

  );

});


