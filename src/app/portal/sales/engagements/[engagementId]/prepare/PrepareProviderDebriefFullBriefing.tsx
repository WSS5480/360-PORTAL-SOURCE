"use client";

import React from "react";
import type { ConversionPrepareBriefView } from "@/lib/surgical-sales/engagements/buildDebriefPrepareStrategyView";
import type { DebriefPrepareCommercialReadinessDimensionView } from "@/lib/surgical-sales/engagements/buildDebriefPrepareStrategyView";
import type { ProductOpportunityCardView } from "@/lib/surgical-sales/engagements/buildCommercialStrategyBriefView";

function DebriefSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="dpb-coach">
      <h2 className="dpb-coach__title">{title}</h2>
      {subtitle ? <p className="dpb-coach__section-sub">{subtitle}</p> : null}
      {children}
    </section>
  );
}

function QuestionGroup({ label, questions }: { label: string; questions: string[] }) {
  if (questions.length === 0) return null;
  return (
    <div className="dpb-coach__group">
      <p className="dpb-coach__label">{label}</p>
      <ul className="dpb-coach__list">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </div>
  );
}

function ProgramFactsTable({
  facts,
}: {
  facts: ConversionPrepareBriefView["observationProgramSummary"]["programFacts"];
}) {
  return (
    <dl className="dpb-conv__facts">
      {facts.map((fact) => (
        <div key={fact.label} className="dpb-conv__fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MotionPathCard({
  path,
}: {
  path: ConversionPrepareBriefView["nextMotionPaths"][number];
}) {
  return (
    <div className="dpb-coach__path" data-path-name={path.path}>
      <div className="dpb-coach__path-head">
        <span className="dpb-coach__path-name">{path.path}</span>
      </div>
      <p className="dpb-conv__path-when">
        <span className="dpb-coach__label">When to use</span>
        {path.whenToUse}
      </p>
      <p className="dpb-coach__path-note">{path.directorScript}</p>
    </div>
  );
}

function ConditionalProductCard({ product }: { product: ProductOpportunityCardView }) {
  return (
    <div className="dpb-brief__product" data-fit-level={product.fitLevel}>
      <p className="dpb-brief__product-name">{product.displayName}</p>
      <div className="dpb-brief__product-field">
        <p className="dpb-coach__label">Why it may be relevant</p>
        <p className="dpb-coach__body">{product.whyItMayFit}</p>
      </div>
      <div className="dpb-brief__product-field">
        <p className="dpb-coach__label">How to position</p>
        <p className="dpb-coach__body">{product.howToPosition}</p>
      </div>
    </div>
  );
}

function CommercialReadinessDimensionCard({
  dimension,
}: {
  dimension: DebriefPrepareCommercialReadinessDimensionView;
}) {
  return (
    <div className="dpb-coach__dimension" data-dimension-id={dimension.id}>
      <div className="dpb-coach__dimension-head">
        <span className="dpb-coach__dimension-name">{dimension.label}</span>
        <span className="dpb-coach__dimension-score">
          {dimension.score}/100 · {dimension.scoreBandLabel}
        </span>
      </div>
      <p className="dpb-coach__dimension-reasoning">{dimension.reasoning}</p>
    </div>
  );
}

export function PrepareProviderDebriefFullBriefing({ brief }: { brief: ConversionPrepareBriefView }) {
  const evidence = brief.reference;

  return (
    <div
      className="dpb-coach-stack dpb-brief dpb-conv dpb-brief--generated"
      data-testid="debrief-full-briefing"
    >
      <div className="dpb-conv__header">
        <p className="dpb-conv__kicker">{brief.header.kicker}</p>
        <p className="dpb-conv__question">{brief.header.conversionQuestion}</p>
      </div>

      <DebriefSection title="Observation Program Summary" subtitle={brief.observationProgramSummary.subtitle}>
        <ProgramFactsTable facts={brief.observationProgramSummary.programFacts} />
        <div className="dpb-coach__block">
          <p className="dpb-coach__label">Cross-case pattern</p>
          <p className="dpb-coach__opening">{brief.observationProgramSummary.crossCasePattern}</p>
        </div>
      </DebriefSection>

      <DebriefSection title="Conversation Strategy" subtitle={brief.conversationStrategy.subtitle}>
        <div className="dpb-coach__block">
          <p className="dpb-coach__label">Opening</p>
          <p className="dpb-coach__opening">{brief.conversationStrategy.opening}</p>
        </div>
        <QuestionGroup label="Priority probes" questions={brief.conversationStrategy.priorityProbes} />
        <QuestionGroup label="Openness probes" questions={brief.conversationStrategy.opennessProbes} />
      </DebriefSection>

      <DebriefSection title="Next Motion Paths">
        <div className="dpb-coach__paths">
          {brief.nextMotionPaths.map((path) => (
            <MotionPathCard key={path.path} path={path} />
          ))}
        </div>
      </DebriefSection>

      {brief.conditionalProducts.length > 0 ? (
        <DebriefSection title="Product positioning" subtitle={brief.conditionalProductsLabel}>
          <div className="dpb-brief__products">
            {brief.conditionalProducts.map((product) => (
              <ConditionalProductCard
                key={product.displayName}
                product={{
                  productName: product.displayName,
                  displayName: product.displayName,
                  fitLevel: "moderate",
                  fitLevelLabel: "Conditional",
                  isLeadAngle: false,
                  whyItMayFit: product.whyItMayBeRelevant,
                  whatMustBeValidated: "",
                  howToPosition: product.howToPosition,
                  whatNotToSayYet: product.whatNotToSayYet,
                }}
              />
            ))}
          </div>
        </DebriefSection>
      ) : null}

      <details className="dpb-brief__evidence">
        <summary className="dpb-brief__evidence-summary">
          Reference
          <span className="dpb-brief__evidence-hint">Readiness detail and observation notes</span>
        </summary>
        <div className="dpb-brief__evidence-body">
          <div className="dpb-brief__evidence-block">
            <p className="dpb-coach__label">Commercial Readiness</p>
            <div className="dpb-coach__readiness-grid">
              {evidence.commercialReadiness.dimensions.map((dimension) => (
                <CommercialReadinessDimensionCard key={dimension.id} dimension={dimension} />
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
