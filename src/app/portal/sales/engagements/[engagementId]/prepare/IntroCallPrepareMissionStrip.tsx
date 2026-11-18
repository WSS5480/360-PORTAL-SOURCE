"use client";

import React from "react";

import {
  INTRO_CALL_PATHWAY_OBJECTIVE_WHY,
  INTRO_CALL_START_MISSION_OBJECTIVE,
} from "@/lib/surgical-sales/engagements/introCallPathwayMission";

const PATHWAY_STEPS = [
  { id: "discovery", label: "Discovery", step: 1, current: false },
  { id: "intro_call", label: "Intro call", step: 2, current: true },
  { id: "observation", label: "Observation", step: 3, current: false },
] as const;

export function IntroCallPrepareMissionStrip({ specialty }: { specialty?: string | null }) {
  return (
    <section className="icp-mission-strip" aria-label="Intro call mission">
      <div className="icp-mission-strip__pathway" aria-label="Pathway progress">
        {PATHWAY_STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            {index > 0 ? (
              <span className="icp-mission-strip__pathway-sep" aria-hidden>
                <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : null}

            <span
              className={`icp-mission-strip__pathway-step${step.current ? " icp-mission-strip__pathway-step--current" : ""}`}
            >
              <span className="icp-mission-strip__pathway-num" aria-hidden>
                {step.step}
              </span>
              {step.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="icp-mission-strip__objective icp-mission-strip__card">
        <div className="icp-mission-strip__card-icon icp-mission-strip__card-icon--mission" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
        </div>
        <div className="icp-mission-strip__card-body">
          <p className="icp-mission-strip__label">Mission</p>
          <p className="icp-mission-strip__goal">{INTRO_CALL_START_MISSION_OBJECTIVE}</p>
          <p className="icp-mission-strip__why">{INTRO_CALL_PATHWAY_OBJECTIVE_WHY}</p>
          {specialty ? <p className="icp-mission-strip__specialty">{specialty}</p> : null}
        </div>
      </div>
    </section>
  );
}
