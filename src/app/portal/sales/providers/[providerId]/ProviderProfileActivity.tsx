"use client";

import Link from "next/link";
import ContactSalesIntelligencePanel from "@/components/sales/ContactSalesIntelligencePanel";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { sc } from "@/components/sales/salesCommandUi";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export function ProviderProfileActivity({
  providerId,
  provider,
  timeline,
  onReload,
  noteFocus,
}: {
  providerId: string;
  provider: Record<string, unknown>;
  timeline: Array<Record<string, unknown>>;
  onReload: () => void;
  noteFocus: boolean;
}) {
  const notes = String(provider.notes || "").trim();
  return (
    <>
      <section>
        <h2 className="provider-profile-section-title">Notes & outreach intelligence</h2>
        <ContactSalesIntelligencePanel
          contactId={providerId}
          contact={provider}
          apiPrefix="/api/portal/sales/surgical-contacts"
          onUpdated={onReload}
          autoFocusQuickNote={noteFocus}
          appearance="portal"
        />
        {notes ? (
          <article className="provider-profile-card" style={{ marginTop: 12, fontSize: 13, whiteSpace: "pre-wrap" }}>
            <strong>Contact notes</strong>
            <p style={{ margin: "6px 0 0" }}>{notes}</p>
          </article>
        ) : null}
      </section>
      <section>
        <h2 className="provider-profile-section-title">Timeline</h2>
        {timeline.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{OPPORTUNITY_UI.providerActivityEmpty}</p>
        ) : (
          timeline.map((e) => <TimelineItem key={`${String(e.kind)}-${String(e.id)}`} entry={e} />)
        )}
      </section>
    </>
  );
}

function TimelineItem({ entry }: { entry: Record<string, unknown> }) {
  const at = entry.at ? new Date(String(entry.at)).toLocaleString() : "";
  const href = entry.href ? String(entry.href) : "";
  const title = String(entry.title || PROVIDER_FIELD_OPS_SECTION.fieldActivity);
  const body = String(entry.body || "").trim();
  const meta = entry.meta ? String(entry.meta) : "";
  return (
    <article className="provider-profile-timeline-item">
      {at ? <time dateTime={String(entry.at)}>{at}</time> : null}
      <p style={{ fontWeight: 800, fontSize: 13, margin: "2px 0 0" }}>
        {href ? (
          <Link href={href} style={sc.linkBrand}>
            {title}
          </Link>
        ) : (
          title
        )}
        {meta ? <span style={{ color: "var(--muted)", fontWeight: 600 }}> · {meta}</span> : null}
      </p>
      {body ? <p style={{ fontSize: 13, margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{body}</p> : null}
    </article>
  );
}
