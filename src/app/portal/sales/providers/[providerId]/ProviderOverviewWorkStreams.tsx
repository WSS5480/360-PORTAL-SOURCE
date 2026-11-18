"use client";

import Link from "next/link";
import type { ProviderOverviewWorkStream } from "@/lib/surgical-sales/providerOverviewProgressiveDisclosure";
import { ProviderCasesPreview } from "./ProviderCasesPreview";
import { ProviderOpportunitiesPreview } from "./ProviderOpportunitiesPreview";
import type { ProviderProfilePayload } from "./providerProfileTypes";

function WorkStreamGuidance({ stream }: { stream: ProviderOverviewWorkStream }) {
  if (stream.mode !== "guidance" || !stream.guidance) return null;

  return (
    <div className="provider-ops-work-guidance" data-stream={stream.id}>
      <p className="provider-ops-work-guidance-title">{stream.title}</p>
      <p className="provider-ops-work-guidance-text">{stream.guidance}</p>
      {stream.actionHref && stream.actionLabel ? (
        <Link href={stream.actionHref} className="provider-ops-work-guidance-action">
          {stream.actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function ProviderOverviewWorkStreams({
  streams,
  data,
  providerId,
  newCaseHref,
  createOpportunityHref,
}: {
  streams: ProviderOverviewWorkStream[];
  data: ProviderProfilePayload;
  providerId: string;
  newCaseHref: string;
  createOpportunityHref: string;
}) {
  if (streams.length === 0) return null;

  return (
    <div className="provider-ops-work-streams">
      {streams.map((stream) => {
        if (stream.mode === "guidance") {
          return <WorkStreamGuidance key={stream.id} stream={stream} />;
        }
        if (stream.id === "cases") {
          return (
            <div key={stream.id} className="provider-ops-work-data">
              <ProviderCasesPreview
                data={data}
                providerId={providerId}
                newCaseHref={newCaseHref}
                variant="record"
              />
            </div>
          );
        }
        if (stream.id === "initiatives") {
          return (
            <div key={stream.id} className="provider-ops-work-data">
              <ProviderOpportunitiesPreview
                data={data}
                providerId={providerId}
                createOpportunityHref={createOpportunityHref}
                variant="record"
              />
            </div>
          );
        }
        return <WorkStreamGuidance key={stream.id} stream={stream} />;
      })}
    </div>
  );
}
