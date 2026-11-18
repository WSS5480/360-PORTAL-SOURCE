-- Case Intelligence — operational logistics for a single scheduled case (not provider profile).

alter table if exists public.surgical_sales_cases
  add column if not exists case_implants_on_site text null,
  add column if not exists case_trays_sterilization_status text null,
  add column if not exists case_room_assignment text null,
  add column if not exists case_support_coverage text null,
  add column if not exists case_planned_arrival_time text null,
  add column if not exists case_product_needs text null,
  add column if not exists case_operational_risks text null;

comment on column public.surgical_sales_cases.case_implants_on_site is
  'Case intelligence — implants on site for this procedure.';
comment on column public.surgical_sales_cases.case_trays_sterilization_status is
  'Case intelligence — tray / sterilization readiness for this case.';
comment on column public.surgical_sales_cases.case_room_assignment is
  'Case intelligence — OR or room assignment for this case.';
comment on column public.surgical_sales_cases.case_support_coverage is
  'Case intelligence — rep or clinical support coverage for this case.';
comment on column public.surgical_sales_cases.case_planned_arrival_time is
  'Case intelligence — planned arrival time for this case.';
comment on column public.surgical_sales_cases.case_product_needs is
  'Case intelligence — products or sets needed for this case only.';
comment on column public.surgical_sales_cases.case_operational_risks is
  'Case intelligence — operational risks specific to this case day.';

-- Organization intelligence — facility-wide patterns (contact mirror until account jsonb).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_facility_spd_tray_behavior text null,
  add column if not exists provider_facility_logistics_notes text null,
  add column if not exists provider_facility_room_turnover_patterns text null;

comment on column public.surgical_sales_contacts.provider_facility_spd_tray_behavior is
  'Organization intelligence — SPD / tray behavior at this facility.';
comment on column public.surgical_sales_contacts.provider_facility_logistics_notes is
  'Organization intelligence — facility logistics (dock, parking, vendor flow).';
comment on column public.surgical_sales_contacts.provider_facility_room_turnover_patterns is
  'Organization intelligence — room turnover rhythm and constraints site-wide.';
