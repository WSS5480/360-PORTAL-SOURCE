import type { Metadata } from "next";
import PortalObservationFormsClient from "./PortalObservationFormsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Observation forms",
};

export default function PortalObservationFormsPage() {
  return <PortalObservationFormsClient />;
}
