"use client";

import { buildProviderRelationshipSignals } from "@/lib/surgical-sales/buildProviderRelationshipSignals";
import { buildProviderRelationshipSnapshotView } from "@/lib/surgical-sales/buildProviderRelationshipSnapshotView";
import { ProviderRelationshipMemory } from "./ProviderRelationshipMemory";
import type { RelationshipSnapshotField } from "@/lib/surgical-sales/buildProviderRelationshipSnapshotView";
import type { ProviderProfilePayload } from "./providerProfileTypes";

function SnapshotRow({ field }: { field: RelationshipSnapshotField }) {
  return (
    <li className={`provider-rel-row${field.hasValue ? "" : " provider-rel-row--empty"}`}>
      <span className="provider-rel-row-label">{field.label}</span>
      {field.hasValue ? (
        <span className="provider-rel-row-value">{field.value}</span>
      ) : (
        <span className="provider-rel-row-value provider-rel-row-value--hint">{field.emptyHint}</span>
      )}
    </li>
  );
}

export function ProviderRelationshipSnapshot({
  data,
  onUpdateRelationshipStrategy,
  onManageSupport,
}: {
  data: ProviderProfilePayload;
  onUpdateRelationshipStrategy: (sectionId: string) => void;
  onManageSupport?: () => void;
}) {
  const p = data.provider!;
  const view = buildProviderRelationshipSnapshotView({ contact: p });
  const signals = buildProviderRelationshipSignals({
    contact: p,
    snapshot: view,
    planning: data.planning_completion,
    engagements: data.engagements || [],
  });
  const relatedCount = (data.related_contacts || []).length;

  return (
    <section className="provider-cc-section" aria-labelledby="provider-cc-rel-title">
      <div className="provider-cc-section-head">
        <h2 id="provider-cc-rel-title" className="provider-cc-section-title">
          Relationship
        </h2>
        {onManageSupport ? (
          <button type="button" className="provider-cc-text-btn" onClick={onManageSupport}>
            {relatedCount > 0 ? `Network (${relatedCount})` : "Network"}
          </button>
        ) : null}
      </div>

      <div className="provider-rel-panel">
        {signals.length > 0 ? (
          <div className="provider-rel-signals-block">
            <p className="provider-rel-signals-label">Relationship signals</p>
            <ul className="provider-rel-signals" aria-label="Relationship signals">
              {signals.map((signal) => (
                <li key={signal.id} className="provider-rel-signal">
                  {signal.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ProviderRelationshipMemory data={data} />

        <ul className="provider-rel-rows" aria-label="Relationship intelligence">
          {view.fields.map((field) => (
            <SnapshotRow key={field.id} field={field} />
          ))}
        </ul>

        <button
          type="button"
          className="provider-rel-cta provider-rel-cta--compact"
          onClick={() => onUpdateRelationshipStrategy(view.updateSectionId)}
        >
          Update Relationship Strategy
        </button>
      </div>
    </section>
  );
}
