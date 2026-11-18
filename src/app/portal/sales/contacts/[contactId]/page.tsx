import { Suspense } from "react";
import type { Metadata } from "next";
import PortalSalesContactDetailClient from "./PortalSalesContactDetailClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact" };

export default async function PortalSalesContactDetailPage(props: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await props.params;
  return (
    <Suspense fallback={<div style={{ color: "var(--muted)" }}>Loading contact…</div>}>
      <PortalSalesContactDetailClient contactId={contactId} />
    </Suspense>
  );
}

