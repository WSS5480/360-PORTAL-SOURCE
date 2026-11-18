import { supabaseAdmin } from "@/lib/supabase/admin";

import { PROVIDER_INTELLIGENCE_DB_KEYS } from "@/lib/surgical-sales/providerIntelligenceFields";

import {

  dbColumnForLogicalField,

  PROVIDER_PLANNING_LOGICAL_FIELDS,

  type ProviderPlanningLogicalField,

} from "./workflowTargets";



export async function loadProviderPlanningFieldValues(

  providerId: string,

): Promise<Record<ProviderPlanningLogicalField, string>> {

  const selectKeys = [...new Set([...PROVIDER_INTELLIGENCE_DB_KEYS])];



  const { data, error } = await supabaseAdmin

    .from("surgical_sales_contacts")

    .select(selectKeys.join(", "))

    .eq("id", providerId)

    .maybeSingle();



  if (error || !data) return {} as Record<ProviderPlanningLogicalField, string>;



  const row = data as unknown as Record<string, unknown>;

  const out = {} as Record<ProviderPlanningLogicalField, string>;



  for (const logical of PROVIDER_PLANNING_LOGICAL_FIELDS) {

    const dbKey = dbColumnForLogicalField(logical);

    const val = String(row[dbKey] ?? "").trim();

    if (val && val !== "unknown") out[logical] = val;

  }



  return out;

}


