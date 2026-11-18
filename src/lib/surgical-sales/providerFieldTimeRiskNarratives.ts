/**
 * Field time risk — direct procedural lines for overview (why / reducer).
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { overviewRiskFieldDescription } from "@/lib/surgical-sales/providerOverviewRiskCopy";
import { parseIntelligenceCaptureValue } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type {
  ProviderFieldTimeRiskInputId,
  ProviderFieldTimeRiskInputStatus,
  ProviderFieldTimeRiskState,
} from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";

export type FieldTimeRiskInputNarrative = {
  whyFieldTimeFails: string;
  dangerousAssumption: string;
  reducerSignal: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
};

export type FieldTimeRiskComposedNarrative = {
  tierLabel: string;
  whyFieldTimeFails: string;
  dangerousAssumption: string;
  reducers: FieldTimeRiskInputNarrative[];
};

export const FIELD_TIME_RISK_TIER_LABELS: Record<ProviderFieldTimeRiskState, string> = {
  high_wasted_field_risk: "High risk",
  requires_remote_validation_first: "Validate first",
  worth_exploratory_visit: "Moderate risk",
  efficient_field_target: "Clear to deploy",
};

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function accessPathText(contact: Record<string, unknown>): string {
  return fieldText(contact, "provider_observation_access_path");
}

function feasibilityToken(contact: Record<string, unknown>): string | null {
  const raw = fieldText(contact, "provider_observation_feasibility");
  if (!raw) return null;
  const parsed = parseIntelligenceCaptureValue("provider_observation_feasibility", raw);
  return parsed.token ?? parsed.tokens[0] ?? null;
}

function hasCommitteeGate(contact: Record<string, unknown>): boolean {
  const combined = `${accessPathText(contact)} ${fieldText(contact, "provider_observation_feasibility")}`;
  return /\bcommittee\b/i.test(combined);
}

function hasCredentialingGate(contact: Record<string, unknown>): boolean {
  const token = feasibilityToken(contact);
  if (token === "credentialing_required") return true;
  return /\bcredential/i.test(accessPathText(contact));
}

export function narrativeForFieldTimeRiskInput(
  id: ProviderFieldTimeRiskInputId,
  status: ProviderFieldTimeRiskInputStatus,
  contact: Record<string, unknown>,
): FieldTimeRiskInputNarrative {
  const committee = hasCommitteeGate(contact);
  const credentialing = hasCredentialingGate(contact);

  switch (id) {
    case "coordinator_mapped": {
      const dbKey = "provider_observation_coordinator_contact";
      if (status === "blocking" || status === "open") {
        return {
          whyFieldTimeFails: overviewRiskFieldDescription({ dbKey }),
          dangerousAssumption:
            "The front desk may not control which cases post for observation.",
          reducerSignal: "Confirm who owns the OR calendar and posting handoff.",
          sectionId: "observation_readiness",
          dbKey,
        };
      }
      if (status === "partial") {
        return {
          whyFieldTimeFails:
            "Posting may shift without a named scheduling owner on file.",
          dangerousAssumption: "A partial contact may not own OR posting.",
          reducerSignal: "Confirm who owns the OR calendar and case posting.",
          sectionId: "observation_readiness",
          dbKey,
        };
      }
      return {
        whyFieldTimeFails: "Scheduling owner is on file — fewer day-of surprises.",
        dangerousAssumption: "Posting windows can still move — confirm the week before case day.",
        reducerSignal: "Refresh posting cadence before the next booked case.",
        sectionId: "observation_readiness",
        dbKey,
      };
    }

    case "or_access_known": {
      const dbKey = "provider_observation_access_path";
      if (status === "blocking") {
        return {
          whyFieldTimeFails: committee
            ? "OR entry may fail if committee approval is still required."
            : credentialing
              ? "Case day may be wasted until credentialing clears."
              : overviewRiskFieldDescription({ dbKey }),
          dangerousAssumption: "A friendly office chat may not equal OR access on case day.",
          reducerSignal: "Confirm OR access allowance and who approves vendor presence.",
          sectionId: "observation_readiness",
          dbKey: "provider_observation_feasibility",
        };
      }
      if (status === "open") {
        return {
          whyFieldTimeFails: committee
            ? "OR entry may fail if committee controls vendor access."
            : overviewRiskFieldDescription({ dbKey }),
          dangerousAssumption: "Travel may be booked before observation is allowed.",
          reducerSignal: "Confirm OR access path and observation allowance with the scheduler.",
          sectionId: "observation_readiness",
          dbKey,
        };
      }
      if (status === "partial") {
        return {
          whyFieldTimeFails:
            "Observation access may break down if posted restrictions still apply.",
          dangerousAssumption: "Old access notes may not match current OR policy.",
          reducerSignal: "Reconfirm access gates before the next OR visit.",
          sectionId: "observation_readiness",
          dbKey,
        };
      }
      return {
        whyFieldTimeFails: "OR access path is documented — fewer desk surprises.",
        dangerousAssumption: "Access rules can change when incumbents or committee members shift.",
        reducerSignal: "Refresh access path if vendor posture changed.",
        sectionId: "observation_readiness",
        dbKey,
      };
    }

    case "scheduling_clarity": {
      const dbKey = "provider_observation_cadence_preference";
      if (status === "blocking" || status === "open") {
        return {
          whyFieldTimeFails: overviewRiskFieldDescription({
            dbKey: "provider_observation_best_days_case_types",
          }),
          dangerousAssumption: "Any weekday OR list may not include your target cases.",
          reducerSignal: "Confirm posting window and ideal observation cases.",
          sectionId: "observation_readiness",
          dbKey: "provider_observation_best_days_case_types",
        };
      }
      if (status === "partial") {
        return {
          whyFieldTimeFails: overviewRiskFieldDescription({ dbKey }),
          dangerousAssumption: "A convenient visit day may not be a high-signal posting day.",
          reducerSignal: "Confirm posting window before you travel.",
          sectionId: "observation_readiness",
          dbKey: "provider_ideal_observation_cases",
        };
      }
      return {
        whyFieldTimeFails: "Posting rhythm is on file — easier to pick observation days.",
        dangerousAssumption: "This month's posted cases may differ from captured cadence.",
        reducerSignal: "Reconfirm next posting window before booking.",
        sectionId: "observation_readiness",
        dbKey,
      };
    }

    case "observation_feasibility": {
      const dbKey = "provider_observation_feasibility";
      if (status === "blocking") {
        return {
          whyFieldTimeFails: "Observation may fail under current OR access rules.",
          dangerousAssumption: "In-room time may be booked before allowance is confirmed.",
          reducerSignal: "Confirm observation allowance and credentialing path.",
          sectionId: "observation_readiness",
          dbKey,
        };
      }
      if (status === "open") {
        return {
          whyFieldTimeFails: overviewRiskFieldDescription({ dbKey }),
          dangerousAssumption: "Surgeon interest may not equal OR observation permission.",
          reducerSignal: "Confirm whether observation is allowed and under what vendor rules.",
          sectionId: "observation_readiness",
          dbKey,
        };
      }
      return {
        whyFieldTimeFails: "Observation allowance is on file — fewer feasibility surprises.",
        dangerousAssumption: "Allowance may not cover your product category without a refresh.",
        reducerSignal: "Reconfirm allowance if credentialing or vendors changed.",
        sectionId: "observation_readiness",
        dbKey,
      };
    }

    case "workflow_intelligence": {
      const dbKey = "provider_procedure_focus";
      if (status === "open") {
        return {
          whyFieldTimeFails: overviewRiskFieldDescription({ dbKey }),
          dangerousAssumption: "A generic OR day may miss the procedures you need to validate.",
          reducerSignal: "Confirm procedure mix and workflow friction before OR day.",
          sectionId: "clinical_workflow",
          dbKey,
        };
      }
      if (status === "partial") {
        return {
          whyFieldTimeFails: overviewRiskFieldDescription({
            dbKey: "provider_technique_preferences",
          }),
          dangerousAssumption: "SKU focus may be wrong for the modality mix in the room.",
          reducerSignal: "Confirm technique mix on the booked service line.",
          sectionId: "clinical_workflow",
          dbKey: "provider_technique_preferences",
        };
      }
      return {
        whyFieldTimeFails: "Case mix is on file — easier to target the right OR day.",
        dangerousAssumption: "Technique preferences may have shifted since last note.",
        reducerSignal: "Refresh workflow notes after the next observation.",
        sectionId: "clinical_workflow",
        dbKey,
      };
    }

    case "relationship_maturity": {
      const dbKey = "provider_communication_style";
      if (status === "open") {
        return {
          whyFieldTimeFails: overviewRiskFieldDescription({ dbKey: "provider_responsiveness" }),
          dangerousAssumption: "One champion conversation may not carry between case days.",
          reducerSignal: "Confirm office response pattern before heavy travel.",
          sectionId: "relationship_intelligence",
          dbKey: "provider_responsiveness",
        };
      }
      if (status === "partial") {
        return {
          whyFieldTimeFails: "Coordination may break down under OR pressure without a scheduler owner.",
          dangerousAssumption: "Friendly access may not hold when the schedule gets tight.",
          reducerSignal: "Confirm who advances cases and how the office responds.",
          sectionId: "relationship_intelligence",
          dbKey: "influence_level",
        };
      }
      return {
        whyFieldTimeFails: "Relationship signals support follow-through between case days.",
        dangerousAssumption: "Response time may slip during a heavy surgical week.",
        reducerSignal: "Reconfirm engagement rhythm before expansion visits.",
        sectionId: "relationship_intelligence",
        dbKey,
      };
    }

    default:
      return {
        whyFieldTimeFails: overviewRiskFieldDescription({ dbKey: "provider_observation_feasibility" }),
        dangerousAssumption: "OR day may be booked before the weakest gap is confirmed.",
        reducerSignal: "Confirm the top open gap before travel.",
        sectionId: "observation_readiness",
        dbKey: "provider_observation_feasibility",
      };
  }
}

const DRIVER_RANK: Record<ProviderFieldTimeRiskInputStatus, number> = {
  blocking: 4,
  open: 3,
  partial: 2,
  strong: 1,
};

export function composeFieldTimeRiskNarrative(input: {
  state: ProviderFieldTimeRiskState;
  inputs: Array<{ id: ProviderFieldTimeRiskInputId; status: ProviderFieldTimeRiskInputStatus }>;
  contact: Record<string, unknown>;
}): FieldTimeRiskComposedNarrative {
  const enriched = input.inputs.map((row) => ({
    ...row,
    narrative: narrativeForFieldTimeRiskInput(row.id, row.status, input.contact),
  }));

  const drivers = [...enriched]
    .filter((r) => r.status !== "strong")
    .sort((a, b) => DRIVER_RANK[b.status] - DRIVER_RANK[a.status]);

  if (input.state === "efficient_field_target") {
    const refresh = enriched.find((r) => r.status === "partial")?.narrative;
    return {
      tierLabel: FIELD_TIME_RISK_TIER_LABELS.efficient_field_target,
      whyFieldTimeFails: "OR access, scheduling, and case mix look workable for field time.",
      dangerousAssumption:
        refresh?.dangerousAssumption ?? "Posting windows can still move — confirm the week before case day.",
      reducers: refresh
        ? [refresh]
        : [
            {
              whyFieldTimeFails: "",
              dangerousAssumption: "",
              reducerSignal: "Confirm posting window and coordinator handoff the week before OR day.",
              sectionId: "observation_readiness",
              dbKey: "provider_observation_cadence_preference",
            },
          ],
    };
  }

  const primary = drivers[0]?.narrative;
  const secondary = drivers[1]?.narrative;

  if (!primary) {
    return {
      tierLabel: FIELD_TIME_RISK_TIER_LABELS[input.state],
      whyFieldTimeFails: FIELD_TIME_RISK_TIER_LABELS[input.state],
      dangerousAssumption: "OR day may be booked before key gaps are confirmed.",
      reducers: enriched.slice(0, 2).map((r) => r.narrative),
    };
  }

  const reducers = drivers
    .slice(0, 3)
    .map((d) => d.narrative)
    .filter((r, i, arr) => arr.findIndex((x) => x.reducerSignal === r.reducerSignal) === i);

  return {
    tierLabel: FIELD_TIME_RISK_TIER_LABELS[input.state],
    whyFieldTimeFails: primary.whyFieldTimeFails,
    dangerousAssumption: secondary?.dangerousAssumption ?? primary.dangerousAssumption,
    reducers,
  };
}
