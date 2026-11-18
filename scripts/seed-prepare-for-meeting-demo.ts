/**
 * Seed realistic surgical/device CRM demo data for Prepare For Meeting testing.
 *
 * Creates 3 demo providers (Smith, Patel, Johnson) with intelligence, engagements,
 * opportunities, and activity events — all owned by the given internal sales rep.
 *
 * Run:
 *   npx tsx scripts/seed-prepare-for-meeting-demo.ts <sales-rep-user-uuid>
 *
 * Re-run safe: deletes prior rows with the fixed demo IDs, then re-inserts.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const userIdArg = process.argv.slice(2).find((a) => UUID_RE.test(a))?.trim();
if (!userIdArg) {
  console.error("Usage: npx tsx scripts/seed-prepare-for-meeting-demo.ts <sales-rep-user-uuid>");
  process.exit(1);
}
const salesRepId: string = userIdArg;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Stable demo IDs — do not change without updating docs. */
const DEMO = {
  orgs: {
    smith: "a1111111-1111-4111-8111-111111110001",
    patel: "a1111111-1111-4111-8111-111111110002",
    johnson: "a1111111-1111-4111-8111-111111110003",
  },
  providers: {
    smith: "b1111111-1111-4111-8111-111111110001",
    patel: "b1111111-1111-4111-8111-111111110002",
    johnson: "b1111111-1111-4111-8111-111111110003",
  },
  opps: {
    smith: "c1111111-1111-4111-8111-111111110001",
    patel: "c1111111-1111-4111-8111-111111110002",
    johnson: "c1111111-1111-4111-8111-111111110003",
  },
  engagements: {
    smithUpcoming: "d1111111-1111-4111-8111-111111110001",
    smithPast: "d1111111-1111-4111-8111-111111110002",
    patelUpcoming: "d1111111-1111-4111-8111-111111110003",
    patelPast: "d1111111-1111-4111-8111-111111110004",
    johnsonUpcoming: "d1111111-1111-4111-8111-111111110005",
    johnsonPast: "d1111111-1111-4111-8111-111111110006",
  },
} as const;

const allEngagementIds = Object.values(DEMO.engagements);
const allProviderIds = Object.values(DEMO.providers);
const allOrgIds = Object.values(DEMO.orgs);
const allOppIds = Object.values(DEMO.opps);

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function deleteDemoRows() {
  console.log("Removing prior demo rows (fixed IDs)…");
  await supabase.from("surgical_sales_engagement_activities").delete().in("engagement_id", allEngagementIds);
  await supabase.from("surgical_sales_provider_activities").delete().in("provider_id", allProviderIds);
  await supabase.from("surgical_sales_engagements").delete().in("id", allEngagementIds);
  await supabase.from("sales_opportunities").delete().in("id", allOppIds);
  await supabase.from("surgical_sales_contact_organizations").delete().in("contact_id", allProviderIds);
  await supabase.from("surgical_sales_contacts").delete().in("id", allProviderIds);
  await supabase.from("account_pricing").delete().in("account_id", allOrgIds);
  await supabase.from("accounts").delete().in("id", allOrgIds);
}

async function insertOrganizations() {
  const orgs = [
    {
      id: DEMO.orgs.smith,
      name: "Meridian General Hospital — Surgical Services",
      surgical_crm_type: "hospital",
      surgical_crm_status: "active",
      surgical_crm_billing_city: "Nashville",
      surgical_crm_billing_state: "TN",
      surgical_crm_notes:
        "Robotic program mature; value analysis committee meets monthly. Preference card changes need supply chain + OR manager sign-off.",
      surgical_crm_created_by: salesRepId,
    },
    {
      id: DEMO.orgs.patel,
      name: "Coastal Wound & Vascular Center",
      surgical_crm_type: "asc",
      surgical_crm_status: "active",
      surgical_crm_billing_city: "Charleston",
      surgical_crm_billing_state: "SC",
      surgical_crm_notes:
        "High-volume limb preservation clinic. Biologic committee reviews new skin substitutes quarterly.",
      surgical_crm_created_by: salesRepId,
    },
    {
      id: DEMO.orgs.johnson,
      name: "Summit Orthopedic Institute",
      surgical_crm_type: "asc",
      surgical_crm_status: "prospect",
      surgical_crm_billing_city: "Denver",
      surgical_crm_billing_state: "CO",
      surgical_crm_notes:
        "Foot & ankle + hand service lines co-located. Vendor fair scheduled Q3 — extremity fixation is a focus category.",
      surgical_crm_created_by: salesRepId,
    },
  ];

  const { error } = await supabase.from("accounts").upsert(
    orgs.map((o) => ({
      ...o,
      discount_percent: 0,
      surgical_crm_updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" },
  );
  if (error) throw new Error(`accounts: ${error.message}`);

  for (const id of allOrgIds) {
    const { error: pe } = await supabase.from("account_pricing").upsert(
      {
        account_id: id,
        discount_percent: 0,
        payment_terms_label: "Net 30 (after delivery)",
        payment_terms_days: 30,
        bulk_enabled: false,
        bulk_rules: [],
        virtual_warehouse_enabled: false,
      },
      { onConflict: "account_id" },
    );
    if (pe && !/duplicate|unique/i.test(pe.message)) throw new Error(`account_pricing: ${pe.message}`);
  }
  console.log("  ✓ 3 demo organizations");
}

type ProviderSeed = {
  id: string;
  orgId: string;
  first_name: string;
  last_name: string;
  title: string;
  specialty: string;
  relationship_strength: string;
  influence_level: string;
  provider_relationship_stage: string;
  provider_crm_status: string;
  provider_communication_style: string;
  provider_procedure_focus: string;
  provider_technique_preferences: string;
  provider_product_interests: string;
  provider_current_vendors: string;
  provider_competitive_products: string;
  provider_evaluation_openness: string;
  provider_or_team_dynamics: string;
  provider_preference_card_signals: string;
  provider_rep_strategy_notes: string;
  access_notes: string;
  personality_notes: string;
  provider_pre_observation_probes: string;
  provider_first_observation_questions: string;
  preferred_hospital: string;
};

async function insertProviders(rows: ProviderSeed[]) {
  const now = new Date().toISOString();
  for (const p of rows) {
    const { error } = await supabase.from("surgical_sales_contacts").upsert(
      {
        id: p.id,
        role_type: "surgeon",
        first_name: p.first_name,
        last_name: p.last_name,
        title: p.title,
        organization_id: p.orgId,
        account_id: p.orgId,
        influence_level: p.influence_level,
        relationship_strength: p.relationship_strength,
        provider_relationship_stage: p.provider_relationship_stage,
        provider_crm_status: p.provider_crm_status,
        provider_onboarding_status: "active",
        provider_communication_style: p.provider_communication_style,
        provider_procedure_focus: p.provider_procedure_focus,
        provider_technique_preferences: p.provider_technique_preferences,
        provider_product_interests: p.provider_product_interests,
        provider_current_vendors: p.provider_current_vendors,
        provider_competitive_products: p.provider_competitive_products,
        provider_evaluation_openness: p.provider_evaluation_openness,
        provider_or_team_dynamics: p.provider_or_team_dynamics,
        provider_preference_card_signals: p.provider_preference_card_signals,
        provider_rep_strategy_notes: p.provider_rep_strategy_notes,
        provider_pre_observation_probes: p.provider_pre_observation_probes,
        provider_first_observation_questions: p.provider_first_observation_questions,
        access_notes: p.access_notes,
        personality_notes: p.personality_notes,
        preferred_contact_method: "in_person",
        best_time_to_contact: "Tue–Thu 7:00–8:30 AM before first case",
        last_contacted_at: isoDaysAgo(12),
        next_follow_up_at: isoDaysAgo(-5),
        provider_planning_updated_at: now,
        created_by: salesRepId,
        created_by_user_id: salesRepId,
        updated_at: now,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(`contact ${p.last_name}: ${error.message}`);

    const { error: linkErr } = await supabase.from("surgical_sales_contact_organizations").upsert(
      {
        contact_id: p.id,
        account_id: p.orgId,
        role_type: "surgeon",
        is_primary_org: true,
        is_active: true,
        specialty: p.specialty,
        influence_level: p.influence_level,
        preferred_hospital: p.preferred_hospital,
        relationship_notes: p.provider_rep_strategy_notes.slice(0, 500),
        created_by: salesRepId,
        updated_at: now,
      },
      { onConflict: "contact_id,account_id" },
    );
    if (linkErr) throw new Error(`org link ${p.last_name}: ${linkErr.message}`);
  }
  console.log("  ✓ 3 demo providers");
}

async function insertOpportunities() {
  const opps = [
    {
      id: DEMO.opps.smith,
      account_id: DEMO.orgs.smith,
      account_name: "Meridian General Hospital — Surgical Services",
      physician_name: "Michael Smith, MD",
      surgeon_contact_id: DEMO.providers.smith,
      owner_user_id: salesRepId,
      stage: "evaluation_planned",
      product_line: "TelaBio",
      procedure_focus: "Robotic ventral/incisional hernia — fascial closure & fixation",
      adoption_goal: "Pilot low-profile fixation on 5 complex robotic hernias; document OR time vs current tray",
      evaluation_needed: true,
      competitive_product: "Medtronic Symbotic fascial closure; Ethicon Echelon for open conversions",
      next_action: "Confirm observation date with robotics coordinator; bring tray comparison one-pager",
      value_cents: 18500000,
      close_date: daysFromNow(75),
    },
    {
      id: DEMO.opps.patel,
      account_id: DEMO.orgs.patel,
      account_name: "Coastal Wound & Vascular Center",
      physician_name: "Anita Patel, MD",
      surgeon_contact_id: DEMO.providers.patel,
      owner_user_id: salesRepId,
      stage: "clinical_validation",
      product_line: "BioTissue",
      procedure_focus: "Diabetic foot ulcer & post-debridement biologic application",
      adoption_goal: "Secure 10-patient evaluation with weekly wound photos; compare heal rate vs current amniotic",
      evaluation_needed: true,
      competitive_product: "Organogenesis Apligraf; MiMedx placental graft in clinic formulary",
      next_action: "Deliver VAC dressing compatibility sheet; align with wound care director on documentation template",
      value_cents: 9200000,
      close_date: daysFromNow(45),
    },
    {
      id: DEMO.opps.johnson,
      account_id: DEMO.orgs.johnson,
      account_name: "Summit Orthopedic Institute",
      physician_name: "James Johnson, MD",
      surgeon_contact_id: DEMO.providers.johnson,
      owner_user_id: salesRepId,
      stage: "discovery",
      product_line: "Skeletal Dynamics",
      procedure_focus: "Ankle fracture ORIF & distal radius plating — extremity fixation",
      adoption_goal: "Win distal radius plate evaluation ahead of vendor fair; target 15 cases",
      evaluation_needed: true,
      competitive_product: "DePuy Synthes VARIAX distal radius; Stryker ankle plating",
      next_action: "Schedule cadaver lab demo for hand fellows; send sterile field footprint comparison",
      value_cents: 24000000,
      close_date: daysFromNow(90),
    },
  ];

  const { error } = await supabase.from("sales_opportunities").upsert(
    opps.map((o) => ({ ...o, updated_at: new Date().toISOString() })),
    { onConflict: "id" },
  );
  if (error) throw new Error(`opportunities: ${error.message}`);
  console.log("  ✓ 3 adoption initiatives (opportunities)");
}

type EngagementSeed = {
  id: string;
  provider_id: string;
  organization_id: string;
  opportunity_id: string;
  engagement_type: string;
  status: string;
  title: string;
  engagement_date: string;
  scheduled_at?: string | null;
  engagement_workflow_mode?: string;
  observation_goal?: string;
  pre_observation_impact_opening_statement?: string;
  pre_observation_probes?: string;
  pre_observation_tools_resources?: string;
  pre_observation_value_hypothesis?: string;
  pre_observation_planned_close?: string;
  pre_observation_additional_notes?: string;
  engagement_purpose?: string;
  next_action?: string;
  adoption_signals_to_watch?: string;
  products_to_demonstrate?: string;
  notes?: string;
};

async function insertEngagements(rows: EngagementSeed[]) {
  const { error } = await supabase.from("surgical_sales_engagements").upsert(
    rows.map((e) => ({
      ...e,
      sales_rep_id: salesRepId,
      pre_call_hospital_name: null,
      pre_call_surgeon_name: null,
      updated_at: new Date().toISOString(),
      created_at: isoDaysAgo(30),
    })),
    { onConflict: "id" },
  );
  if (error) throw new Error(`engagements: ${error.message}`);
  console.log(`  ✓ ${rows.length} engagements`);
}

async function insertActivities() {
  const providerActs = [
    {
      provider_id: DEMO.providers.smith,
      activity_type: "clinical_discovery_updated",
      body: "Documented fascial closure technique on robotic TAPP — uses curved needle driver, asks for low-profile tacks on defects >8 cm.",
      metadata_json: {
        activity_category: "discovery",
        question_label: "Closure / fixation preference",
      },
      created_at: isoDaysAgo(9),
    },
    {
      provider_id: DEMO.providers.smith,
      activity_type: "clinical_discovery_updated",
      body: "Robotics coordinator confirmed Thursday 7:15 AM slot available for observation; camera stack already on Xi.",
      metadata_json: { activity_category: "general" },
      created_at: isoDaysAgo(3),
    },
    {
      provider_id: DEMO.providers.patel,
      activity_type: "clinical_discovery_updated",
      body: "Clinic uses weekly photo protocol; wants graft that plays well with NPWT — current amniotic requires 48h off VAC.",
      metadata_json: {
        activity_category: "discovery",
        question_label: "Dressing / NPWT compatibility",
      },
      created_at: isoDaysAgo(7),
    },
    {
      provider_id: DEMO.providers.patel,
      activity_type: "clinical_discovery_updated",
      body: "Wound care director (DM) open to side-by-side if heal-rate data is presented at committee — meeting in 3 weeks.",
      metadata_json: { activity_category: "general" },
      created_at: isoDaysAgo(2),
    },
    {
      provider_id: DEMO.providers.johnson,
      activity_type: "clinical_discovery_updated",
      body: "Hand fellow interested in volar plating workshop; Johnson wants to see screw density vs VARIAX on osteopenic radius.",
      metadata_json: {
        activity_category: "discovery",
        question_label: "Distal radius fixation",
      },
      created_at: isoDaysAgo(11),
    },
    {
      provider_id: DEMO.providers.johnson,
      activity_type: "clinical_discovery_updated",
      body: "Purchasing flagged upcoming vendor fair — any new plate system needs sterile field footprint one-pager before booth invite.",
      metadata_json: { activity_category: "general" },
      created_at: isoDaysAgo(4),
    },
  ];

  const engagementActs = [
    {
      engagement_id: DEMO.engagements.smithUpcoming,
      activity_type: "pre_call_plan_updated",
      body: "Pre-Call Plan updated: probes added for tack profile and OR time impact.",
      created_at: isoDaysAgo(2),
    },
    {
      engagement_id: DEMO.engagements.smithUpcoming,
      activity_type: "engagement_updated",
      body: "Observation request scheduled with robotics coordinator.",
      created_at: isoDaysAgo(1),
    },
    {
      engagement_id: DEMO.engagements.patelUpcoming,
      activity_type: "pre_call_plan_updated",
      body: "Office visit plan: biologic application workflow + photo documentation checklist.",
      created_at: isoDaysAgo(3),
    },
    {
      engagement_id: DEMO.engagements.patelPast,
      activity_type: "engagement_completed",
      body: "Intro call completed — agreed to share heal-rate spreadsheet template.",
      created_at: isoDaysAgo(18),
    },
    {
      engagement_id: DEMO.engagements.johnsonUpcoming,
      activity_type: "pre_call_plan_updated",
      body: "Product demo plan: distal radius & ankle trays; fellows invited.",
      created_at: isoDaysAgo(5),
    },
    {
      engagement_id: DEMO.engagements.johnsonPast,
      activity_type: "engagement_updated",
      body: "OR visit — counted 4 ankle ORIFs using competitor plates; no conversions yet.",
      created_at: isoDaysAgo(14),
    },
  ];

  for (const a of providerActs) {
    const { error } = await supabase.from("surgical_sales_provider_activities").insert({
      ...a,
      user_id: salesRepId,
    });
    if (error) throw new Error(`provider activity: ${error.message}`);
  }

  for (const a of engagementActs) {
    const { error } = await supabase.from("surgical_sales_engagement_activities").insert({
      ...a,
      user_id: salesRepId,
      metadata_json: {},
    });
    if (error) throw new Error(`engagement activity: ${error.message}`);
  }
  console.log("  ✓ provider + engagement activity events");
}

async function main() {
  console.log(`Seeding Prepare For Meeting demo data for rep ${salesRepId}…\n`);

  await deleteDemoRows();
  await insertOrganizations();

  await insertProviders([
    {
      id: DEMO.providers.smith,
      orgId: DEMO.orgs.smith,
      first_name: "Michael",
      last_name: "Smith",
      title: "MD, FACS",
      specialty: "General Surgery",
      relationship_strength: "medium",
      influence_level: "decision_maker",
      provider_relationship_stage: "engagement_active",
      provider_crm_status: "active",
      preferred_hospital: "Meridian General — Main OR",
      provider_communication_style:
        "Direct and data-driven; responds to OR time and conversion risk. Avoid long lunches — prefers 10-minute huddle at locker board.",
      provider_procedure_focus:
        "Robotic ventral & incisional hernia (~8 complex cases/month); open conversions for hostile abdomen.",
      provider_technique_preferences:
        "Extra robotic port for liver retraction on large defects; interested in low-profile fascial fixation vs percutaneous tacks.",
      provider_product_interests:
        "Hernia mesh alternatives with less puckering; fascial closure devices compatible with Xi docking.",
      provider_current_vendors:
        "Intuitive Xi system contract; Medtronic mesh trays on preference card; occasional Ethicon Echelon for open cases.",
      provider_competitive_products:
        "Medtronic Symbotic workflow for fascial closure; Ethicon Prolene mesh rolls in hybrid cases.",
      provider_evaluation_openness:
        "Will trial if OR time neutral and robotics coordinator signs off; needs supply chain sample for preference card trial.",
      provider_or_team_dynamics:
        "Charge RN (Jen) controls tray builds; robotics coordinator gates observation slots; fellow often closes fascia.",
      provider_preference_card_signals:
        "Symbotic tacks on card for defects >6 cm; open tray still lists Prolene onlay — opportunity to consolidate.",
      provider_rep_strategy_notes:
        "Champion if we prove tack profile reduces post-op seroma concerns he raised at M&M. Bring tray comparison, not brochure.",
      access_notes:
        "Text coordinator first — surgeon rarely answers between cases. Email OK for journal articles / OR time studies.",
      personality_notes:
        "3/12: M&M question on seroma after robotic TAPP — follow up with low-profile fixation data.",
      provider_pre_observation_probes:
        "• Where do you switch from percutaneous tacks to suture closure?\n• Average skin-to-skin on robotic TAPP >8 cm?\n• Who builds the hernia tray — RN or coordinator?",
      provider_first_observation_questions:
        "Document port placement, fascial closure device, and time from defect closure to desufflation.",
    },
    {
      id: DEMO.providers.patel,
      orgId: DEMO.orgs.patel,
      first_name: "Anita",
      last_name: "Patel",
      title: "MD, CWSP",
      specialty: "Wound Care",
      relationship_strength: "strong",
      influence_level: "influencer",
      provider_relationship_stage: "active_relationship",
      provider_crm_status: "active",
      preferred_hospital: "Coastal Wound Clinic — Procedure Suite",
      provider_communication_style:
        "Collaborative; shares wound photos freely. Wants clinical, not marketing — lead with heal-rate curves and dressing compatibility.",
      provider_procedure_focus:
        "Diabetic foot ulcer debridement + biologic application; ~25 advanced wound visits/week.",
      provider_technique_preferences:
        "Sharp debridement then graft; prefers grafts that stay adherent under NPWT without 48h VAC holiday.",
      provider_product_interests:
        "Advanced biologics for DFU; amniotic alternatives with better handling in clinic procedure room.",
      provider_current_vendors:
        "Organogenesis Apligraf on formulary; clinic stocks MiMedx placental graft for select payers.",
      provider_competitive_products:
        "Organogenesis & MiMedx dominate committee — need head-to-head heal-rate narrative.",
      provider_evaluation_openness:
        "High — if VAC-compatible and wound director approves documentation template for committee.",
      provider_or_team_dynamics:
        "Wound care director (DM) chairs biologic committee; Patel influences product selection but does not sole-sign.",
      provider_preference_card_signals:
        "No hospital preference card — clinic formulary list; committee packet due in 3 weeks.",
      provider_rep_strategy_notes:
        "Pair every visit with documentation template for committee. Bring NPWT compatibility lab sheet.",
      access_notes:
        "Clinic admin blocks vendor days Tue AM — book through Linda. Text Patel for urgent product question only.",
      personality_notes:
        "2/28: Asked for VAC compatibility sheet — sent 3/1; confirm receipt before office visit.",
      provider_pre_observation_probes:
        "• NPWT dwell time off graft before re-application?\n• Photo angles required for committee?\n• Payer mix for DFU biologics?",
      provider_first_observation_questions:
        "Capture graft handling time, adherence at 1 week, and patient pain scores post-application.",
    },
    {
      id: DEMO.providers.johnson,
      orgId: DEMO.orgs.johnson,
      first_name: "James",
      last_name: "Johnson",
      title: "MD",
      specialty: "Orthopedics",
      relationship_strength: "weak",
      influence_level: "decision_maker",
      provider_relationship_stage: "pre_call_planning",
      provider_crm_status: "prospect",
      preferred_hospital: "Summit Orthopedic Institute — ASC OR 2",
      provider_communication_style:
        "Analytical, compares screw density and sterile field footprint. Fellows influence distal radius choices.",
      provider_procedure_focus:
        "Ankle fracture ORIF and distal radius volar plating; extremity fixation focus.",
      provider_technique_preferences:
        "Low-profile volar plates for osteopenic radius; ankle plates with fewer screw steps in trauma bay.",
      provider_product_interests:
        "Extremity plating with smaller instrument footprint; interested in distal radius evaluation before vendor fair.",
      provider_current_vendors:
        "DePuy Synthes VARIAX distal radius system; Stryker ankle trauma trays on contract.",
      provider_competitive_products:
        "Stryker ankle plating standard; DePuy holds distal radius — need differentiation on osteopenic bone.",
      provider_evaluation_openness:
        "Cautious — purchasing wants sterile field comparison; will run 15-case eval if fellows buy in.",
      provider_or_team_dynamics:
        "Hand fellows pick plate vendor for night trauma; purchasing gates new sets until vendor fair.",
      provider_preference_card_signals:
        "ASC preference cards frozen until Q3 vendor fair — evaluation trays must be consignment.",
      provider_rep_strategy_notes:
        "Lead with cadaver lab for fellows, not Johnson alone. Footprint one-pager is gate for booth invite.",
      access_notes:
        "New relationship — intro through trauma medical director. Email better than cold OR walk-in.",
      personality_notes:
        "3/5: OR visit — 4 ankle ORIFs on Stryker; Johnson asked about smaller radius tray.",
      provider_pre_observation_probes:
        "• Screw density choice on osteopenic volar radius?\n• Tray turnover time trauma bay vs clinic?\n• Vendor fair criteria for new extremity lines?",
      provider_first_observation_questions:
        "Note plate profile, screw count, and fluoro time on distal radius & ankle cases.",
    },
  ]);

  await insertOpportunities();

  const upcomingDate = daysFromNow(4);
  const upcomingScheduled = new Date();
  upcomingScheduled.setDate(upcomingScheduled.getDate() + 4);
  upcomingScheduled.setHours(7, 30, 0, 0);

  await insertEngagements([
    {
      id: DEMO.engagements.smithUpcoming,
      provider_id: DEMO.providers.smith,
      organization_id: DEMO.orgs.smith,
      opportunity_id: DEMO.opps.smith,
      engagement_type: "observation_request",
      status: "planned",
      title: "Robotic TAPP observation — fascial closure review",
      engagement_date: upcomingDate,
      scheduled_at: upcomingScheduled.toISOString(),
      engagement_workflow_mode: "strategic",
      observation_goal:
        "SMART: Observe 2 robotic ventral hernia closures and document fascial closure method, tack profile, and skin-to-skin time vs current Symbotic workflow by end of visit.",
      pre_observation_impact_opening_statement:
        "You mentioned seroma concerns at M&M — we want to see if a lower-profile fixation approach fits your closure algorithm without adding dock time.",
      pre_observation_probes:
        "• When do you switch from percutaneous tacks to suture?\n• Who builds the hernia tray?\n• What would convince you to trial a new fixation on the preference card?",
      pre_observation_tools_resources:
        "Tray comparison one-pager; OR time study reprint; sample low-profile fixation for coordinator review.",
      pre_observation_value_hypothesis:
        "If tack profile reduces seroma risk without adding closure time, coordinator will pilot on next complex case list.",
      pre_observation_planned_close:
        "Agree on 5-case evaluation with robotics coordinator and supply chain sample request.",
      adoption_signals_to_watch:
        "Fellow closing fascia; coordinator pushback on tray change; any mention of Symbotic training renewal.",
      next_action: "Send tray comparison PDF tonight; confirm 7:15 AM meet at locker board.",
    },
    {
      id: DEMO.engagements.smithPast,
      provider_id: DEMO.providers.smith,
      organization_id: DEMO.orgs.smith,
      opportunity_id: DEMO.opps.smith,
      engagement_type: "intro_call",
      status: "completed",
      title: "Intro — robotic hernia program",
      engagement_date: daysAgo(21),
      engagement_workflow_mode: "strategic",
      notes: "Aligned on observation request; seroma question surfaced from M&M.",
      observation_goal: "Establish observation path and identify closure preferences.",
    },
    {
      id: DEMO.engagements.patelUpcoming,
      provider_id: DEMO.providers.patel,
      organization_id: DEMO.orgs.patel,
      opportunity_id: DEMO.opps.patel,
      engagement_type: "office_visit_360",
      status: "planned",
      title: "Clinic visit — biologic application workflow",
      engagement_date: daysFromNow(6),
      engagement_workflow_mode: "strategic",
      observation_goal:
        "SMART: Walk 2 DFU biologic applications in clinic; confirm NPWT compatibility and photo documentation meets committee requirements.",
      pre_observation_impact_opening_statement:
        "You asked for heal-rate data that matches your photo protocol — we will map our biologic to your committee template, not generic brochures.",
      pre_observation_probes:
        "• VAC holiday length with current amniotic?\n• Committee photo checklist?\n• Payer mix that blocks Organogenesis?",
      pre_observation_tools_resources: "NPWT compatibility sheet; heal-rate curve vs Apligraf; committee documentation template.",
      pre_observation_value_hypothesis:
        "If graft stays adherent under NPWT, clinic can reduce VAC off-time and strengthen committee packet.",
      pre_observation_planned_close:
        "Schedule 10-patient evaluation start date; wound director signs documentation template.",
      products_to_demonstrate: "BioTissue graft handling kit; sample sizing for forefoot ulcers.",
      adoption_signals_to_watch: "Director attendance; mention of MiMedx contract renewal.",
      next_action: "Confirm Linda booked procedure room Tue 9 AM.",
    },
    {
      id: DEMO.engagements.patelPast,
      provider_id: DEMO.providers.patel,
      organization_id: DEMO.orgs.patel,
      opportunity_id: DEMO.opps.patel,
      engagement_type: "intro_call",
      status: "completed",
      title: "Intro — DFU biologic evaluation",
      engagement_date: daysAgo(28),
      engagement_purpose: "Introduce BioTissue line; agree on documentation needs for committee.",
      notes: "Patel shared photo protocol; director wants side-by-side heal-rate data.",
    },
    {
      id: DEMO.engagements.johnsonUpcoming,
      provider_id: DEMO.providers.johnson,
      organization_id: DEMO.orgs.johnson,
      opportunity_id: DEMO.opps.johnson,
      engagement_type: "product_demo",
      status: "planned",
      title: "Cadaver lab — distal radius & ankle plating",
      engagement_date: daysFromNow(10),
      engagement_workflow_mode: "strategic",
      observation_goal:
        "SMART: Fellows complete 2 volar radius & 1 ankle plating on cadaver; capture screw density preference and tray footprint vs VARIAX/Stryker.",
      pre_observation_impact_opening_statement:
        "Vendor fair is coming — we want your fellows to feel the difference in tray footprint before purchasing reviews sterile field claims.",
      pre_observation_probes:
        "• What breaks VARIAX relationship today?\n• Sterile field size limit for ASC?\n• Evaluation case count needed to switch distal radius?",
      pre_observation_tools_resources: "Cadaver lab trays; footprint one-pager; screw density comparison card.",
      pre_observation_value_hypothesis:
        "If fellows prefer plate profile on osteopenic radius sawbones, Johnson will sponsor 15-case ASC evaluation.",
      pre_observation_planned_close: "Book Q3 vendor fair booth walk-through; consignment eval trays delivered.",
      products_to_demonstrate: "Distal radius volar plate set; ankle ORIF tray — low-profile screws.",
      adoption_signals_to_watch: "Purchasing attending demo; fellow pushback on learning new drill guide.",
      next_action: "Send footprint PDF to purchasing; confirm fellow attendance (3 residents).",
    },
    {
      id: DEMO.engagements.johnsonPast,
      provider_id: DEMO.providers.johnson,
      organization_id: DEMO.orgs.johnson,
      opportunity_id: DEMO.opps.johnson,
      engagement_type: "or_visit",
      status: "completed",
      title: "OR shadow — ankle trauma day",
      engagement_date: daysAgo(16),
      engagement_purpose: "Map current Stryker ankle workflow; count plate usage.",
      notes: "4 ankle ORIFs on competitor trays; Johnson asked about smaller radius profile.",
      adoption_signals_to_watch: "Purchasing email about vendor fair looming.",
    },
  ]);

  await insertActivities();

  console.log("\nDone. Open Prepare For Meeting from these engagements:\n");
  console.log(`  Dr. Michael Smith:  /portal/sales/engagements/${DEMO.engagements.smithUpcoming}/prepare`);
  console.log(`  Dr. Anita Patel:    /portal/sales/engagements/${DEMO.engagements.patelUpcoming}/prepare`);
  console.log(`  Dr. James Johnson:  /portal/sales/engagements/${DEMO.engagements.johnsonUpcoming}/prepare`);
  console.log("\nProvider profiles:");
  console.log(`  /portal/sales/providers/${DEMO.providers.smith}`);
  console.log(`  /portal/sales/providers/${DEMO.providers.patel}`);
  console.log(`  /portal/sales/providers/${DEMO.providers.johnson}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
