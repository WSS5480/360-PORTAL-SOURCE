"use client";

import { AiNoteCaptureProvider } from "@/components/sales/aiNoteCapture/AiNoteCaptureContext";
import PortalSalesProviderProfileClient from "@/app/portal/sales/providers/[providerId]/PortalSalesProviderProfileClient";

export default function AdminProviderCommandClient({
  providerId,
  apiBase,
}: {
  providerId: string;
  apiBase: string;
}) {
  return (
    <AiNoteCaptureProvider>
      <PortalSalesProviderProfileClient
        providerId={providerId}
        readOnly
        apiBase={apiBase}
        backHref="/admin/sales/team-dashboard"
        backLabel="← Team dashboard"
      />
    </AiNoteCaptureProvider>
  );
}
