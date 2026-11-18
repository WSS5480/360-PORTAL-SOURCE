import type { PrepareRisksBarriers } from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";
import { DEPLOYMENT_RISK_LABEL } from "@/lib/surgical-sales/engagements/prepareFlowTerminology";

export function RisksBarriersCard({ risksBarriers }: { risksBarriers: PrepareRisksBarriers }) {
  const { risks } = risksBarriers;

  return (
    <section className="pfm-risks" aria-labelledby="pfm-risks">
      <h2 id="pfm-risks" className="pfm-risks-title">
        {DEPLOYMENT_RISK_LABEL}
      </h2>

      {risks.length > 0 ? (
        <ul className="pfm-risks-list">
          {risks.map((risk) => (
            <li key={risk.key}>{risk.label}</li>
          ))}
        </ul>
      ) : (
        <p className="pfm-risks-empty">No deployment risks flagged from intelligence or opportunity state.</p>
      )}

      <p className="pfm-risks-footnote">Rule-based flags — not AI generated.</p>
    </section>
  );
}
