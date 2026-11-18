import type {
  PreCallPlanProductLine,
  PreCallPlanTemplateEngagementType,
  PreCallPlanTemplateContent,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export type PreCallPlanTemplateSeedSpec = {
  product_line: PreCallPlanProductLine;
  template_engagement_type: PreCallPlanTemplateEngagementType;
  name: string;
  description: string;
} & PreCallPlanTemplateContent;

/** Stable key for upserting system templates (matches `name`). */
export function preCallPlanTemplateSeedKey(spec: Pick<PreCallPlanTemplateSeedSpec, "name">): string {
  return spec.name.trim();
}

export const PRE_CALL_PLAN_TEMPLATE_SEEDS: PreCallPlanTemplateSeedSpec[] = [
  // —— ACSIS ——
  {
    product_line: "ACSIS",
    template_engagement_type: "observation_request",
    name: "ACSIS — Observation request",
    description: "Schedule OR observation for lap hernia with clear boundaries and debrief.",
    observation_goal:
      "SMART: Secure a lap ventral or inguinal observation date within 30 days, with written agreement on rep/CS presence, case profile, and 15-min post-case debrief.",
    pre_observation_impact_opening_statement:
      "This observation is for your teaching and workflow goals—we stay quiet unless you pull us in, and we will not coach staff unless you ask.",
    pre_observation_probes:
      "• Ideal case (size, prior repair, lap vs open)\n• Block timing and backup case if cancel\n• Sterile field / photography rules\n• Who in room should attend debrief (fellow, PA, OR lead)\n• What you want documented vs discussed only",
    pre_observation_tools_resources:
      "OR observation checklist · facility access / credentialing packet · clinical specialist calendar · preference card draft (blank)",
    pre_observation_value_hypothesis:
      "Seeing fixation in their hands—not on a slide—answers whether tackless closure fits their port setup and who actually drives the fixation step.",
    pre_observation_planned_close:
      "Confirm date, case window, and debrief slot; identify one person for supply questions after the case.",
    suggested_next_step: "Email calendar hold + pre-case call 48 hours prior with case profile confirmed.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "ACSIS",
    template_engagement_type: "product_demo",
    name: "ACSIS — Evaluation planning",
    description: "Structure a hernia fixation evaluation with supply chain and clinical exit criteria.",
    observation_goal:
      "SMART: Co-author a 4–6 week evaluation plan listing case count, inclusion criteria, success measures (fixation time, hemostasis, no unplanned conversions), and materials management sign-off by [date].",
    pre_observation_impact_opening_statement:
      "Let's build an evaluation your OR lead and materials team can approve—specific cases, backup fixation if needed, and how we know to expand or stop.",
    pre_observation_probes:
      "• Consignment vs bill-only vs trunk stock\n• Par levels and substitute policy during pilot\n• Which surgeons/fellows may use product\n• Data needed for hernia committee or VAC\n• Competitive fixation still on card during pilot",
    pre_observation_tools_resources:
      "Evaluation charter template · SKU / UOM list · supply chain + billing FAQ · case log spreadsheet",
    pre_observation_value_hypothesis:
      "A bounded pilot with agreed metrics protects the surgeon's reputation internally and makes expansion a data decision, not a rep decision.",
    pre_observation_planned_close:
      "Assign owners for supply, documentation, and first three cases; set committee checkpoint if required.",
    suggested_next_step: "Deliver draft evaluation memo within 5 business days for surgeon + OR manager edits.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "ACSIS",
    template_engagement_type: "follow_up",
    name: "ACSIS — Follow-up (preference card)",
    description: "Move ACSIS fixation to default preference card lines with stocking aligned.",
    observation_goal:
      "SMART: Submit updated preference card with primary ACSIS SKUs, confirmed materials receipt, and first three scheduled cases using card defaults within 21 days.",
    pre_observation_impact_opening_statement:
      "You've proven the technique—now we make sure the card, par levels, and nursing picks match what you actually do so every eligible case defaults correctly.",
    pre_observation_probes:
      "• Preference card owner and revision cadence\n• Open vs lap SKU split on card\n• Backup fixation line if stock-out\n• Charge capture / CPT pairing questions\n• Nursing education needed for new pick path",
    pre_observation_tools_resources:
      "Marked-up preference card · materials management contact · OR nursing in-service outline (10 min)",
    pre_observation_value_hypothesis:
      "Surgeons stop using products that are hard to request; card accuracy is what converts clinical wins into steady volume.",
    pre_observation_planned_close:
      "Confirm submission path, go-live date, and who verifies first three picks match the card.",
    suggested_next_step: "Walk card to materials together or join brief MM huddle if required.",
    pre_observation_additional_notes: null,
  },

  // —— BioTissue ——
  {
    product_line: "BioTissue",
    template_engagement_type: "product_demo",
    name: "BioTissue — Biologic evaluation",
    description: "Plan a biologic graft evaluation with application training and outcome tracking.",
    observation_goal:
      "SMART: Define 8–12 patient evaluation cohort, application training date, documentation fields (granulation, % closure @4 weeks), and restock trigger by [date].",
    pre_observation_impact_opening_statement:
      "Let's structure a graft evaluation that wound nurses can execute—clear inclusion, application steps, photo schedule, and when to reorder.",
    pre_observation_probes:
      "• Inclusion/exclusion (depth, infection, offloading)\n• Clinic vs OR application preference\n• Storage and shelf life on site\n• Who documents photos and intervals\n• Reorder process and consignment limits",
    pre_observation_tools_resources:
      "Evaluation intake form · application competency checklist · photo protocol · reorder / consignment worksheet",
    pre_observation_value_hypothesis:
      "A disciplined wound pilot produces committee-ready closure data—not anecdote—and shows nursing the product is operationally simple.",
    pre_observation_planned_close:
      "Schedule training; assign documentation owner; set 30-day outcomes review.",
    suggested_next_step: "Deliver evaluation packet to wound lead + confirm first three patients on calendar.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "BioTissue",
    template_engagement_type: "follow_up",
    name: "BioTissue — Follow-up expansion",
    description: "Expand biologic use after initial wound program results.",
    observation_goal:
      "SMART: Agree on one expansion motion—second clinic location, additional etiology, or referring physician outreach—with owner and date within 30 days.",
    pre_observation_impact_opening_statement:
      "You've got early closure data—I'd like to see where the same protocol could run without rebuilding training from scratch.",
    pre_observation_probes:
      "• Which wound types showed fastest closure\n• Satellite clinics or affiliated providers not using graft yet\n• Referral patterns from vascular / ortho / general surgery\n• Inventory constraints at second site\n• Medical director priorities for wound program growth",
    pre_observation_tools_resources:
      "Pilot outcomes summary (de-identified) · expansion business case outline · training calendar for satellite staff",
    pre_observation_value_hypothesis:
      "Expansion works when you clone documentation and training—not when you re-sell clinical science from zero.",
    pre_observation_planned_close:
      "Select one site or referral lane; define success metric for next 60 days.",
    suggested_next_step: "Send outcomes recap + propose training date at expansion site.",
    pre_observation_additional_notes: null,
  },

  // —— Skeletal Dynamics ——
  {
    product_line: "Skeletal Dynamics",
    template_engagement_type: "product_demo",
    name: "Skeletal Dynamics — Extremity fixation evaluation",
    description: "Plan upper/lower extremity fixation evaluation with inventory and technique alignment.",
    observation_goal:
      "SMART: Document evaluation scope (fracture types, approach, case count), tray/implant plan, and radiographic success criteria agreed with surgeon before first test case in 21 days.",
    pre_observation_impact_opening_statement:
      "Before we put trays on the shelf, let's align on which extremity cases make sense, what you need radiographically at 6 weeks, and how fellows will be trained.",
    pre_observation_probes:
      "• Fracture patterns and approaches in scope\n• Current plate/screw system and switching triggers\n• Tray footprint and sterilization limits\n• C-arm / imaging preferences\n• Rep and resident coverage expectations in OR",
    pre_observation_tools_resources:
      "System surgical technique guide · tray layout PDF · evaluation case log · competitor comparison (hardware only, factual)",
    pre_observation_value_hypothesis:
      "Surgeons adopt extremity systems when inventory matches real case mix and radiographic outcomes match their fixation philosophy—not when trays are oversized.",
    pre_observation_planned_close:
      "Lock case inclusion list and first three dates; confirm tray delivery date with SPD.",
    suggested_next_step: "Submit evaluation plan to trauma/ortho lead + SPD for par level confirmation.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "Skeletal Dynamics",
    template_engagement_type: "product_demo",
    name: "Skeletal Dynamics — Active evaluation support",
    description: "Mid-evaluation check-in on extremity cases—remove friction, reinforce wins.",
    observation_goal:
      "SMART: Review completed vs planned cases, resolve any tray/supply gaps, and confirm next three cases on calendar before [date].",
    pre_observation_impact_opening_statement:
      "Quick pulse on how cases are going—what felt familiar, what was clunky, and what we need to fix before the next one.",
    pre_observation_probes:
      "• Reduction satisfaction and plate fit\n• Drill/ screw steps that slowed flow\n• SPD or set completeness issues\n• Resident comfort level\n• Radiographic targets met at follow-up",
    pre_observation_tools_resources:
      "Case log review · in-service refresh (15 min) · clinical support hotline · spare module list",
    pre_observation_value_hypothesis:
      "Fixing small workflow friction during pilot prevents surgeons from quietly reverting to incumbent trays.",
    pre_observation_planned_close:
      "Document wins; assign owner to each open issue; verify next case dates.",
    suggested_next_step: "Attend next scheduled case or proctor fellow briefing if requested.",
    pre_observation_additional_notes: null,
  },

  // —— TelaBio ——
  {
    product_line: "TelaBio",
    template_engagement_type: "product_demo",
    name: "TelaBio — Competitive conversion",
    description: "Plan evaluation to displace incumbent mesh in targeted hernia scenarios.",
    observation_goal:
      "SMART: Define head-to-head evaluation on agreed case types vs named incumbent, with 5-case minimum and switching criteria documented by [date].",
    pre_observation_impact_opening_statement:
      "You've used [incumbent] for years—let's pick the cases where a different reinforcement surface or strength profile could matter and measure honestly, not swap everything at once.",
    pre_observation_probes:
      "• Incumbent SKUs and satisfaction gaps (handling, pain, recurrence)\n• Cases willing to run side-by-side vs full switch\n• IP underlay needs vs retrorectus only\n• Committee or partner surgeons who must buy in\n• Inventory transition plan from competitor stock",
    pre_observation_tools_resources:
      "Side-by-side evaluation worksheet · OviTex IFU comparisons (factual) · switching logistics checklist · KOL reference",
    pre_observation_value_hypothesis:
      "Conversion sticks when the surgeon sees handling or patient-fit benefits on their hardest cases—not on average cases where incumbent is 'fine.'",
    pre_observation_planned_close:
      "Sign evaluation scope; set case list; agree what success looks like vs incumbent.",
    suggested_next_step: "Draft evaluation memo comparing inclusion cases only—circulate before first test case.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "TelaBio",
    template_engagement_type: "observation_request",
    name: "TelaBio — Observation request",
    description: "OR observation for hernia reinforcement step with clear teaching focus.",
    observation_goal:
      "SMART: Book lap/open hernia observation within 30 days focused on reinforcement placement, with debrief on material handling and fixation sequence.",
    pre_observation_impact_opening_statement:
      "Use us to watch the reinforcement step you care about—we follow your cues on questions in the room and keep the debrief clinical, not promotional.",
    pre_observation_probes:
      "• Case type for observation (IP, retrorectus, component separation)\n• Port setup and mesh delivery preferences\n• Whether fellows operate reinforcement segment\n• Photography / recording policy\n• Post-case debrief participants",
    pre_observation_tools_resources:
      "Observation agenda · reinforcement handling card · clinical specialist availability",
    pre_observation_value_hypothesis:
      "Handling and deployment in real anatomy beats brochure comparisons for surgeons deciding between reinforcement platforms.",
    pre_observation_planned_close:
      "Confirm date, case, and debrief; clarify supply on field vs opened for demo only.",
    suggested_next_step: "Send OR hold + reinforcement handling tips one page day before case.",
    pre_observation_additional_notes: null,
  },

  // —— Endolumik ——
  {
    product_line: "Endolumik",
    template_engagement_type: "product_demo",
    name: "Endolumik — Product demo",
    description: "Hands-on demo leading into structured calibration device evaluation.",
    observation_goal:
      "SMART: Complete in-service demo with surgeon + charge RN, then agree on 5-case evaluation with documentation on sizing time and confirmation method by [date].",
    pre_observation_impact_opening_statement:
      "Today is hands-on—light path, sizing, and how it fits your table setup. If it matches your workflow, we'll outline a short case series, not an open-ended trial.",
    pre_observation_probes:
      "• Who must attend demo (surgeon, fellow, charge RN)\n• Simulate their port/ patient positioning\n• Storage and reprocessing questions\n• Which upcoming cases are demo vs eval\n• Metrics they will actually track (time, confirmations)",
    pre_observation_tools_resources:
      "Demo kit · IFU quick steps · evaluation case log · reprocessing summary for SPD",
    pre_observation_value_hypothesis:
      "Demos convert when charge nurses see setup is simple and surgeons see sizing clarity on their typical anatomy—not generic lab conditions.",
    pre_observation_planned_close:
      "Book first evaluation case; assign documentation owner; confirm par level or consignment.",
    suggested_next_step: "Leave IFU + evaluation log; confirm first case date before leaving.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "Endolumik",
    template_engagement_type: "product_demo",
    name: "Endolumik — Clinical validation",
    description: "Mid-pilot validation on calibration cases—evidence for program adoption.",
    observation_goal:
      "SMART: Review 3+ completed cases for sizing consistency, team feedback, and readiness to present outcomes to bariatric committee by [date].",
    pre_observation_impact_opening_statement:
      "We're at the point where your team either feels this is standardizable—or we fix what's blocking that. Let's review cases honestly.",
    pre_observation_probes:
      "• Case-by-case: size chosen, confirmations used, surprises\n• Nursing or anesthesia feedback\n• SPD/reprocessing issues\n• Comparison to prior calibration habit\n• What committee needs to approve routine use",
    pre_observation_tools_resources:
      "Validation case summary template · committee one-slide outcomes · clinical support for outlier case",
    pre_observation_value_hypothesis:
      "Clinical validation is about repeatability across residents and RNs—one great case isn't enough for program adoption.",
    pre_observation_planned_close:
      "List gaps with owners; schedule committee date or next cases; confirm stocking plan if positive.",
    suggested_next_step: "Deliver validation summary deck 48 hours before committee if scheduled.",
    pre_observation_additional_notes: null,
  },
  // —— Intro Call prepare (one per product + all products) ——
  {
    product_line: "ACSIS",
    template_engagement_type: "intro_call",
    name: "Intro Call — All products",
    description:
      "Pathway intro for any product — earn observation permission, learn workflow, and assess portfolio fit before product talk.",
    observation_goal:
      "SMART: In this intro call, confirm the surgeon is open to observation, identify 1–2 realistic case types to observe, and agree a follow-up within 14 days — without discussing hospital logistics.",
    pre_observation_impact_opening_statement:
      "Before we talk product, I'd like to understand how you run cases today and whether observing one of your upcoming procedures would help us learn your workflow.",
    pre_observation_probes:
      "• Would you be open to allowing me to observe one of your upcoming cases?\n• Which case types would you be most comfortable having us observe?\n• What would you want us to pay attention to if we watched a case?\n• Where does workflow friction show up most in the procedures you run every week?\n• What would make observation worthwhile for you versus a distraction?",
    pre_observation_tools_resources:
      "Procedure volume worksheet · observation debrief template · portfolio overview (reference only)",
    pre_observation_value_hypothesis:
      "Observation is how we learn whether any product line fits — this call should leave with permission and a realistic case type, not admin logistics.",
    pre_observation_planned_close:
      "Play back what they said about observation appetite and case types; confirm whether observation is approved, deferred, or denied.",
    suggested_next_step: "Send brief follow-up recap + propose a date window for a first observation case.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "ACSIS",
    template_engagement_type: "intro_call",
    name: "Intro Call — ACSIS",
    description: "Intro call for hernia/fixation — learn case mix and closure workflow through observation permission.",
    observation_goal:
      "SMART: Confirm lap/open hernia volume, secure agreement to observe one eligible case, and identify which hernia subtypes to watch — with follow-up within 14 days.",
    pre_observation_impact_opening_statement:
      "I'd like to understand how you run hernia cases today and whether a brief OR observation could fit your teaching and workflow goals — before we discuss any fixation approach.",
    pre_observation_probes:
      "• Would you be open to allowing me to observe one of your upcoming hernia cases?\n• Monthly lap vs open hernia mix and which subtypes you run most\n• Fixation steps that slow closure or create hemostasis friction\n• Which hernia cases would you put forward for a first observation\n• What would you want us to notice about your closure workflow if we watched a case",
    pre_observation_tools_resources:
      "Hernia case-mix worksheet · observation debrief template · tackless fixation overview (reference only)",
    pre_observation_value_hypothesis:
      "Surgeons who standardize lap ventral may still benefit from a cleaner fixation step — but only if they're willing to let us observe real cases.",
    pre_observation_planned_close:
      "Confirm observation appetite and one hernia subtype to target for a first visit.",
    suggested_next_step: "Email brief recap + propose follow-up to align on first observation case.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "BioTissue",
    template_engagement_type: "intro_call",
    name: "Intro Call — BioTissue",
    description: "Intro call for wound/biologic practice — learn workflow through clinic or OR observation before graft discussion.",
    observation_goal:
      "SMART: Map chronic wound volume, confirm whether observation (OR, clinic, or bedside) is possible, and identify which wound types to watch — with follow-up within 14 days.",
    pre_observation_impact_opening_statement:
      "Help me understand how you escalate complex wounds and whether observing your workflow — in clinic or the OR — would help us learn before any graft conversation.",
    pre_observation_probes:
      "• Would you be open to allowing us to observe a wound care visit or procedure?\n• Weekly wound volume by etiology and care setting\n• Where graft selection or application adds steps in your workflow\n• Which wound types would make a first observation most useful\n• What would you want us to pay attention to during an observed case",
    pre_observation_tools_resources:
      "Wound staging reference · observation debrief template · graft workflow overview (reference only)",
    pre_observation_value_hypothesis:
      "Biologic adoption follows workflow clarity — observation should confirm where grafts fit, not jump to product specs.",
    pre_observation_planned_close:
      "Pick one wound setting for observation; confirm appetite and case type for a first visit.",
    suggested_next_step: "Send staging one-pager + schedule brief follow-up to align on first observation.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "TelaBio",
    template_engagement_type: "intro_call",
    name: "Intro Call — TelaBio",
    description: "Intro call for soft-tissue/hernia reinforcement — learn reinforcement workflow through observation.",
    observation_goal:
      "SMART: Confirm reconstruction/hernia volume, secure observation permission for one reinforcement case, and identify what to watch — with follow-up within 14 days.",
    pre_observation_impact_opening_statement:
      "I want to understand how you select reinforcement in complex cases and whether observing one live repair would be useful before we discuss any matrix portfolio.",
    pre_observation_probes:
      "• Would you be open to allowing me to observe one of your reconstruction or hernia cases?\n• Monthly soft-tissue/hernia volume and approach mix\n• Where reinforcement steps add time versus your open routine\n• Case profile for a meaningful first observation\n• What would you want us to notice about your reinforcement workflow",
    pre_observation_tools_resources:
      "Reinforcement selection overview · observation debrief template · workflow one-pager (reference only)",
    pre_observation_value_hypothesis:
      "Reinforcement decisions are handling-driven — a single observation on the right case beats a slide deck on average cases.",
    pre_observation_planned_close:
      "Confirm observation appetite, case type, and what to debrief after the first visit.",
    suggested_next_step: "Send brief recap + calendar hold for case-targeting follow-up.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "Skeletal Dynamics",
    template_engagement_type: "intro_call",
    name: "Intro Call — Skeletal Dynamics",
    description: "Intro call for extremity/trauma — learn fixation workflow through observation before system discussion.",
    observation_goal:
      "SMART: Confirm extremity/trauma mix, secure agreement to observe one eligible fixation case, and identify fracture subtypes to watch — with follow-up within 14 days.",
    pre_observation_impact_opening_statement:
      "You have systems that work — I'd like to learn where OR time or inventory creates friction and whether observing one case would clarify if a different approach fits a subset of your volume.",
    pre_observation_probes:
      "• Would you be open to allowing me to observe one of your extremity fixation cases?\n• Trauma vs elective mix and monthly case count\n• Where tray setup or implant steps create the most friction\n• Ideal first case for a low-disruption observation\n• What would you want us to pay attention to during an observed fixation case",
    pre_observation_tools_resources:
      "Extremity case-mix template · observation debrief template · tray layout reference (reference only)",
    pre_observation_value_hypothesis:
      "Extremity evaluations start on real cases — not when trays are speculated in a conference room.",
    pre_observation_planned_close:
      "Agree on observation target case type and what to debrief after the first visit.",
    suggested_next_step: "Share case-mix template + book follow-up to align on first observation case.",
    pre_observation_additional_notes: null,
  },
  {
    product_line: "Endolumik",
    template_engagement_type: "intro_call",
    name: "Intro Call — Endolumik",
    description: "Intro call for bariatric/MIS calibration — learn sizing workflow through observation.",
    observation_goal:
      "SMART: Document sleeve/RYGB volume, confirm whether OR observation of calibration workflow is possible, and identify what to watch — with follow-up within 14 days.",
    pre_observation_impact_opening_statement:
      "Walk me through how calibration runs in your MIS cases and whether observing one sleeve would help us understand team communication — before we discuss any device change.",
    pre_observation_probes:
      "• Would you be open to allowing me to observe one of your bariatric or foregut cases?\n• Monthly bariatric volume and typical calibration approach\n• Cases where sizing visibility is already a pain point\n• Which case would make the best first observation\n• What would you want us to notice about calibration and team communication",
    pre_observation_tools_resources:
      "Calibration workflow diagram · observation debrief template · sizing reference card (reference only)",
    pre_observation_value_hypothesis:
      "Calibration changes only stick when the team sees the workflow in a real case — observation validates fit faster than demo kits.",
    pre_observation_planned_close:
      "Choose observation vs demo path; confirm case type and debrief plan.",
    suggested_next_step: "Share workflow diagram + schedule brief follow-up or observation date.",
    pre_observation_additional_notes: null,
  },
  // —— 360 Experience prepare (single all-products playbook — two prepare questions) ——
  {
    product_line: "ACSIS",
    template_engagement_type: "office_visit_360",
    name: "360 Experience — All products",
    description:
      "Hands-on office or sim-lab visit — visit objective and sim lab focus for the 360 Experience prepare screen.",
    observation_goal:
      "SMART: Complete one structured hands-on session, confirm the provider can run the core workflow steps confidently, and agree a dated next step (evaluation, first use, or preference card review) within 14 days.",
    pre_observation_impact_opening_statement: "",
    pre_observation_probes:
      "• Robotic workflow and port setup familiarity\n• Mesh handling and fixation techniques\n• Biologic application and tissue handling\n• Procedural efficiency and instrumentation comfort",
    pre_observation_tools_resources: "",
    pre_observation_value_hypothesis: "",
    pre_observation_planned_close: "",
    suggested_next_step: "",
    pre_observation_additional_notes: null,
  },

];

export const PRE_CALL_PLAN_TEMPLATE_SEED_KEYS = new Set(
  PRE_CALL_PLAN_TEMPLATE_SEEDS.map((s) => preCallPlanTemplateSeedKey(s)),
);
