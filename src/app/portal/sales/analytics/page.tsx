import type { Metadata } from "next";
import PortalSalesAnalyticsClient from "./PortalSalesAnalyticsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function PortalSalesAnalyticsPage() {
  return <PortalSalesAnalyticsClient />;
}
