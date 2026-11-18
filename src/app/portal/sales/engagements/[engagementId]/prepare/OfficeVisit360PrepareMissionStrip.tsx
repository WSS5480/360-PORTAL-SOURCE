"use client";

import React from "react";
import {
  OFFICE_VISIT_360_PATHWAY_OBJECTIVE,
  OFFICE_VISIT_360_PATHWAY_OBJECTIVE_WHY,
  OFFICE_VISIT_360_PATHWAY_PRIMARY_QUESTION,
  OFFICE_VISIT_360_PATHWAY_SECONDARY_QUESTIONS,
} from "@/lib/surgical-sales/engagements/officeVisit360PathwayMission";

const PATHWAY_STEPS = [
  { id: "debrief", label: "Debrief", step: 1, current: false },
  { id: "evaluation", label: "Evaluation", step: 2, current: false },
  { id: "office_visit_360", label: "360 Experience", step: 3, current: true },
] as const;

export function OfficeVisit360PrepareMissionStrip({ specialty }: { specialty?: string | null }) {
  return (
    <section className="icp-mission-strip" aria-label="360 Experience mission">
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

      <div className="icp-mission-strip__grid">
        <div className="icp-mission-strip__objective icp-mission-strip__card">
          <div className="icp-mission-strip__card-icon icp-mission-strip__card-icon--mission" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
          <div className="icp-mission-strip__card-body">
            <p className="icp-mission-strip__label">Mission</p>
            <p className="icp-mission-strip__goal">{OFFICE_VISIT_360_PATHWAY_OBJECTIVE}</p>
            <p className="icp-mission-strip__why">{OFFICE_VISIT_360_PATHWAY_OBJECTIVE_WHY}</p>
            {specialty ? <p className="icp-mission-strip__specialty">{specialty}</p> : null}
          </div>
        </div>

        <div className="icp-mission-strip__questions icp-mission-strip__card">
          <div className="icp-mission-strip__card-icon icp-mission-strip__card-icon--lead" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v12l-4-2.5L14 18l-4-2.5L6 18V6a2 2 0 012-2z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="icp-mission-strip__card-body">
            <p className="icp-mission-strip__label">Listen for</p>
            <blockquote className="icp-mission-strip__primary">{OFFICE_VISIT_360_PATHWAY_PRIMARY_QUESTION}</blockquote>
            <ul className="icp-mission-strip__followups">
              {OFFICE_VISIT_360_PATHWAY_SECONDARY_QUESTIONS.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
