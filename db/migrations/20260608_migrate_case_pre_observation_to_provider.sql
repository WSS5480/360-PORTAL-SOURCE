-- Backfill provider-level pre-observation planning from legacy case columns.
-- Preserves case columns; only copies into provider fields that are still empty.

with latest_case_planning as (
  select distinct on (c.surgeon_contact_id)
    c.surgeon_contact_id as contact_id,
    nullif(trim(c.pre_observation_impact_opening_statement), '') as pre_observation_impact_opening_statement,
    nullif(trim(c.pre_observation_probes), '') as pre_observation_probes,
    nullif(trim(c.pre_observation_tools_resources), '') as pre_observation_tools_resources,
    nullif(trim(c.pre_observation_value_hypothesis), '') as pre_observation_value_hypothesis,
    nullif(trim(c.pre_observation_planned_close), '') as pre_observation_planned_close,
    nullif(trim(c.pre_observation_additional_notes), '') as pre_observation_additional_notes,
    c.updated_at
  from public.surgical_sales_cases c
  where c.surgeon_contact_id is not null
    and (
      nullif(trim(c.pre_observation_impact_opening_statement), '') is not null
      or nullif(trim(c.pre_observation_probes), '') is not null
      or nullif(trim(c.pre_observation_tools_resources), '') is not null
      or nullif(trim(c.pre_observation_value_hypothesis), '') is not null
      or nullif(trim(c.pre_observation_planned_close), '') is not null
      or nullif(trim(c.pre_observation_additional_notes), '') is not null
    )
  order by c.surgeon_contact_id, c.updated_at desc nulls last
)
update public.surgical_sales_contacts sc
set
  provider_pre_observation_impact_opening_statement = coalesce(
    nullif(trim(sc.provider_pre_observation_impact_opening_statement), ''),
    l.pre_observation_impact_opening_statement
  ),
  provider_pre_observation_probes = coalesce(
    nullif(trim(sc.provider_pre_observation_probes), ''),
    l.pre_observation_probes
  ),
  provider_pre_observation_tools_resources = coalesce(
    nullif(trim(sc.provider_pre_observation_tools_resources), ''),
    l.pre_observation_tools_resources
  ),
  provider_pre_observation_value_hypothesis = coalesce(
    nullif(trim(sc.provider_pre_observation_value_hypothesis), ''),
    l.pre_observation_value_hypothesis
  ),
  provider_pre_observation_planned_close = coalesce(
    nullif(trim(sc.provider_pre_observation_planned_close), ''),
    l.pre_observation_planned_close
  ),
  provider_pre_observation_additional_notes = coalesce(
    nullif(trim(sc.provider_pre_observation_additional_notes), ''),
    l.pre_observation_additional_notes
  ),
  provider_planning_updated_at = coalesce(sc.provider_planning_updated_at, l.updated_at, now())
from latest_case_planning l
where sc.id = l.contact_id
  and (
    nullif(trim(sc.provider_pre_observation_impact_opening_statement), '') is null
    or nullif(trim(sc.provider_pre_observation_probes), '') is null
    or nullif(trim(sc.provider_pre_observation_tools_resources), '') is null
    or nullif(trim(sc.provider_pre_observation_value_hypothesis), '') is null
    or nullif(trim(sc.provider_pre_observation_planned_close), '') is null
    or nullif(trim(sc.provider_pre_observation_additional_notes), '') is null
  );
