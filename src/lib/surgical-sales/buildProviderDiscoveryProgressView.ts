/**
 * Discovery progress — single gate: Observation Approved.
 * Optional access intelligence never counts here.
 */

import { buildProviderDiscoveryState } from "@/lib/surgical-sales/buildProviderDiscoveryState";

export type ProviderDiscoveryStatusLabel =
  | "Permission Not Yet Confirmed"
  | "Permission Confirmed";

export type ProviderDiscoveryProgressView = {
  approved: boolean;
  statusLabel: ProviderDiscoveryStatusLabel;
  summaryLabel: ProviderDiscoveryStatusLabel;
};

export function buildProviderDiscoveryProgressView(input: {
  contact: Record<string, unknown>;
}): ProviderDiscoveryProgressView {
  const { discoveryReadiness } = buildProviderDiscoveryState({ contact: input.contact });

  return {
    approved: discoveryReadiness.approved,
    statusLabel: discoveryReadiness.statusLabel,
    summaryLabel: discoveryReadiness.statusLabel,
  };
}
