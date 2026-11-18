"use client";

import { buildProviderRelationshipMemory } from "@/lib/surgical-sales/buildProviderRelationshipMemory";
import type { ProviderProfilePayload } from "./providerProfileTypes";

export function ProviderRelationshipMemory({ data }: { data: ProviderProfilePayload }) {
  const items = buildProviderRelationshipMemory({
    contact: data.provider,
    engagements: data.engagements || [],
    activity_timeline: data.activity_timeline || [],
  });

  return (
    <div className="provider-rel-memory-block">
      <p className="provider-rel-memory-label">Relationship memory</p>
      {items.length === 0 ? (
        <p className="provider-rel-memory-empty">
          Context builds from engagement notes, prep plans, intelligence captures, and activity.
        </p>
      ) : (
        <ul className="provider-rel-memory" aria-label="Relationship memory">
          {items.map((item) => (
            <li key={item.id} className="provider-rel-memory-item">
              <span className="provider-rel-memory-text">{item.text}</span>
              {item.ageLabel ? (
                <span className="provider-rel-memory-age" title={item.at || undefined}>
                  {item.ageLabel}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
