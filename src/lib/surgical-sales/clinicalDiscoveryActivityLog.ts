import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import {
  PROVIDER_ACTIVITY_CATEGORY_DISCOVERY,
  PROVIDER_ACTIVITY_TYPE_CLINICAL_DISCOVERY_UPDATED,
  logSurgicalProviderActivity,
} from "@/lib/surgical-sales/providerActivityLog";
import { categoryLabelForQuestionKey } from "@/lib/surgical-sales/providerClinicalDiscoveryCaseInsight";
import type { ClinicalDiscoveryQuestionKey } from "@/lib/surgical-sales/providerClinicalDiscovery";

export const CASE_ACTIVITY_CLINICAL_DISCOVERY_INSIGHT_FROM_CASE = "clinical_discovery_insight_from_case";

export const CASE_ACTIVITY_CATEGORY_DISCOVERY = "discovery" as const;

export const CLINICAL_DISCOVERY_PROVIDER_ACTIVITY_TITLE = "Clinical discovery updated";
export const CLINICAL_DISCOVERY_CASE_INSIGHT_ACTIVITY_TITLE = "Provider discovery insight added";

export async function logClinicalDiscoveryAnswerActivities(params: {
  providerId: string;
  userId: string;
  questionKey: ClinicalDiscoveryQuestionKey;
  questionLabel?: string;
  sourceCaseId?: string | null;
  isCreate?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const questionLabel = params.questionLabel ?? categoryLabelForQuestionKey(params.questionKey);
  const discoveryMeta = {
    question_key: params.questionKey,
    question_label: questionLabel,
    provider_id: params.providerId,
    activity_category: PROVIDER_ACTIVITY_CATEGORY_DISCOVERY,
    is_create: Boolean(params.isCreate),
  };

  const providerLog = await logSurgicalProviderActivity({
    providerId: params.providerId,
    userId: params.userId,
    activityType: PROVIDER_ACTIVITY_TYPE_CLINICAL_DISCOVERY_UPDATED,
    body: questionLabel,
    metadataJson: discoveryMeta,
    sourceCaseId: params.sourceCaseId,
  });
  if (!providerLog.ok) return providerLog;

  const caseId = String(params.sourceCaseId || "").trim();
  if (!caseId) return { ok: true };

  const caseLog = await logSurgicalCaseActivity({
    caseId,
    userId: params.userId,
    activityType: CASE_ACTIVITY_CLINICAL_DISCOVERY_INSIGHT_FROM_CASE,
    body: questionLabel,
    metadataJson: {
      ...discoveryMeta,
      source_case_id: caseId,
      activity_category: CASE_ACTIVITY_CATEGORY_DISCOVERY,
    },
  });
  if (!caseLog.ok) return caseLog;

  return { ok: true };
}
