import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  buildProviderOverviewExecutionCtas,
  pickActiveObservationCase,
  resolveProviderOverviewExecutionCtaPhase,
} from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { hasObservationScheduled, type PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { resolveObservationPermissionStage } from "@/lib/surgical-sales/observationPermissionModel";

const PHASE_NEXT_MOVE: Record<
  ReturnType<typeof resolveProviderOverviewExecutionCtaPhase>,
  string
> = {
  permission_pending: "Confirm observation permission when you have a signal.",
  permission_confirmed: "Add the first observation case while permission is fresh.",
  observe: "Add or complete observation work to capture field intelligence.",
  observation_scheduled: "Open the observation case and capture field intelligence.",
  debrief: "Complete the provider debrief and confirm product fit.",
  debrief_ready: "Schedule provider debrief to validate observed workflow and product opportunities.",
  evaluation: "Advance the evaluation path with the next scheduled activity.",
  commitment: "Confirm structured use and the owner for the next step.",
  outcomes: "Track product use and outcome signals after commitment.",
};

export function buildProviderOverviewRecommendedNextMove(input: {
  contact: Record<string, unknown>;
  providerId: string;
  newEngagementHref: string;
  noteHref: string;
  intelligenceHref: string;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): string {
  if (isProviderSalesCustomer(input.contact)) return "";
  const gateInput: PathwayGateInput = {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  };

  const ctas = buildProviderOverviewExecutionCtas(input);
  if (ctas.guidanceLine?.trim()) {
    return scanLine(ctas.guidanceLine, 96);
  }

  const phase = resolveProviderOverviewExecutionCtaPhase(gateInput);
  const stage = resolveObservationPermissionStage(gateInput);

  if (phase === "debrief_ready") {
    return scanLine(PHASE_NEXT_MOVE.debrief_ready, 96);
  }
  if (phase === "observation_scheduled" || (hasObservationScheduled(gateInput) && pickActiveObservationCase(input.cases))) {
    return scanLine(PHASE_NEXT_MOVE.observation_scheduled, 96);
  }
  if (phase === "permission_confirmed" || stage === "permission_confirmed") {
    return scanLine(PHASE_NEXT_MOVE.permission_confirmed, 96);
  }
  if (stage === "interested") {
    return scanLine("Light follow-up — confirm observation permission when it feels natural.", 96);
  }
  if (stage === "unknown") {
    return scanLine("Log what you learn on your next touch — permission status is the first unlock.", 96);
  }
  return scanLine(PHASE_NEXT_MOVE.permission_pending, 96);
}
