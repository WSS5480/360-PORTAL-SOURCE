// providers-route-v2 — do not add next/dynamic or export const dynamic here
import type { Metadata } from "next";
import PortalSalesProvidersDirectoryClient from "./PortalSalesProvidersDirectoryClient";

export const metadata: Metadata = {
  title: "Providers",
};

export default function PortalSalesProvidersPage() {
  return <PortalSalesProvidersDirectoryClient />;
}
