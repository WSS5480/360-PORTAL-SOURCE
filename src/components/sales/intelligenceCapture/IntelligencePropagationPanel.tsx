"use client";



import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";

import { collectUniqueBusinessOutcomesFromTargets } from "@/lib/surgical-sales/debriefReviewPropagation";

import {

  INTELLIGENCE_PROPAGATION_HEADING,

  INTELLIGENCE_PROPAGATION_SUBTITLE,

} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureUx";



export function IntelligencePropagationPanel({

  targets,

  className = "",

  heading = INTELLIGENCE_PROPAGATION_HEADING,

}: {

  targets: IntelligencePropagationTarget[];

  className?: string;

  heading?: string;

}) {

  const outcomes = collectUniqueBusinessOutcomesFromTargets(targets);

  if (outcomes.length === 0) return null;



  return (

    <section

      className={`intel-capture-propagation${className ? ` ${className}` : ""}`}

      aria-labelledby="intel-capture-propagation-title"

    >

      <h3 id="intel-capture-propagation-title" className="intel-capture-propagation-title">

        {heading}

      </h3>

      <p className="intel-capture-propagation-sub">{INTELLIGENCE_PROPAGATION_SUBTITLE}</p>

      <ul className="intel-capture-propagation-list">

        {outcomes.map((outcome) => (

          <li

            key={outcome}

            className="intel-capture-propagation-item intel-capture-propagation-item--active"

          >

            <span className="intel-capture-propagation-check" aria-hidden>

              ✓

            </span>

            <span className="intel-capture-propagation-label">{outcome}</span>

          </li>

        ))}

      </ul>

    </section>

  );

}
