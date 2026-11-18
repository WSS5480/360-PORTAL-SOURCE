"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import type {
  MissionControlPrimaryState,
  NewCaseOperationalReadinessView,
  ReadinessTone,
} from "@/lib/surgical-sales/buildNewCaseOperationalReadiness";

export const newCaseOperationalReadinessCss = `
.new-case-mission-control{display:grid;gap:6px}
.new-case-mission-control--desktop{
  position:sticky;
  top:8px;
  align-self:start;
  height:fit-content;
  max-height:calc(100vh - 20px);
  overflow-y:auto;
}
.new-case-mission-control--mobile{
  display:none;
  border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));
  border-radius:10px;
  background:var(--surface);
  overflow:hidden;
}
.new-case-mission-control--mobile>summary{
  cursor:pointer;
  list-style:none;
  font-weight:800;
  font-size:12px;
  padding:7px 8px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  min-height:44px;
}
.new-case-mission-control--mobile>summary:focus-visible{
  outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);
  outline-offset:-2px;
}
.new-case-mission-control--mobile>summary::-webkit-details-marker{display:none}
.new-case-mission-control--mobile>summary::after{
  content:"";
  width:6px;
  height:6px;
  border-right:2px solid var(--muted);
  border-bottom:2px solid var(--muted);
  transform:rotate(45deg);
  transition:transform .15s ease;
  flex-shrink:0;
  margin-top:-2px;
}
.new-case-mission-control--mobile[open]>summary::after{
  transform:rotate(-135deg);
  margin-top:2px;
}
.new-case-mission-control-body{display:grid;gap:6px}
.new-case-mission-control--mobile .new-case-mission-control-body{padding:0 7px 7px}
.new-case-mission-control-kicker{margin:0;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.new-case-mission-control-state{
  margin:0;
  font-size:13px;
  font-weight:850;
  line-height:1.25;
  color:var(--foreground);
}
.new-case-mission-control-state.is-ready{color:#047857}
.new-case-mission-control-state.is-caution{color:#b45309}
.new-case-mission-control-state.is-critical{color:#b91c1c}
.new-case-mission-control-action{
  margin:0;
  padding:5px 7px;
  border-radius:8px;
  font-size:11px;
  line-height:1.35;
  font-weight:650;
  background:color-mix(in srgb,var(--brand-600) 6%,var(--surface));
  border:1px solid color-mix(in srgb,var(--brand-600) 14%,var(--border));
}
.new-case-mission-control-action.is-critical{
  background:color-mix(in srgb,#dc2626 6%,var(--surface));
  border-color:color-mix(in srgb,#dc2626 20%,var(--border));
  color:#b91c1c;
}
.new-case-mission-control-action.is-caution{color:#b45309}
.new-case-mission-control-action.is-ready{
  background:color-mix(in srgb,#047857 6%,var(--surface));
  border-color:color-mix(in srgb,#047857 18%,var(--border));
  color:#047857;
}
.new-case-mission-control-progress{margin:0;padding:0;list-style:none;display:grid;gap:4px}
.new-case-mission-control-progress li{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  font-size:10px;
  line-height:1.3;
  font-weight:650;
  color:color-mix(in srgb,var(--foreground) 72%,var(--muted));
}
.new-case-mission-control-progress-status{
  font-size:9px;
  font-weight:800;
  letter-spacing:.03em;
  text-transform:uppercase;
  color:var(--muted);
}
.new-case-mission-control-progress li.is-complete .new-case-mission-control-progress-status{color:#047857}
.new-case-mission-control-resolve{
  width:100%;
  min-height:44px;
  font-size:12px;
  font-weight:800;
}
.new-case-mission-control-secondary{
  margin:0;
  padding:4px 0 0;
  border-top:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border));
  display:grid;
  gap:2px;
  font-size:10px;
  line-height:1.35;
  color:var(--muted);
  font-weight:600;
}
@media (max-width:980px){
  .new-case-mission-control--desktop{display:none}
  .new-case-mission-control--mobile{display:grid}
}`;

function toneClass(tone: ReadinessTone): string {
  switch (tone) {
    case "ready":
      return "is-ready";
    case "missing":
    case "caution":
    case "unknown":
      return "is-caution";
    case "critical":
      return "is-critical";
    default:
      return "";
  }
}

function stateToneClass(state: MissionControlPrimaryState): string {
  switch (state) {
    case "execution_ready":
    case "draft_ready":
      return "is-ready";
    case "planning_incomplete":
      return "is-caution";
    default:
      return "is-critical";
  }
}

function MissionControlBody({
  view,
  onResolveNextStep,
}: {
  view: NewCaseOperationalReadinessView;
  onResolveNextStep?: () => void;
}) {
  const mc = view.missionControl;
  const showResolve = mc.primaryState !== "execution_ready";

  return (
    <div className="new-case-mission-control-body">
      <div>
        <p className="new-case-mission-control-kicker">Operational posture</p>
        <p className={`new-case-mission-control-state ${stateToneClass(mc.primaryState)}`}>{mc.primaryStateLabel}</p>
      </div>

      <div>
        <p className="new-case-mission-control-kicker">Next field action</p>
        <p className={`new-case-mission-control-action ${toneClass(mc.nextStepTone)}`} role="status">
          {mc.nextStep}
        </p>
      </div>

      <div>
        <p className="new-case-mission-control-kicker">Progress</p>
        <ul className="new-case-mission-control-progress">
          {mc.progress.map((step) => (
            <li key={step.key} className={step.complete ? "is-complete" : ""}>
              <span>{step.label}</span>
              <span className="new-case-mission-control-progress-status">{step.statusLabel}</span>
            </li>
          ))}
        </ul>
      </div>

      {onResolveNextStep ? (
        <button
          type="button"
          className="new-case-mission-control-resolve new-case-btn-primary"
          style={sc.btnPrimary}
          onClick={onResolveNextStep}
        >
          {showResolve ? "Focus next field" : "Review mission phases"}
        </button>
      ) : null}

      <div className="new-case-mission-control-secondary" aria-label="Secondary mission info">
        <span>{mc.secondary.productInterest}</span>
        <span>{mc.secondary.linkedInitiative}</span>
      </div>
    </div>
  );
}

export function NewCaseOperationalReadinessPanel({
  view,
  variant,
  onResolveNextStep,
}: {
  view: NewCaseOperationalReadinessView;
  variant: "desktop" | "mobile";
  onResolveNextStep?: () => void;
}) {
  if (variant === "mobile") {
    return (
      <details className="new-case-mission-control new-case-mission-control--mobile">
        <summary>Mission Control</summary>
        <MissionControlBody view={view} onResolveNextStep={onResolveNextStep} />
      </details>
    );
  }

  return (
    <aside
      className="new-case-panel new-case-mission-control new-case-mission-control--desktop"
      aria-label="Mission control"
    >
      <h2 className="new-case-title">Mission Control</h2>
      <MissionControlBody view={view} onResolveNextStep={onResolveNextStep} />
    </aside>
  );
}
