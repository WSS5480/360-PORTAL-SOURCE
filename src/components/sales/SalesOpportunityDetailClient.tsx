"use client";

import Link from "next/link";
import React from "react";
import { SalesCmdLink, SalesCommandPage, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { ACTIVITY_TYPE_LABEL, ACTIVITY_TYPES, LOST_REASONS, type ActivityType } from "@/lib/sales/activityTypes";
import { formatUsdFromCents } from "@/lib/sales/formatUsd";
import { PRACTICE_SETTING_LABEL, parsePracticeSetting } from "@/lib/sales/practiceSetting";
import { OPPORTUNITY_UI, formatOpportunityDetailSubtitle } from "@/lib/sales/opportunityUiLabels";
import {
  isClosedStage,
  isLostStage,
  isWonStage,
  parseSalesStageOrDefault,
  pipelineStageAfter,
  pipelineStageIndex,
  SALES_PIPELINE_FLOW,
  SALES_STAGE_LABEL,
  SALES_STAGE_PROBABILITY,
  SALES_STAGE_STYLE,
  salesStageLabel,
  salesStageStyle,
  type SalesStage,
} from "@/lib/sales/stages";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { captureIntelligenceTitleForContext } from "@/lib/surgical-sales/captureIntelligence";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { UnifiedActivityFeed } from "@/components/sales/UnifiedActivityFeed";
import { useUnifiedActivityFeed } from "@/hooks/useUnifiedActivityFeed";
import {
  legacyOpportunityActivityToFeedItem,
  type UnifiedActivityFeedFilterId,
  type UnifiedActivityFeedItem,
} from "@/lib/activity/activityFeedPresentation";
import {
  LinkedCasesPanel,
  LinkedEngagementsPanel,
} from "@/components/sales/crmEntityRelationshipPanels";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type {
  LinkedCaseSummary,
  LinkedEngagementSummary,
} from "@/lib/surgical-sales/opportunityRelationships";

type Opp = Record<string, unknown> & { id: string; account_name: string; physician_name?: string | null; stage: SalesStage; value_cents?: number; product_display?: string; product_line?: string; practice_setting?: string | null; city?: string | null; state?: string | null; close_date?: string | null; notes?: string | null; closed_lost_reason?: string | null; surgeon_champion_confirmed?: boolean | null; surgeon_champion_name?: string | null; account_id?: string | null; updated_at?: string | null; owner_name?: string | null; owner_email?: string | null };
type Task = { id: string; title: string; due_date: string; completed_at: string | null; notes?: string | null };
type Activity = { id: string; activity_type: ActivityType; summary: string; activity_at: string };
type RelatedCase = Record<string, unknown> & { id: string; case_number?: string; status?: string; case_date?: string; missing_po?: boolean; missing_invoice?: boolean };
type Stakeholder = Record<string, unknown> & { id: string; role_type?: string | null; first_name?: string | null; last_name?: string | null; title?: string | null; email?: string | null; phone?: string | null; relationship_strength?: string | null; influence_level?: string | null; updated_at?: string | null };
type NextBestAction = { id: string; title: string; reason: string; cta: string; kind: "log_activity" | "add_task" | "move_stage" | "schedule_case" | "update_value"; secondary: Array<{ id: string; label: string; kind: "log_activity" | "add_task" | "move_stage" | "schedule_case" | "update_value" }> };
type StagePromptActionId =
  | "add_surgeon_stakeholder"
  | "identify_surgeon_champion"
  | "schedule_intro_meeting"
  | "confirm_target_procedure_volume"
  | "add_clinical_access_notes"
  | "log_case_observation"
  | "confirm_observation_attendance"
  | "capture_surgeon_feedback"
  | "log_clinical_objections"
  | "add_observation_note"
  | "document_clinical_need"
  | "confirm_product_fit"
  | "identify_required_products"
  | "add_evaluation_criteria"
  | "identify_pain_point_decision_maker"
  | "create_evaluation_case"
  | "schedule_trial_procedure"
  | "coordinate_rep_coverage"
  | "confirm_product_availability"
  | "link_surgical_case"
  | "prepare_evaluation_support_plan"
  | "present_outcome_data"
  | "share_surgeon_feedback"
  | "deliver_value_story"
  | "review_adoption_pathway"
  | "confirm_pref_card_process"
  | "add_value_summary"
  | "upload_supporting_data"
  | "log_surgeon_feedback"
  | "confirm_pref_card_update"
  | "upload_pref_card_approval"
  | "identify_rollout_departments"
  | "schedule_follow_up_support"
  | "add_adoption_note"
  | "add_lost_reason"
  | "identify_competitor"
  | "schedule_future_revisit"
  | "archive_opportunity"
  | "log_objection";

const STAGE_FLOW = SALES_PIPELINE_FLOW;
const STAGE_PROB = SALES_STAGE_PROBABILITY;
const STAGE_HELPER_COPY: Record<SalesStage, string> = {
  discovery: "Identify the surgeon, facility, product fit, and initial access path.",
  clinical_validation: "Validate clinical need, observe cases, and confirm product fit with stakeholders.",
  evaluation_planned: "Plan evaluation or trial cases, coverage, and product availability.",
  evaluation_active: "Run active evaluation or trial surgical cases and document outcomes.",
  outcome_review: "Summarize observations, case feedback, outcomes, and value story.",
  preference_card_progress: "Product accepted. Confirm preference card update and operational adoption steps.",
  adoption_expanding: "Expand adoption across departments and sustain rollout support.",
  won: "Deal won — maintain support and capture expansion signals.",
  lost: "Evaluation did not move forward.",
};
function scheduleCaseHref(opportunityId: string, accountId?: string | null) {
  const params = new URLSearchParams({ opportunity_id: opportunityId });
  const account = String(accountId || "").trim();
  if (account) params.set("account_id", account);
  return `/portal/sales/cases/new?${params.toString()}`;
}

const STAGE_HEALTH_SUGGESTION: Record<SalesStage, string> = {
  discovery: "Add key surgeon or stakeholder",
  clinical_validation: "Log case observation or document clinical need",
  evaluation_planned: "Schedule evaluation case",
  evaluation_active: "Link evaluation case or confirm coverage",
  outcome_review: "Add value summary or upload supporting data",
  preference_card_progress: "Confirm pref card update",
  adoption_expanding: "Identify rollout departments",
  won: "Schedule follow-up support",
  lost: "Log lost reason",
};
const STAGE_PROMPT_ACTIONS: Record<SalesStage, Array<{ id: StagePromptActionId; label: string }>> = {
  discovery: [
    { id: "identify_surgeon_champion", label: "Identify surgeon champion" },
    { id: "add_surgeon_stakeholder", label: "Add surgeon/stakeholder" },
    { id: "schedule_intro_meeting", label: "Schedule intro meeting" },
    { id: "confirm_target_procedure_volume", label: "Confirm target procedure volume" },
    { id: "add_clinical_access_notes", label: "Add clinical access notes" },
  ],
  clinical_validation: [
    { id: "log_case_observation", label: "Schedule observation case" },
    { id: "document_clinical_need", label: "Document clinical need" },
    { id: "confirm_product_fit", label: "Confirm product fit" },
    { id: "capture_surgeon_feedback", label: "Capture surgeon feedback" },
  ],
  evaluation_planned: [
    { id: "prepare_evaluation_support_plan", label: "Prepare evaluation support plan" },
    { id: "confirm_product_availability", label: "Confirm product availability" },
    { id: "schedule_trial_procedure", label: "Schedule trial/evaluation procedure" },
  ],
  evaluation_active: [
    { id: "create_evaluation_case", label: "Create evaluation case" },
    { id: "link_surgical_case", label: "Link surgical case" },
    { id: "coordinate_rep_coverage", label: "Coordinate rep coverage" },
    { id: "confirm_observation_attendance", label: "Confirm observation attendance" },
  ],
  outcome_review: [
    { id: "present_outcome_data", label: "Present outcome data" },
    { id: "share_surgeon_feedback", label: "Share surgeon feedback" },
    { id: "deliver_value_story", label: "Deliver ROI/value story" },
    { id: "review_adoption_pathway", label: "Review adoption pathway" },
  ],
  preference_card_progress: [
    { id: "confirm_pref_card_update", label: "Confirm pref card update" },
    { id: "upload_pref_card_approval", label: "Upload pref card approval" },
    { id: "confirm_pref_card_process", label: "Confirm preference card process" },
  ],
  adoption_expanding: [
    { id: "identify_rollout_departments", label: "Identify rollout departments" },
    { id: "schedule_follow_up_support", label: "Schedule follow-up support" },
    { id: "add_adoption_note", label: "Add adoption note" },
  ],
  won: [
    { id: "schedule_follow_up_support", label: "Schedule follow-up support" },
    { id: "add_adoption_note", label: "Add adoption note" },
  ],
  lost: [
    { id: "add_lost_reason", label: "Add lost reason" },
    { id: "identify_competitor", label: "Identify competitor" },
    { id: "schedule_future_revisit", label: "Schedule future revisit" },
    { id: "archive_opportunity", label: "Archive opportunity" },
    { id: "log_objection", label: "Log objection" },
  ],
};
const STAGE_PROMPT_TASK_TITLE: Partial<Record<StagePromptActionId, string>> = {
  schedule_intro_meeting: "Schedule intro meeting",
  confirm_target_procedure_volume: "Confirm target procedure volume",
  identify_pain_point_decision_maker: "Identify pain point and decision maker",
  identify_required_products: "Identify required products",
  confirm_pref_card_update: "Confirm preference card update",
  identify_rollout_departments: "Identify rollout departments",
  schedule_follow_up_support: "Schedule follow-up support",
  schedule_future_revisit: "Schedule future revisit",
};
function daysBetween(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

function dueChip(dueYmd: string): { label: string; tone: "ok" | "warn" | "danger" } {
  const d = daysBetween(`${dueYmd}T12:00:00Z`);
  if (d == null) return { label: "Due", tone: "ok" };
  if (d > 0) return { label: `${d}d overdue`, tone: "danger" };
  if (d === 0) return { label: "Due today", tone: "warn" };
  return { label: "Upcoming", tone: "ok" };
}

export default function SalesOpportunityDetailClient({ opportunityId }: { opportunityId: string }) {
  const captureIntelligence = useCaptureIntelligence();
  const [opp, setOpp] = React.useState<Opp | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [relatedCases, setRelatedCases] = React.useState<RelatedCase[]>([]);
  const [linkedEngagements, setLinkedEngagements] = React.useState<LinkedEngagementSummary[]>([]);
  const [linkedCases, setLinkedCases] = React.useState<LinkedCaseSummary[]>([]);
  const [engagementLinkOptions, setEngagementLinkOptions] = React.useState<{ id: string; label: string }[]>([]);
  const [caseLinkOptions, setCaseLinkOptions] = React.useState<{ id: string; label: string }[]>([]);
  const [relationshipBusy, setRelationshipBusy] = React.useState(false);
  const [stakeholders, setStakeholders] = React.useState<Stakeholder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [actType, setActType] = React.useState<ActivityType>("note");
  const [actSummary, setActSummary] = React.useState("");
  const [actSaving, setActSaving] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDue, setTaskDue] = React.useState("");
  const [taskSaving, setTaskSaving] = React.useState(false);
  const [inlineSaving, setInlineSaving] = React.useState<string | null>(null);
  const [activityComposerOpen, setActivityComposerOpen] = React.useState(false);
  const [composerTab, setComposerTab] = React.useState<ActivityType>("note");
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [mentionId, setMentionId] = React.useState("");
  const actRef = React.useRef<HTMLTextAreaElement | null>(null);
  const taskTitleRef = React.useRef<HTMLInputElement | null>(null);
  const [activityFilter, setActivityFilter] = React.useState<UnifiedActivityFeedFilterId>("all");

  const buildLegacyOppFeed = React.useCallback((): UnifiedActivityFeedItem[] => {
    return activities
      .map((a) =>
        legacyOpportunityActivityToFeedItem({
          id: a.id,
          activity_type: a.activity_type,
          summary: a.summary,
          activity_at: a.activity_at,
        }),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities]);

  const oppActivityRefreshKey = activities.map((a) => `${a.id}:${a.activity_at}`).join("|");
  const {
    items: oppActivityItems,
    loading: oppActivityLoading,
    reload: reloadOppActivityFeed,
  } = useUnifiedActivityFeed({
    entityType: "opportunity",
    entityId: opportunityId,
    buildLegacyFallback: buildLegacyOppFeed,
    refreshKey: oppActivityRefreshKey,
  });

  async function reload(opts?: { soft?: boolean }) {
    const soft = !!opts?.soft;
    if (!soft) setLoading(true);
    setErr(null);
    try {
      const [oRes, tRes, aRes] = await Promise.all([
        fetch(`/api/portal/sales/opportunities/${encodeURIComponent(opportunityId)}`, { cache: "no-store" }),
        fetch(`/api/portal/sales/tasks?opportunity_id=${encodeURIComponent(opportunityId)}&status=open`, { cache: "no-store" }),
        fetch(`/api/portal/sales/opportunities/${encodeURIComponent(opportunityId)}/activities`, { cache: "no-store" }),
      ]);
      const [oJson, tJson, aJson] = await Promise.all([
        readResponseJson<{ ok?: boolean; opportunity?: Opp; error?: string }>(oRes),
        readResponseJson<{ ok?: boolean; tasks?: Task[] }>(tRes),
        readResponseJson<{ ok?: boolean; activities?: Activity[] }>(aRes),
      ]);
      if (!oJson.ok) {
        setErr(oJson.error || "Failed to load opportunity");
        setOpp(null);
        return;
      }
      const nextOpp = oJson.opportunity as Opp & {
        linked_engagements?: LinkedEngagementSummary[];
        linked_cases?: LinkedCaseSummary[];
      };
      setOpp(nextOpp);
      setLinkedEngagements(Array.isArray(nextOpp.linked_engagements) ? nextOpp.linked_engagements : []);
      setLinkedCases(Array.isArray(nextOpp.linked_cases) ? nextOpp.linked_cases : []);
      setTasks(tJson.ok ? (tJson.tasks || []) : []);
      setActivities(aJson.ok ? (aJson.activities || []) : []);
      if (nextOpp.account_id) {
        const accountId = String(nextOpp.account_id);
        const [cRes, sRes, eRes] = await Promise.all([
          fetch(`/api/portal/sales/surgical-cases?account_id=${encodeURIComponent(accountId)}&case_scope=active`, { cache: "no-store" }),
          fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}`, { cache: "no-store" }),
          fetch(`/api/portal/sales/engagements?organization_id=${encodeURIComponent(accountId)}`, { cache: "no-store" }),
        ]);
        const cJson = await readResponseJson<{ ok?: boolean; cases?: RelatedCase[] }>(cRes);
        const sJson = await readResponseJson<{ ok?: boolean; contacts?: Stakeholder[] }>(sRes);
        const eJson = await readResponseJson<{
          ok?: boolean;
          engagements?: Array<{ id: string; title?: string | null; engagement_type?: string }>;
        }>(eRes);
        const accountCases = cJson.ok ? (cJson.cases || []) : [];
        setRelatedCases(accountCases);
        setStakeholders(sJson.ok ? (sJson.contacts || []) : []);
        setCaseLinkOptions(
          accountCases.map((c) => ({
            id: String(c.id),
            label: `Case ${String(c.case_number || String(c.id).slice(0, 8))}`,
          })),
        );
        setEngagementLinkOptions(
          (eJson.ok ? eJson.engagements || [] : []).map((e) => ({
            id: String(e.id),
            label: String(e.title || "").trim() || formatEngagementType(String(e.engagement_type || "engagement")),
          })),
        );
      } else {
        setRelatedCases([]);
        setStakeholders([]);
        setCaseLinkOptions([]);
        setEngagementLinkOptions([]);
      }
    } catch (e) {
      setErr(userFacingError(e));
    } finally {
      if (!soft) setLoading(false);
    }
  }

  React.useEffect(() => { void reload(); }, [opportunityId]);

  async function patchRelationships(body: Record<string, unknown>) {
    setRelationshipBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(opportunityId)}/relationships`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readResponseJson<{
        ok?: boolean;
        linked_engagements?: LinkedEngagementSummary[];
        linked_cases?: LinkedCaseSummary[];
        error?: string;
      }>(res);
      if (!j.ok) throw new Error(j.error || "Link update failed");
      setLinkedEngagements(j.linked_engagements || []);
      setLinkedCases(j.linked_cases || []);
    } catch (e) {
      setErr(userFacingError(e));
    } finally {
      setRelationshipBusy(false);
    }
  }

  async function patchOpp(patch: Record<string, unknown>, key: string) {
    setInlineSaving(key);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(opportunityId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const j = await readResponseJson<{ ok?: boolean; opportunity?: Opp; error?: string }>(res);
      if (!j.ok) throw new Error(j.error || "Update failed");
      setOpp(j.opportunity as Opp);
    } catch (e) {
      setErr(userFacingError(e));
    } finally {
      setInlineSaving(null);
    }
  }

  function insertMentionFromSelection() {
    if (!mentionId) return;
    const hit = stakeholders.find((s) => String(s.id) === mentionId);
    if (!hit) return;
    const display = `${String(hit.first_name || "").trim()} ${String(hit.last_name || "").trim()}`.trim() || String(hit.email || "contact");
    const next = actSummary.trim() ? `${actSummary.trim()} @${display}` : `@${display} `;
    setActSummary(next);
    setMentionId("");
    actRef.current?.focus();
  }

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!actSummary.trim()) return;
    setActSaving(true);
    setErr(null);
    try {
      const attachmentSuffix =
        selectedFiles.length > 0 ? `\n\n[Attachments: ${selectedFiles.map((f) => f.name).join(", ")}]` : "";
      const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(opportunityId)}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_type: composerTab, summary: `${actSummary.trim()}${attachmentSuffix}` }),
      });
      const j = await readResponseJson<{ ok?: boolean; error?: string }>(res);
      if (!j.ok) throw new Error(j.error || "");
      setActType(composerTab);
      setActSummary("");
      setSelectedFiles([]);
      await reload({ soft: true });
      void reloadOppActivityFeed();
    } catch (e) {
      setErr(userFacingError(e));
    } finally {
      setActSaving(false);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDue) return;
    setTaskSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/portal/sales/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunity_id: opportunityId, title: taskTitle.trim(), due_date: taskDue }) });
      const j = await readResponseJson<{ ok?: boolean; error?: string }>(res);
      if (!j.ok) throw new Error(j.error || "");
      setTaskTitle("");
      setTaskDue("");
      await reload({ soft: true });
    } catch (e) {
      setErr(userFacingError(e));
    } finally {
      setTaskSaving(false);
    }
  }

  async function completeTask(id: string) {
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/tasks/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: true }) });
      const j = await readResponseJson<{ ok?: boolean; error?: string }>(res);
      if (!j.ok) throw new Error(j.error || "Update failed");
      await reload({ soft: true });
    } catch (e) {
      setErr(userFacingError(e));
    }
  }

  function selectComposerType(t: ActivityType) {
    setComposerTab(t);
    setActType(t);
    setActivityComposerOpen(true);
    setTimeout(() => actRef.current?.focus(), 0);
  }

  async function advancePipelineStage() {
    const stage = parseSalesStageOrDefault(String(opp?.stage || ""));
    const next = pipelineStageAfter(stage);
    if (!next) return;
    if (next === "preference_card_progress") {
      const ok = window.confirm("Confirm the product has been added to the surgeon/facility preference card.");
      if (!ok) return;
    }
    await patchOpp({ stage: next }, "stage");
  }

  function runAction(kind: "log_activity" | "add_task" | "move_stage" | "schedule_case" | "update_value") {
    if (kind === "log_activity") {
      selectComposerType("note");
      return;
    }
    if (kind === "add_task") {
      taskTitleRef.current?.focus();
      return;
    }
    if (kind === "move_stage") {
      void advancePipelineStage();
      return;
    }
    if (kind === "schedule_case") {
      window.location.assign(scheduleCaseHref(opportunityId, opp?.account_id));
      return;
    }
    if (kind === "update_value") {
      void patchOpp({ value_cents: Number(opp?.value_cents || 0) > 0 ? opp?.value_cents : 500000 }, "value");
    }
  }

  function openComposerWithTemplate(summary: string) {
    setActivityComposerOpen(true);
    setComposerTab("note");
    setActType("note");
    setActSummary(summary);
    setTimeout(() => actRef.current?.focus(), 0);
  }

  function runStagePrompt(id: StagePromptActionId) {
    if (id === "add_surgeon_stakeholder") {
      const accountPath = `/portal/sales/accounts${opp?.account_id ? `/${encodeURIComponent(String(opp.account_id))}` : ""}`;
      const p = new URLSearchParams();
      p.set("tab", "contacts");
      p.set("new_contact", "1");
      p.set("role", "surgeon");
      p.set("opportunity_id", opportunityId);
      window.location.assign(`${accountPath}?${p.toString()}`);
      return;
    }
    if (id === "add_clinical_access_notes" || id === "identify_surgeon_champion") {
      openComposerWithTemplate("Clinical access notes: ");
      return;
    }
    if (id === "log_case_observation" || id === "confirm_observation_attendance") {
      openComposerWithTemplate("Case observation: ");
      return;
    }
    if (id === "add_observation_note" || id === "capture_surgeon_feedback" || id === "share_surgeon_feedback") {
      openComposerWithTemplate("Observation note: ");
      return;
    }
    if (id === "document_clinical_need" || id === "confirm_product_fit" || id === "add_evaluation_criteria") {
      openComposerWithTemplate("Clinical need: ");
      return;
    }
    const taskTitleForPrompt = STAGE_PROMPT_TASK_TITLE[id];
    if (taskTitleForPrompt) {
      setTaskTitle(taskTitleForPrompt);
      taskTitleRef.current?.focus();
      return;
    }
    if (
      id === "create_evaluation_case" ||
      id === "schedule_trial_procedure" ||
      id === "coordinate_rep_coverage" ||
      id === "link_surgical_case" ||
      id === "prepare_evaluation_support_plan"
    ) {
      runAction("schedule_case");
      return;
    }
    if (id === "add_value_summary" || id === "deliver_value_story" || id === "present_outcome_data") {
      openComposerWithTemplate("Value summary: ");
      return;
    }
    if (id === "upload_supporting_data" || id === "confirm_product_availability" || id === "upload_pref_card_approval") {
      window.location.assign("/portal/sales/cases?status=docs_needed");
      return;
    }
    if (id === "log_surgeon_feedback" || id === "review_adoption_pathway" || id === "confirm_pref_card_process") {
      openComposerWithTemplate("Surgeon feedback: ");
      return;
    }
    if (id === "add_adoption_note") {
      openComposerWithTemplate("Adoption note: ");
      return;
    }
    if (id === "add_lost_reason" || id === "archive_opportunity") {
      const reason = window.prompt("Lost reason (optional):", String(opp?.closed_lost_reason || ""));
      if (reason === null) return;
      void patchOpp({ stage: "lost", closed_lost_reason: reason.trim() || null }, "lost_reason");
      return;
    }
    if (id === "identify_competitor") {
      openComposerWithTemplate("Competitor identified: ");
      return;
    }
    if (id === "log_clinical_objections" || id === "log_objection") {
      openComposerWithTemplate("Objection logged: ");
      return;
    }
    openComposerWithTemplate("Next action: ");
  }

  const currentStage = parseSalesStageOrDefault(String(opp?.stage || ""));
  const nextPipelineStage = pipelineStageAfter(currentStage);
  const stagePromptActions = STAGE_PROMPT_ACTIONS[currentStage] ?? STAGE_PROMPT_ACTIONS.discovery;
  const st = salesStageStyle(opp?.stage) || SALES_STAGE_STYLE.discovery;
  const setting = parsePracticeSetting(opp?.practice_setting);
  const productLabel = opp?.product_display || opp?.product_line || OPPORTUNITY_UI.fallbackRecordLabel;
  const estValue = opp?.value_cents ? formatUsdFromCents(Number(opp.value_cents)) : "—";
  const stageProbOverride =
    typeof opp?.probability_pct === "number" && Number.isFinite(opp.probability_pct)
      ? Math.max(0, Math.min(100, Math.round(opp.probability_pct)))
      : null;
  const stageProb = stageProbOverride ?? STAGE_PROB[currentStage] ?? 40;
  const stageDays = daysBetween(String(opp?.updated_at || "")) ?? 0;
  const lastActivityDays = activities[0] ? daysBetween(activities[0].activity_at) : null;
  const openTasks = tasks.length;
  const overdueTasks = tasks.filter((t) => dueChip(t.due_date).tone === "danger").length;
  const hasLostReason = isLostStage(currentStage) && !!opp?.closed_lost_reason;
  const staleDeal = !isClosedStage(currentStage) && (lastActivityDays ?? 99) >= 7;
  const missingStakeholder = !String(opp?.physician_name || "").trim();
  const championConfirmed = Boolean(opp?.surgeon_champion_confirmed);
  const championName = String(opp?.surgeon_champion_name || "").trim();
  const [pendingChampionName, setPendingChampionName] = React.useState("");
  const championOptionNames = React.useMemo(() => {
    const isSurgeonContact = (s: Stakeholder) => {
      const role = String((s as Record<string, unknown>).org_relationship_role_type || s.role_type || "")
        .trim()
        .toLowerCase();
      return role === "surgeon" || role === "physician_assistant";
    };
    const names = new Set<string>();
    const addName = (value: string) => {
      const cleaned = value.trim();
      if (!cleaned) return;
      if ([...names].some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) return;
      names.add(cleaned);
    };

    for (const s of stakeholders) {
      if (!isSurgeonContact(s)) continue;
      const label = contactDisplayName(s as Parameters<typeof contactDisplayName>[0]);
      if (label !== "—") addName(label);
    }

    const primaryClinician = String(opp?.physician_name || "").trim();
    if (primaryClinician) addName(primaryClinician);
    if (championName) addName(championName);

    return [...names];
  }, [opp?.physician_name, championName, stakeholders]);

  const suggestedChampionName = React.useMemo(() => {
    for (const s of stakeholders) {
      const raw = s as Record<string, unknown>;
      const roleText = `${String(s.role_type || "").toLowerCase()} ${String(raw.org_relationship_role_type || "").toLowerCase()}`;
      const isSurgeonish =
        roleText.includes("surgeon") || roleText.includes("physician") || roleText.includes("pa") || roleText.includes("assistant");
      if (!isSurgeonish) continue;
      const influenceText = `${String(s.influence_level || "").toLowerCase()} ${String(raw.org_relationship_influence_level || "").toLowerCase()}`;
      if (!influenceText.includes("decision_maker")) continue;
      const full = `${String(s.first_name || "").trim()} ${String(s.last_name || "").trim()}`.trim();
      const explicit =
        String(raw.display_name || "").trim() ||
        String(raw.full_name || "").trim() ||
        String(raw.name || "").trim() ||
        String(raw.contact_name || "").trim();
      const candidate = full || explicit || String(s.email || "").trim();
      if (candidate) return candidate;
    }
    return null;
  }, [stakeholders]);

  React.useEffect(() => {
    if (championConfirmed) {
      setPendingChampionName(championName);
      return;
    }
    const seed = championName || suggestedChampionName || String(opp?.physician_name || "").trim() || "";
    setPendingChampionName(seed);
  }, [opportunityId, championConfirmed, championName, suggestedChampionName, opp?.physician_name]);

  const ownerLabel = String(opp?.owner_name || "").trim() || String(opp?.owner_email || "").trim() || "Unassigned";
  const stageRailIndex = Math.max(0, pipelineStageIndex(opp?.stage));
  const stageRailPct = STAGE_FLOW.length <= 1 ? 0 : (stageRailIndex / (STAGE_FLOW.length - 1)) * 100;
  const confidenceLabel = stageProb >= 80 ? "High confidence" : stageProb >= 55 ? "Moderate confidence" : "Low confidence";
  const stakeholderCards = stakeholders
    .filter((s) => String(s.role_type || "").trim() !== "")
    .sort((a, b) => {
      const ia = String(a.influence_level || "unknown");
      const ib = String(b.influence_level || "unknown");
      if (ia === ib) return 0;
      const rank = (v: string) => (v === "decision_maker" ? 0 : v === "influencer" ? 1 : v === "gatekeeper" ? 2 : 3);
      return rank(ia) - rank(ib);
    })
    .slice(0, 8);
  const hasCaseDate = relatedCases.some((c) => Boolean(String(c.case_date || "").trim()));
  const momentumLabel =
    hasLostReason
      ? "Lost"
      : currentStage === "preference_card_progress" || currentStage === "adoption_expanding" || isWonStage(currentStage)
        ? "Adoption rollout"
        : staleDeal
          ? `No activity in ${lastActivityDays ?? "?"} days`
          : `Moving through ${salesStageLabel(currentStage).toLowerCase()}`;
  const stageSuggestedAction =
    currentStage === "discovery"
      ? missingStakeholder
        ? "Add key surgeon or stakeholder"
        : championConfirmed
          ? "Log discovery notes"
          : "Confirm surgeon champion"
      : STAGE_HEALTH_SUGGESTION[currentStage];

  type DealHealthSeverity = "healthy" | "warning" | "stalled" | "urgent";
  const dealHealthBlockers = React.useMemo(() => {
    const rows: Array<{ id: string; label: string; detail: string; severity: DealHealthSeverity; action: string }> = [];
    const stageGuidanceDetail =
      currentStage === "discovery"
        ? missingStakeholder
          ? "Add key surgeon or stakeholder"
          : "Surgeon/stakeholder linked. Discovery contact requirement is complete."
        : STAGE_HEALTH_SUGGESTION[currentStage];
    const stageGuidanceSeverity: DealHealthSeverity =
      isLostStage(currentStage)
        ? "stalled"
        : currentStage === "preference_card_progress" || currentStage === "adoption_expanding" || isWonStage(currentStage)
          ? "healthy"
          : currentStage === "discovery" && !missingStakeholder
            ? "healthy"
            : "warning";
    rows.push({
      id: "stage-guidance",
      label: "Stage guidance",
      detail: stageGuidanceDetail,
      severity: stageGuidanceSeverity,
      action:
        currentStage === "evaluation_planned" || currentStage === "evaluation_active"
          ? "Schedule case"
          : "Log activity",
    });
    if (missingStakeholder) {
      rows.push({ id: "no-surgeon", label: "No surgeon assigned", detail: "Primary clinician is not linked to this opportunity.", severity: "urgent", action: "Add clinician" });
    }
    if (
      (currentStage === "evaluation_planned" || currentStage === "evaluation_active") &&
      !hasCaseDate
    ) {
      rows.push({
        id: "no-linked-case",
        label: "No linked surgical case",
        detail: "Evaluation stages should have at least one linked evaluation case.",
        severity: "urgent",
        action: "Schedule case",
      });
    }
    if (stageDays >= 21 && !isClosedStage(currentStage)) {
      rows.push({
        id: "stage-stall",
        label: "Stage stalled",
        detail: `${stageDays} days in ${salesStageLabel(currentStage)}.`,
        severity: "stalled",
        action: "Move stage",
      });
    }
    const rank = (s: DealHealthSeverity) => (s === "urgent" ? 0 : s === "stalled" ? 1 : s === "warning" ? 2 : 3);
    rows.sort((a, b) => rank(a.severity) - rank(b.severity));
    return rows.slice(0, 5);
  }, [missingStakeholder, stageDays, currentStage, hasCaseDate]);
  const hasOfficeManager = stakeholderCards.some((s) => String(s.role_type || "") === "office_manager");

  const nextBestAction = React.useMemo<NextBestAction>(() => {
    if (isLostStage(currentStage)) {
      return {
        id: "closed-lost-followup",
        title: "Log lost reason",
        reason: "Capture why this evaluation was lost so future pursuits can be improved.",
        cta: "Log lost reason",
        kind: "log_activity",
        secondary: [{ id: "create-recovery-task", label: "Create follow-up task", kind: "add_task" }],
      };
    }
    if (currentStage === "preference_card_progress" || currentStage === "adoption_expanding" || isWonStage(currentStage)) {
      return {
        id: "confirm-pref-card",
        title: "Confirm preference card update",
        reason: "Product is accepted. Ensure preference card and operational adoption steps are completed.",
        cta: "Log adoption update",
        kind: "log_activity",
        secondary: [
          { id: "create-adoption-task", label: "Add pref card confirmation task", kind: "add_task" },
          { id: "schedule-rollout-case", label: "Schedule adoption case", kind: "schedule_case" },
        ],
      };
    }
    // If champion is explicitly confirmed in Discovery, treat stakeholder requirement as satisfied.
    if (missingStakeholder && !(currentStage === "discovery" && championConfirmed)) {
      return {
        id: "assign-clinician",
        title: "Assign primary clinician",
        reason: "No surgeon is linked to this opportunity, blocking conversion and case planning.",
        cta: "Add clinician",
        kind: "add_task",
        secondary: [
          { id: "followup-stakeholder", label: "Follow up with office manager", kind: "add_task" },
          { id: "log-discovery", label: "Log discovery note", kind: "log_activity" },
        ],
      };
    }
    if (currentStage === "discovery") {
      if (championConfirmed) {
        return {
          id: "discovery-on-track",
          title: "Discovery in progress",
          reason: championName ? `Champion confirmed: ${championName}.` : "Surgeon champion is confirmed for this lead.",
          cta: "Log discovery notes",
          kind: "log_activity",
          secondary: [
            { id: "discovery-intro", label: "Schedule intro meeting", kind: "add_task" },
            { id: "discovery-volume", label: "Confirm procedure volume", kind: "add_task" },
          ],
        };
      }
      return {
        id: "discovery-next",
        title: "Identify surgeon champion",
        reason: "Discovery should lock in champion, stakeholders, and target procedure volume.",
        cta: "Add discovery notes",
        kind: "log_activity",
        secondary: [
          { id: "discovery-intro", label: "Schedule intro meeting", kind: "add_task" },
          { id: "discovery-volume", label: "Confirm procedure volume", kind: "add_task" },
        ],
      };
    }
    if (currentStage === "clinical_validation") {
      return {
        id: "clinical-validation-next",
        title: "Document clinical validation",
        reason: "Validate clinical need with case observations, product fit, and stakeholder feedback.",
        cta: "Schedule case",
        kind: "schedule_case",
        secondary: [
          { id: "observation-feedback", label: "Capture surgeon feedback", kind: "log_activity" },
          { id: "clinical-criteria", label: "Add evaluation criteria", kind: "add_task" },
        ],
      };
    }
    if (!hasCaseDate && (currentStage === "evaluation_planned" || currentStage === "evaluation_active")) {
      return {
        id: "evaluation-case-next",
        title: "Schedule evaluation case",
        reason: "Evaluation stages require a linked trial/evaluation surgical case.",
        cta: "Link case",
        kind: "schedule_case",
        secondary: [
          { id: "coverage-plan", label: "Coordinate rep coverage", kind: "add_task" },
          { id: "availability-plan", label: "Confirm product availability", kind: "add_task" },
        ],
      };
    }
    if (currentStage === "outcome_review") {
      return {
        id: "story-next",
        title: "Present data and value story",
        reason: "Outcome review should package observations, surgeon feedback, and adoption pathway.",
        cta: "Log value story",
        kind: "log_activity",
        secondary: [
          { id: "story-adoption", label: "Review adoption pathway", kind: "add_task" },
          { id: "story-pref", label: "Confirm pref card process", kind: "add_task" },
        ],
      };
    }
    if ((lastActivityDays ?? 999) >= 7) {
      return {
        id: "re-engage",
        title: "Re-engage opportunity",
        reason: `No activity has been logged in ${lastActivityDays ?? "7+"} days.`,
        cta: "Log follow-up",
        kind: "log_activity",
        secondary: [
          { id: "schedule-eval", label: "Schedule product evaluation", kind: "add_task" },
          { id: "move-if-ready", label: "Move stage if ready", kind: "move_stage" },
        ],
      };
    }
    if (openTasks === 0) {
      return {
        id: "set-next-step",
        title: "Create next-step follow-up",
        reason: "No active follow-up task is assigned to this deal.",
        cta: "Add follow-up",
        kind: "add_task",
        secondary: [
          { id: "request-feedback", label: "Request surgeon feedback", kind: "add_task" },
          { id: "log-plan", label: "Log next-step note", kind: "log_activity" },
        ],
      };
    }
    if (!hasOfficeManager) {
      return {
        id: "add-office-manager",
        title: "Follow up with office manager",
        reason: "Stakeholder map is missing office workflow coverage.",
        cta: "Add stakeholder follow-up",
        kind: "add_task",
        secondary: [
          { id: "log-stakeholder-gap", label: "Log stakeholder gap", kind: "log_activity" },
          { id: "move-stage", label: "Move stage when covered", kind: "move_stage" },
        ],
      };
    }
    return {
      id: "maintain-momentum",
      title: "Maintain momentum",
      reason: "Deal is healthy. Keep activity cadence and confirm next procedural milestone.",
      cta: "Log touchpoint",
      kind: "log_activity",
      secondary: [
        { id: "prep-eval", label: "Schedule product evaluation", kind: "add_task" },
        { id: "request-case-date-healthy", label: "Request surgical date", kind: "add_task" },
      ],
    };
  }, [missingStakeholder, championConfirmed, championName, hasCaseDate, currentStage, lastActivityDays, openTasks, hasOfficeManager, stakeholderCards]);

  const suggestedActions = [
    "Schedule follow-up",
    "Capture surgeon feedback",
    "Confirm product evaluation",
    "Request case date",
  ];

  if (loading && !opp) {
    return <SalesCommandPage title={OPPORTUNITY_UI.detailSubtitle} subtitle="Loading…" actions={<SalesCmdLink href="/portal/sales/opportunities" variant="secondary">← {OPPORTUNITY_UI.navListTitle}</SalesCmdLink>}><div style={{ color: "var(--muted)", padding: 18, fontSize: 14 }}>Loading command center…</div></SalesCommandPage>;
  }
  if (!opp) {
    return <SalesCommandPage title={OPPORTUNITY_UI.detailSubtitle} actions={<SalesCmdLink href="/portal/sales/opportunities" variant="secondary">← {OPPORTUNITY_UI.navListTitle}</SalesCmdLink>}>{err ? <div role="alert" style={sc.alertError}>{err}</div> : <p style={sc.pageSubtitle}>We could not find that record.</p>}</SalesCommandPage>;
  }

  return (
    <SalesCommandPage title={opp.account_name} subtitle={formatOpportunityDetailSubtitle(`${String(opp.city || "").trim() || "Unassigned city"}${opp.state ? `, ${String(opp.state)}` : ""} · ${PRACTICE_SETTING_LABEL[setting]}`)} actions={<SalesCmdLink href="/portal/sales/opportunities" variant="secondary">← {OPPORTUNITY_UI.navListTitle}</SalesCmdLink>} density="dense">
      <style dangerouslySetInnerHTML={{ __html: `
.opp-mobile-chrome { display: none; }
@media (max-width: 900px) {
  .crm-sales-page-bg .surgical-cmd-header { display: none !important; }
  .crm-sales-page-bg .surgical-cmd-header + * { margin-top: 0; }
  .opp-mobile-chrome {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 8px 12px 6px;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
    background: #fff;
  }
  .opp-actions-sticky button,.opp-actions-sticky a { min-height:44px !important; padding:10px 12px !important; font-size:12px !important; }
  .opp-stage-cell { min-height:44px !important; }
  .opp-stage-label { font-size: 11px !important; }
}
.opp-workspace { display: grid; gap: 8px; }
.opp-hero { border: 1px solid color-mix(in srgb,var(--brand-600) 18%,var(--border)); border-radius: 12px; background: linear-gradient(145deg, color-mix(in srgb,var(--brand-600) 8%,var(--surface)) 0%, var(--surface) 64%, color-mix(in srgb,var(--crm-cyan-bright,#22d3ee) 4%,var(--surface)) 100%); padding: 10px; display:grid; gap:8px; box-shadow: 0 1px 8px color-mix(in srgb,var(--foreground) 4%,transparent); }
.opp-hero-top { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start; }
.opp-stage-dot { width:8px; height:8px; border-radius:99px; background:var(--brand-600); margin-top:5px; flex-shrink:0; }
.opp-actions-sticky { position: sticky; top: 0; z-index: 4; border: 1px solid color-mix(in srgb,var(--foreground) 6%,var(--border)); border-radius: 10px; background: color-mix(in srgb,var(--surface) 91%, var(--brand-600) 4%); padding: 6px; display:flex; gap:5px; flex-wrap:wrap; backdrop-filter: blur(10px); }
.opp-actions-sticky button,.opp-actions-sticky a { min-height:30px !important; padding:5px 10px !important; font-size:11px !important; border-radius:8px !important; }
.opp-mini-summary { position: sticky; top: 46px; z-index: 3; border: 1px solid color-mix(in srgb,var(--foreground) 6%,var(--border)); border-radius: 10px; background: color-mix(in srgb,var(--surface) 94%, var(--brand-600) 3%); padding: 6px 8px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.opp-stage-flow { display:grid; gap:7px; }
.opp-stage-rail { position: relative; padding: 0 6px; }
.opp-stage-rail-track { position: absolute; left: 8px; right: 8px; top: 11px; height: 2px; border-radius: 99px; background: color-mix(in srgb,var(--foreground) 12%,var(--border)); overflow: hidden; }
.opp-stage-rail-progress { height: 100%; border-radius: 99px; background: linear-gradient(90deg, color-mix(in srgb,var(--brand-600) 88%,#2dd4bf), color-mix(in srgb,#2dd4bf 72%, var(--brand-600))); transition: width .3s ease; }
.opp-stage-row { position: relative; display:grid; grid-template-columns: repeat(${STAGE_FLOW.length}, minmax(0,1fr)); gap:4px; }
.opp-stage-cell { background: transparent; border: none; padding: 0 2px; font-size: 11px; cursor:pointer; text-align:left; transition: transform .12s ease; display:grid; gap:3px; }
.opp-stage-node { width: 9px; height: 9px; border-radius: 99px; border: 1px solid color-mix(in srgb,var(--foreground) 20%,var(--border)); background: color-mix(in srgb,var(--surface) 90%, var(--foreground)); box-shadow: 0 0 0 2px var(--surface); }
.opp-stage-cell.reached .opp-stage-node { background: color-mix(in srgb,var(--brand-600) 82%,#2dd4bf); border-color: color-mix(in srgb,var(--brand-600) 45%,var(--border)); }
.opp-stage-cell.active .opp-stage-node { width: 10px; height: 10px; box-shadow: 0 0 0 3px color-mix(in srgb,var(--brand-600) 20%,transparent); }
.opp-stage-label { font-size: 11px; color: var(--muted); font-weight: 700; line-height: 1.2; letter-spacing: .01em; }
.opp-stage-cell.active .opp-stage-label { color: var(--foreground); font-weight: 800; }
.opp-metrics { display:grid; grid-template-columns: repeat(auto-fit,minmax(148px,1fr)); gap:6px; }
.opp-metric { border:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border)); border-radius:9px; padding:6px 8px; background: color-mix(in srgb,var(--surface-2) 42%,var(--surface)); display:grid; gap:1px; }
.opp-layout { display:grid; gap:10px; grid-template-columns: 1fr; align-items:start; }
.opp-main, .opp-side { display:grid; gap:8px; align-content:start; }
@media (min-width: 1120px){ .opp-layout { grid-template-columns: minmax(0,1.5fr) minmax(280px,.5fr); } .opp-side { position: sticky; top: 84px; } }
.opp-main .sales-panel,
.opp-side .sales-panel {
  border-color: color-mix(in srgb, var(--foreground) 5%, var(--border)) !important;
  box-shadow: 0 1px 8px color-mix(in srgb, var(--foreground) 2%, transparent) !important;
}
.opp-main .sales-panel > div:first-child,
.opp-side .sales-panel > div:first-child {
  padding-bottom: 4px !important;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border)) !important;
}
.opp-main .sales-panel h3,
.opp-side .sales-panel h3 {
  font-size: 12px !important;
  letter-spacing: -0.015em !important;
}
.opp-main .sales-panel p,
.opp-side .sales-panel p {
  font-size: 11px !important;
  line-height: 1.3 !important;
  color: color-mix(in srgb, var(--muted) 86%, var(--foreground)) !important;
}
.opp-side .sales-panel { padding: 8px 9px !important; gap: 6px !important; }
.side-stack { display: grid; gap: 5px; }
.side-card { border: 1px solid color-mix(in srgb,var(--foreground) 6%,var(--border)); border-radius: 8px; padding: 5px 7px; background: color-mix(in srgb,var(--surface-2) 32%,var(--surface)); display: grid; gap: 3px; }
.side-meta { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.mini-pill { border-radius: 999px; padding: 2px 6px; font-size: 11px; font-weight: 760; border: 1px solid color-mix(in srgb,var(--foreground) 10%,var(--border)); background: color-mix(in srgb,var(--surface) 92%,var(--surface-2)); color: var(--muted); }
.mini-pill.engaged { border-color: color-mix(in srgb,var(--success) 30%,var(--border)); background: color-mix(in srgb,var(--success) 10%,var(--surface)); color: color-mix(in srgb,var(--success) 92%,black); }
.mini-pill.cooling { border-color: color-mix(in srgb,var(--warning) 34%,var(--border)); background: color-mix(in srgb,var(--warning) 12%,var(--surface)); color: color-mix(in srgb,var(--warning) 90%,black); }
.mini-pill.at-risk { border-color: color-mix(in srgb,var(--danger) 36%,var(--border)); background: color-mix(in srgb,var(--danger) 10%,var(--surface)); color: var(--danger); }
.timeline { margin:0; padding:0; list-style:none; display:grid; gap:7px; }
.timeline-item { position:relative; display:grid; grid-template-columns: 22px minmax(0,1fr) auto; gap:8px; align-items:start; }
.timeline-item::after { content:''; position:absolute; left:10px; top:22px; bottom:-8px; width:1px; background:color-mix(in srgb,var(--foreground) 10%,transparent); }
.timeline-item:last-child::after { display:none; }
.timeline-dot { width:20px; height:20px; border-radius:6px; border:1px solid color-mix(in srgb,var(--brand-600) 35%,var(--border)); background:color-mix(in srgb,var(--brand-600) 12%,var(--surface)); display:flex; align-items:center; justify-content:center; font-size:11px; }
.task-row { display:grid; grid-template-columns: auto minmax(0,1fr) auto auto; gap:7px; align-items:center; border:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border)); border-radius:9px; padding:6px 7px; background:color-mix(in srgb,var(--surface) 98%,var(--surface-2)); }
.chip { border-radius:99px; font-size:11px; font-weight:800; padding:3px 8px; }
.chip.ok { border:1px solid color-mix(in srgb,var(--success) 35%,var(--border)); background:color-mix(in srgb,var(--success) 10%,var(--surface)); }
.chip.warn { border:1px solid color-mix(in srgb,var(--warning) 42%,var(--border)); background:color-mix(in srgb,var(--warning) 12%,var(--surface)); }
.chip.danger { border:1px solid color-mix(in srgb,var(--danger) 42%,var(--border)); background:color-mix(in srgb,var(--danger) 10%,var(--surface)); color: var(--danger); }
.health-chip-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.health-chip { border-radius: 999px; padding: 4px 9px; font-size: 11px; font-weight: 800; letter-spacing: .02em; border: 1px solid transparent; }
.health-chip.urgent { background: color-mix(in srgb,var(--danger) 12%,var(--surface)); border-color: color-mix(in srgb,var(--danger) 38%,var(--border)); color: var(--danger); }
.health-chip.stalled { background: color-mix(in srgb,#f97316 12%,var(--surface)); border-color: color-mix(in srgb,#ea580c 36%,var(--border)); color: color-mix(in srgb,#c2410c 92%, black); }
.health-chip.warning { background: color-mix(in srgb,var(--warning) 12%,var(--surface)); border-color: color-mix(in srgb,var(--warning) 36%,var(--border)); color: color-mix(in srgb,var(--warning) 85%, black); }
.health-chip.healthy { background: color-mix(in srgb,var(--success) 12%,var(--surface)); border-color: color-mix(in srgb,var(--success) 36%,var(--border)); color: color-mix(in srgb,var(--success) 88%, black); }
.health-item { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 6px 8px; padding: 5px 0; border-bottom: 1px solid color-mix(in srgb,var(--foreground) 5%,transparent); }
.health-item:last-child { border-bottom: none; padding-bottom: 0; }
.nba-card { border: 1px solid color-mix(in srgb,var(--brand-600) 20%,var(--border)); border-radius: 10px; background: linear-gradient(145deg, color-mix(in srgb,var(--brand-600) 8%,var(--surface)) 0%, var(--surface) 72%); padding: 7px 9px; display: grid; gap: 5px; }
.opp-metric,
.side-card,
.task-row,
.timeline-item,
.nba-card {
  transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease, transform .12s ease;
}
@media (hover: hover) and (pointer: fine) {
  .opp-metric:hover,
  .side-card:hover,
  .task-row:hover {
    border-color: color-mix(in srgb,var(--brand-600) 22%,var(--border));
    box-shadow: 0 2px 9px color-mix(in srgb,var(--foreground) 4%,transparent);
  }
}
button:focus-visible,
a:focus-visible,
select:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);
  outline-offset: 2px;
}
@media (max-width: 760px){
  .opp-workspace { padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)); min-width: 0; }
  .opp-mini-summary { top: auto; position: static; flex-wrap: wrap; }
  .opp-stage-row { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px 6px; }
  .opp-stage-rail-track { display: none; }
  .opp-stage-label { font-size: 11px; overflow-wrap: anywhere; }
  .opp-actions-sticky { gap: 6px; position: static; }
  .opp-actions-sticky button,
  .opp-actions-sticky a { min-height: 44px !important; flex: 1 1 calc(50% - 6px); justify-content: center; }
  .opp-hero-top { flex-direction: column; align-items: stretch !important; }
  .opp-hero-top > :last-child { justify-items: start !important; }
  .opp-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .opp-layout { gap: 8px; }
  .timeline-item { grid-template-columns: 20px minmax(0,1fr); }
  .timeline-item > :last-child { grid-column: 2 / -1; }
  .task-row { grid-template-columns: auto minmax(0,1fr) auto; }
  .task-row > :last-child { grid-column: 1 / -1; justify-self: end; }
}
@media (max-width: 400px){
  .opp-metrics { grid-template-columns: 1fr !important; }
  .opp-actions-sticky button,
  .opp-actions-sticky a { flex: 1 1 100%; }
}
      `}} />

      <div className="opp-workspace">
        <div className="opp-mobile-chrome" aria-label="Opportunity navigation">
          <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
          <SalesCmdLink href="/portal/sales/opportunities" variant="secondary">
            ← {OPPORTUNITY_UI.navListTitle}
          </SalesCmdLink>
        </div>
        <section className="opp-hero">
          <div className="opp-hero-top">
            <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span className="opp-stage-dot" />
                <span style={{ ...metricLabelStyle, fontSize: 11 }}>{OPPORTUNITY_UI.detailSubtitle}</span>
              </div>
              <h1 style={{ margin: 0, fontSize: 19, lineHeight: 1.2, letterSpacing: "-0.03em" }}>{productLabel}</h1>
              <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span>{opp.account_name}</span>
                <span>•</span>
                <span>{String(opp.physician_name || "No primary clinician")}</span>
                <span>•</span>
                <span>{SALES_STAGE_LABEL[opp.stage]}</span>
              </div>
            </div>
            <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: st.bg, color: st.fg, border: `1px solid ${st.border}` }}>
                {SALES_STAGE_LABEL[opp.stage]}
              </span>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 650 }}>Momentum: <span style={{ color: "var(--foreground)" }}>{momentumLabel}</span></div>
            </div>
          </div>
          <div className="opp-metrics">
            <InlineMetric label="Estimated value" value={estValue} editable control={<input aria-label="Estimated value in dollars" inputMode="numeric" defaultValue={String(Math.round(Number(opp.value_cents || 0) / 100))} style={miniInputStyle} onBlur={(e) => { const n = Number(e.target.value || 0); if (Number.isFinite(n)) void patchOpp({ value_cents: Math.max(0, Math.round(n * 100)) }, "value"); }} />} busy={inlineSaving === "value"} />
            <InlineMetric label="Expected close" value={String(opp.close_date || "—")} editable control={<input type="date" aria-label="Expected close date" defaultValue={String(opp.close_date || "")} style={miniInputStyle} onBlur={(e) => void patchOpp({ close_date: e.target.value || null }, "close")} />} busy={inlineSaving === "close"} />
            <InlineMetric label="Probability" value={`${stageProb}%`} />
            <InlineMetric label="Owner" value={ownerLabel} />
            <InlineMetric label="Last activity" value={lastActivityDays == null ? "None" : `${lastActivityDays}d ago`} />
            <InlineMetric label="Days in stage" value={`${stageDays}d`} />
          </div>
        </section>

        <div className="opp-actions-sticky">
          <button type="button" style={sc.btnPrimary} onClick={() => { setActivityComposerOpen(true); actRef.current?.focus(); }}>Log activity</button>
          {LOG_UPDATE_UI_ENABLED ? (
            <button
              type="button"
              style={sc.btnSecondary}
              onClick={() => {
                const ctx = buildCaptureIntelligenceOpenContext("opportunity", {
                  opportunityId,
                  opportunityLabel: String(opp.account_name || OPPORTUNITY_UI.fallbackRecordLabel),
                  organizationId: opp.account_id ? String(opp.account_id) : undefined,
                  organizationLabel: String(opp.account_name || ""),
                });
                captureIntelligence.open(ctx, { onSaved: () => void reload({ soft: true }) });
              }}
            >
              {captureIntelligenceTitleForContext(
                buildCaptureIntelligenceOpenContext("opportunity", { opportunityId }),
              )}
            </button>
          ) : null}
          <button type="button" style={sc.btnSecondary} onClick={() => taskTitleRef.current?.focus()}>Add task</button>
          <Link href={scheduleCaseHref(opportunityId, opp.account_id)} style={sc.btnSecondary}>Schedule case</Link>
          <Link href="/portal/sales/cases?status=billing_review" style={sc.btnSecondary}>Upload quote</Link>
          <button type="button" style={sc.btnGhost} onClick={() => void advancePipelineStage()} disabled={!nextPipelineStage || inlineSaving === "stage"}>
            {nextPipelineStage ? `Next: ${SALES_STAGE_LABEL[nextPipelineStage]}` : "Final stage"}
          </button>
          <button type="button" style={sc.btnGhost} onClick={() => void patchOpp({ stage: "won" }, "won")}>Close won</button>
          <button type="button" style={sc.btnGhost} onClick={() => void patchOpp({ stage: "lost", closed_lost_reason: "other" }, "lost")}>Close lost</button>
        </div>
        <div className="opp-mini-summary">
          <div style={{ minWidth: 0, display: "grid", gap: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{productLabel}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.2 }}>{salesStageLabel(opp.stage)} · {estValue} · Next: {suggestedActions[0]}</div>
          </div>
          <button type="button" style={{ ...sc.btnPrimary, minHeight: 44, padding: "4px 9px", fontSize: 11 }} onClick={() => { setActivityComposerOpen(true); actRef.current?.focus(); }}>
            Quick log
          </button>
        </div>

        <SalesPanel title="Pipeline momentum" density="compact" description="Clickable stage rail with probability and time-in-stage context.">
          <div className="opp-stage-flow">
            <div className="opp-stage-rail">
              <div className="opp-stage-rail-track" aria-hidden>
                <div className="opp-stage-rail-progress" style={{ width: `${stageRailPct}%` }} />
              </div>
            <div className="opp-stage-row">
              {STAGE_FLOW.map((s) => (
                <button
                  key={s}
                  className={`opp-stage-cell ${currentStage === s ? "active" : ""} ${STAGE_FLOW.indexOf(s) <= stageRailIndex ? "reached" : ""}`}
                  onClick={() => void patchOpp({ stage: s }, "stage")}
                  type="button"
                >
                  <span className="opp-stage-node" aria-hidden />
                  <span className="opp-stage-label">{SALES_STAGE_LABEL[s]}</span>
                </button>
              ))}
            </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span>
                Current stage: <b style={{ color: "var(--foreground)" }}>{salesStageLabel(opp.stage)}</b> · {stageProb}% probability
                {stageProbOverride == null ? " (default)" : " (manual override)"}
              </span>
              <span>{stageDays} days in stage · {confidenceLabel}</span>
            </div>
            <div
              style={{
                marginTop: 2,
                borderRadius: 8,
                border: "1px solid color-mix(in srgb,var(--foreground) 7%,var(--border))",
                background: "color-mix(in srgb,var(--surface-2) 44%,var(--surface))",
                padding: "7px 9px",
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
                Stage guidance
              </div>
              <div style={{ fontSize: 11, color: "var(--foreground)", lineHeight: 1.35 }}>{STAGE_HELPER_COPY[currentStage]}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 650 }}>Suggested next action: {stageSuggestedAction}</span>
                {isLostStage(currentStage) ? (
                  <span className="health-chip urgent" style={{ padding: "3px 8px", fontSize: 11 }}>
                    Lost (terminal)
                  </span>
                ) : (
                  <button
                    type="button"
                    style={{ ...sc.btnGhost, minHeight: 44, padding: "3px 8px", fontSize: 11 }}
                    onClick={() => void patchOpp({ stage: "lost", closed_lost_reason: opp.closed_lost_reason || "other" }, "lost")}
                  >
                    Mark lost
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {stagePromptActions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    style={{ ...sc.btnGhost, minHeight: 44, padding: "3px 8px", fontSize: 11 }}
                    onClick={() => runStagePrompt(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SalesPanel>

        {hasLostReason ? <div style={{ padding: "10px 12px", borderRadius: 11, background: "color-mix(in srgb, var(--danger) 8%, var(--surface))", border: "1px solid color-mix(in srgb, var(--danger) 28%, var(--border))", fontSize: 13 }}><b>Loss reason:</b> {LOST_REASONS.find((r) => r.value === opp.closed_lost_reason)?.label || String(opp.closed_lost_reason).replace(/_/g, " ")}</div> : null}
        {err ? <div role="alert" style={sc.alertError}>{err}</div> : null}

        <div className="opp-layout">
          <div className="opp-main">
            <SalesPanel title="Deal health" density="compact" description="Actionable blockers only.">
              <div className="nba-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 800, color: "color-mix(in srgb,var(--brand-700) 70%,var(--muted))" }}>
                    Next best action
                  </div>
                  {nextPipelineStage ? (
                    <button
                      type="button"
                      style={{ ...sc.btnGhost, minHeight: 44, padding: "3px 8px", fontSize: 11, marginLeft: "auto" }}
                      disabled={inlineSaving === "stage"}
                      onClick={() => void advancePipelineStage()}
                      title={`Advance to ${SALES_STAGE_LABEL[nextPipelineStage]}`}
                    >
                      {inlineSaving === "stage" ? "Moving…" : `Next: ${SALES_STAGE_LABEL[nextPipelineStage]}`}
                    </button>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, fontWeight: 820, lineHeight: 1.2 }}>{nextBestAction.title}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.3 }}>{nextBestAction.reason}</div>
                {currentStage === "discovery" ? (
                  <div style={{ display: "grid", gap: 5, padding: "5px 0" }}>
                    {championConfirmed ? (
                      <div style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 650 }}>
                        Champion confirmed: {championName || "Selected surgeon"}
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>Champion contact</span>
                          <select
                            value={pendingChampionName}
                            onChange={(e) => setPendingChampionName(e.target.value)}
                            style={{ ...miniInputStyle, minHeight: 44, fontSize: 16 }}
                          >
                            <option value="">Select champion contact</option>
                            {championOptionNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          disabled={!pendingChampionName.trim() || inlineSaving === "champion"}
                          onClick={() => {
                            const selected = pendingChampionName.trim();
                            if (!selected) return;
                            void patchOpp(
                              {
                                surgeon_champion_name: selected,
                                surgeon_champion_confirmed: true,
                              },
                              "champion",
                            );
                          }}
                          style={{ ...sc.btnPrimary, minHeight: 44, padding: "4px 10px", fontSize: 11, justifySelf: "start" }}
                        >
                          {inlineSaving === "champion" ? "Confirming…" : "Confirm surgeon champion"}
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" style={{ ...sc.btnPrimary, minHeight: 44, padding: "3px 8px", fontSize: 11 }} onClick={() => runAction(nextBestAction.kind)}>
                    {nextBestAction.cta}
                  </button>
                  {nextBestAction.secondary.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      style={{ ...sc.btnGhost, minHeight: 44, padding: "3px 7px", fontSize: 11 }}
                      onClick={() => {
                        if (s.kind === "add_task") {
                          setTaskTitle(s.label);
                          taskTitleRef.current?.focus();
                          return;
                        }
                        runAction(s.kind);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {dealHealthBlockers.length === 0 ? null : (
                <div style={{ display: "grid", gap: 4 }}>
                  <div className="health-chip-row" aria-label="Deal health status">
                    {dealHealthBlockers.map((b) => (
                      <span key={`chip-${b.id}`} className={`health-chip ${b.severity}`}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 2 }}>
                    {dealHealthBlockers.map((b) => (
                      <div className="health-item" key={b.id}>
                        <span className={`health-chip ${b.severity}`} style={{ padding: "2px 7px", fontSize: 11 }}>
                          {b.severity}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 780, lineHeight: 1.25 }}>{b.label}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.3 }}>{b.detail}</div>
                        </div>
                        <button
                          type="button"
                          style={{ ...sc.btnGhost, minHeight: 44, padding: "3px 8px", fontSize: 11 }}
                          onClick={() => {
                            if (b.action === "Log activity") {
                              selectComposerType("note");
                            } else if (b.action === "Add task" || b.action === "Create follow-up") {
                              taskTitleRef.current?.focus();
                            } else if (b.action === "Schedule case") {
                              window.location.assign(scheduleCaseHref(opportunityId, opp?.account_id));
                            } else if (b.action === "Move stage") {
                              void advancePipelineStage();
                            }
                          }}
                        >
                          {b.action}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SalesPanel>

            <SalesPanel title="Activity timeline" density="compact" description="Calls, meetings, notes, demos.">
              <UnifiedActivityFeed
                className="opp-unified-activity-feed"
                items={oppActivityItems}
                loading={oppActivityLoading || loading}
                activityFilter={activityFilter}
                onFilterChange={setActivityFilter}
                totalCount={oppActivityItems.length}
              />
              <form onSubmit={addActivity} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {ACTIVITY_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => selectComposerType(t)} style={composerTab === t ? sc.btnPrimary : sc.btnSecondary}>
                      {ACTIVITY_TYPE_LABEL[t]}
                    </button>
                  ))}
                  <button type="button" style={sc.btnGhost} onClick={() => setActivityComposerOpen((s) => !s)}>{activityComposerOpen ? "Collapse" : "Expand"} composer</button>
                </div>
                {activityComposerOpen ? (
                  <>
                    <textarea ref={actRef} value={actSummary} onChange={(e) => setActSummary(e.target.value)} placeholder="Capture outcome + next step…" rows={2} style={{ ...sc.input, minHeight: 56, resize: "vertical", fontFamily: "inherit" }} />
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(140px,1fr) auto auto", gap: 6 }}>
                        <select value={mentionId} onChange={(e) => setMentionId(e.target.value)} style={sc.input}>
                          <option value="">Mention contact…</option>
                          {stakeholderCards.map((s) => {
                            const nm = `${String(s.first_name || "").trim()} ${String(s.last_name || "").trim()}`.trim() || String(s.email || "Contact");
                            return (
                              <option key={String(s.id)} value={String(s.id)}>
                                {nm} · {String(s.role_type || "contact").replace(/_/g, " ")}
                              </option>
                            );
                          })}
                        </select>
                        <button type="button" style={sc.btnGhost} onClick={insertMentionFromSelection}>
                          Add mention
                        </button>
                        <label style={{ ...sc.btnGhost, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          Attach files
                          <input
                            type="file"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                          />
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link href={scheduleCaseHref(opportunityId, opp.account_id)} style={{ ...sc.btnGhost, textDecoration: "none" }}>
                          Link case
                        </Link>
                        {selectedFiles.map((f) => (
                          <span key={f.name + f.size} className="chip ok">
                            {f.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button type="submit" disabled={actSaving} style={{ ...sc.btnPrimary, justifySelf: "start" }}>{actSaving ? "Saving…" : "Log activity"}</button>
                  </>
                ) : null}
              </form>
            </SalesPanel>

            <SalesPanel title="Tasks & follow-ups" density="compact" description="Execution queue.">
              {tasks.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 12 }}>No open tasks. Suggested next action: <b>Schedule follow-up</b>.</div> : null}
              <div style={{ display: "grid", gap: 6 }}>
                {tasks.slice(0, 8).map((t) => {
                  const chip = dueChip(t.due_date);
                  return (
                    <div className="task-row" key={t.id}>
                      <input type="checkbox" aria-label={`Mark ${t.title} complete`} onChange={() => completeTask(t.id)} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>Due {new Date(t.due_date + "T12:00:00Z").toLocaleDateString()}</div>
                      </div>
                      <span className={`chip ${chip.tone}`}>{chip.label}</span>
                      <button type="button" onClick={() => completeTask(t.id)} style={{ ...sc.btnGhost, minHeight: 44, padding: "4px 8px", fontSize: 11 }}>Done</button>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={addTask} style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(130px,170px)", gap: 6 }}>
                  <input ref={taskTitleRef} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Add follow-up task…" style={sc.input} />
                  <input
                    type="date"
                    aria-label="Follow-up due date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    style={sc.input}
                  />
                </div>
                <button type="submit" disabled={taskSaving} style={{ ...sc.btnPrimary, justifySelf: "start" }}>{taskSaving ? "Adding…" : "Add task"}</button>
              </form>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suggestedActions.map((s) => <span key={s} className="chip ok">{s}</span>)}
              </div>
            </SalesPanel>
          </div>

          <aside className="opp-side">
            <SalesPanel title="Key stakeholders" density="compact" description="High-signal relationship map.">
              <div className="side-stack">
                {stakeholderCards.length === 0 ? (
                  <div className="side-card">
                    <div style={{ fontSize: 11, fontWeight: 800 }}>No linked stakeholders yet</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.25 }}>Add surgeons, schedulers, office managers, and buyers from organization contacts.</div>
                  </div>
                ) : (
                  stakeholderCards.map((s) => {
                    const nm = `${String(s.first_name || "").trim()} ${String(s.last_name || "").trim()}`.trim() || String(s.email || "Contact");
                    const lastTouch = daysBetween(String(s.updated_at || "")) ?? null;
                    const engagementClass =
                      lastTouch == null ? "cooling" : lastTouch <= 4 ? "engaged" : lastTouch <= 9 ? "cooling" : "at-risk";
                    const engagementLabel =
                      lastTouch == null ? "unknown" : lastTouch <= 4 ? "engaged" : lastTouch <= 9 ? "cooling" : "at risk";
                    return (
                      <div key={String(s.id)} className="side-card">
                        <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.2 }}>{nm}</div>
                        <div className="side-meta">
                          <span className="mini-pill">{String(s.role_type || "contact").replace(/_/g, " ")}</span>
                          <span className="mini-pill">influence {String(s.influence_level || "unknown").replace(/_/g, " ")}</span>
                          <span className="mini-pill">last touch {lastTouch == null ? "—" : `${lastTouch}d`}</span>
                          <span className={`mini-pill ${engagementClass}`}>engagement {engagementLabel}</span>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 1 }}>
                          <button type="button" style={{ ...sc.btnGhost, minHeight: 44, padding: "4px 8px", fontSize: 11 }} onClick={() => { setComposerTab("note"); setActSummary((p) => `${p}${p ? " " : ""}@${nm} `); actRef.current?.focus(); }}>
                            Log interaction
                          </button>
                          {s.email ? (
                            <a href={`mailto:${encodeURIComponent(String(s.email))}`} style={{ ...sc.btnGhost, minHeight: 44, padding: "4px 8px", fontSize: 11, textDecoration: "none" }}>
                              Email
                            </a>
                          ) : null}
                          {s.phone ? (
                            <a href={`tel:${String(s.phone)}`} style={{ ...sc.btnGhost, minHeight: 44, padding: "4px 8px", fontSize: 11, textDecoration: "none" }}>
                              Call
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SalesPanel>

            <SalesPanel title="Product intelligence" density="compact" description="Units, revenue, and case linkage.">
              <div className="side-stack">
                <div className="side-card">
                  <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.2 }}>{productLabel}</div>
                  <div className="side-meta">
                    <span className="mini-pill">expected units {Math.max(1, Math.round((Number(opp.value_cents || 0) || 0) / 15000) || 1)}</span>
                    <span className="mini-pill">projected {estValue}</span>
                    <span className="mini-pill">linked cases {linkedCases.length}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {["ACSIS", "Endolumik", "TelaBio", "BioTissue", "Skeletal Dynamics"].map((p) => <span key={p} className="mini-pill">{p}</span>)}
                </div>
              </div>
            </SalesPanel>

            <LinkedEngagementsPanel
              opportunityId={opportunityId}
              engagements={linkedEngagements}
              linkOptions={engagementLinkOptions}
              busy={relationshipBusy}
              onLink={(engagementId) => patchRelationships({ link_engagement_id: engagementId })}
              onUnlink={(engagementId) => patchRelationships({ unlink_engagement_id: engagementId })}
            />

            <LinkedCasesPanel
              opportunityId={opportunityId}
              accountId={opp.account_id ? String(opp.account_id) : null}
              cases={linkedCases}
              linkOptions={caseLinkOptions}
              busy={relationshipBusy}
              onLink={(caseId) => patchRelationships({ link_case_id: caseId })}
              onUnlink={(caseId) => patchRelationships({ unlink_case_id: caseId })}
            />

            <SalesPanel title="Evaluation notes" density="compact">
              <textarea
                aria-label="Evaluation notes"
                placeholder="What you learned, and what it changes…"
                defaultValue={String(opp.notes || "")}
                rows={3}
                style={{ ...sc.input, minHeight: 68, fontFamily: "inherit" }}
                onBlur={(e) => void patchOpp({ notes: e.target.value || null }, "notes")}
              />
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Saves as soon as you tap outside the box.</div>
            </SalesPanel>
          </aside>
        </div>
      </div>
    </SalesCommandPage>
  );
}

function InlineMetric({
  label,
  value,
  editable,
  control,
  busy,
}: {
  label: string;
  value: string;
  editable?: boolean;
  control?: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <div className="opp-metric">
      <div style={metricLabelStyle}>{label}</div>
      <div style={{ ...metricValueStyle, fontSize: 13 }}>{value}</div>
      {editable ? <div>{control}</div> : null}
      {busy ? <div style={{ fontSize: 11, color: "var(--muted)" }}>Saving…</div> : null}
    </div>
  );
}

const metricLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--muted) 85%, var(--foreground))" };
const metricValueStyle: React.CSSProperties = { fontSize: 13, fontWeight: 780, letterSpacing: "-0.01em", color: "var(--foreground)" };
const miniInputStyle: React.CSSProperties = { width: "100%", borderRadius: 6, border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))", background: "var(--surface)", padding: "3px 6px", fontSize: 16 };
