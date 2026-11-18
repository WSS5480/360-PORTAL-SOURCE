import { Suspense } from "react";
import SalesRevenuePipelineClient from "./SalesRevenuePipelineClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pipeline · Sales Command",
  description: "Booked revenue and upcoming case pipeline for your book of business, with a team view for territory managers.",
};

export default function SalesRevenuePipelinePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--muted)", fontWeight: 700 }}>Loading pipeline…</div>}>
      <SalesRevenuePipelineClient />
    </Suspense>
  );
}
