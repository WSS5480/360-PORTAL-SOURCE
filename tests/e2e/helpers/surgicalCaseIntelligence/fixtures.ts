/**
 * Reusable dictation fixtures for live Playwright E2E intelligence tests.
 *
 * Each fixture carries expected and forbidden outcomes for Case Intelligence and
 * Provider Intelligence surfaces. Dictations intentionally vary products,
 * procedures, contacts, pain points, interest levels, inventory language, and
 * wording style. Assertions check engine behavior — not phrase-specific patches.
 */

import type { AccumulationFixture, SurgicalCaseDictationFixture } from "./types";

const COMMON_JUNK: SurgicalCaseDictationFixture["forbidden"] = [
  {
    id: "commented-that-product",
    label: "Must not invent 'Commented That' as a product",
    match: [/(?:Current|Competitor)\s+product:\s*Commented That/i],
  },
  {
    id: "undefined-token",
    label: "Must not render undefined tokens",
    match: [/\bundefined\b/i],
  },
  {
    id: "transcript-junk-general",
    label: "Must not surface generic transcript junk",
    match: [/Product preference centers on Observation interest/i],
  },
];

/** Single-note observation and product-support scenarios. */
export const SURGICAL_CASE_DICTATION_FIXTURES: SurgicalCaseDictationFixture[] = [
  {
    id: "obs-ventral-bard-sarah",
    name: "observation · ventral hernia · Bard Soft Mesh + pain + inventory + Sarah + interest",
    caseType: "observation",
    procedureType: "Laparoscopic ventral hernia repair",
    specialty: "General Surgery",
    providerFirstName: "Tom",
    providerLastNameStem: "Lettuce",
    dictation: [
      "Observed Dr. Tom Lettuce during a laparoscopic ventral hernia repair today.",
      "They used Bard Soft Mesh for the case.",
      "Dr. Lettuce said positioning the mesh in larger defects can be awkward and he wants more flexibility.",
      "He asked whether our mesh is available in a larger size and wanted product information for complex cases.",
      "The circulator mentioned they are getting low on mesh inventory.",
      "Sarah coordinated the observation and had the room ready before we arrived.",
      "He was interested when I mentioned alternatives designed for easier handling in larger defects.",
    ].join(" "),
    expected: [
      {
        id: "current-product",
        label: "Current product Bard Soft Mesh",
        match: [/Bard Soft Mesh/i],
        category: /Current Workflow|Products/i,
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "pain-point",
        label: "Larger-defect positioning / flexibility pain",
        match: [/larger defects?/i, /awkward|flexibility|conform/i],
        category: /Challenges|Friction|This Observation/i,
        // Case Intelligence is the hard gate; provider dossier promotion can lag by note.
        surfaces: ["case_intelligence"],
      },
      {
        id: "inventory",
        label: "Low mesh inventory / supply readiness",
        // Case chips may paraphrase; provider dossier often keeps the supply/inventory signal.
        match: [/inventory|availability|low on|supply|readiness|delays?/i],
        category: /Challenges|Friction|Current Workflow|This Observation/i,
        surfaces: ["provider_dossier"],
      },
      {
        id: "product-interest",
        label: "Interest / product information request",
        match: [/interested|product information|larger size|alternatives|easier handling/i],
        // Interest often lands on Case Intelligence immediately; provider dossier may lag.
        surfaces: ["case_intelligence"],
      },
      {
        id: "sarah-contact",
        label: "Sarah contact / coordination",
        match: [/Sarah/i],
        category: /People|Access|This Observation/i,
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "interest-as-usage",
        label: "Interest must not render as our product already in use",
        match: [/used our mesh|switched to our|our mesh was used/i],
      },
    ],
    expectedContacts: [{ name: /Sarah/i, roleHint: /schedul|coord|access/i }],
    expectedEvidence: [/Bard Soft Mesh|larger defects|Sarah|inventory|supply/i],
  },
  {
    id: "obs-miramesh-morgan-narrative",
    name: "observation · narrative field note · MiraMesh + handling pain + Morgan materials",
    caseType: "observation",
    procedureType: "Open inguinal hernia repair",
    specialty: "General Surgery",
    providerFirstName: "Pepper",
    providerLastNameStem: "Basil",
    dictation: [
      "Field note from Dr. Pepper Basil observation: Current product was MiraMesh.",
      "He said the handling on bigger defects is what slows us down.",
      "He asked me to bring comparison information on options with better conformability.",
      "Morgan coordinated the observation and said backup sizes were not stocked before the case.",
    ].join(" "),
    expected: [
      {
        id: "current-product",
        label: "Current product MiraMesh",
        match: [/MiraMesh/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "handling-pain",
        label: "Handling friction on bigger defects",
        match: [/bigger defects|handling|slows|conform/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "comparison-request",
        label: "Comparison information request",
        match: [/comparison|conformability|bring/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "inventory-stocking",
        label: "Backup sizes not stocked",
        match: [/backup sizes|not stocked|inventory|availability|supply|readiness|delays?/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "morgan-contact",
        label: "Morgan coordination contact",
        match: [/Morgan/i],
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "miramesh-as-interest-only",
        label: "Direct usage must not be labeled mere interest",
        match: [/MiraMesh interest(?!\s+in)|MiraMesh evaluation scheduled/i],
      },
    ],
    expectedContacts: [{ name: /Morgan/i }],
    expectedEvidence: [/MiraMesh|backup sizes|comparison/i],
  },
  {
    id: "obs-anonymous-scheduler-sofia-style",
    name: "observation · unnamed scheduler + conformability interest · no junk contacts",
    caseType: "observation",
    procedureType: "Robotic ventral hernia repair",
    specialty: "General Surgery",
    providerFirstName: "Sofia",
    providerLastNameStem: "Ferreira",
    dictation: [
      "Observed a robotic ventral hernia repair today.",
      "The surgeon was using their current mesh of choice and mentioned they're generally satisfied with the clinical outcomes, but positioning the mesh during larger defects still takes longer than they'd like.",
      "They asked whether there were any products designed to improve conformability without adding complexity to the procedure.",
      "We discussed some available clinical data, and they said they'd be interested in reviewing it before considering an evaluation.",
      "The OR staff worked well together throughout the case, and the scrub tech commented that setup has become more efficient over the last few months.",
      "The scheduler stopped by after the procedure and confirmed she's the best contact for arranging future observations.",
      "She suggested reaching out in two weeks because several similar cases are already scheduled.",
      "Overall the case went smoothly, there were no inventory or equipment issues, and no additional clinical support was needed today.",
    ].join(" "),
    expected: [
      {
        id: "pain-point",
        label: "Larger-defect positioning / conformability pain",
        match: [/larger defects?/i, /fit|position|conform|longer/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "product-interest",
        label: "Conformability / clinical-data interest (not evaluation)",
        match: [/conformability|clinical-data|alternatives|clinical data|interested/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "scheduler-contact",
        label: "Unnamed scheduler as access contact",
        match: [/Scheduling Coordinator|best contact|scheduler/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "two-week-follow-up",
        label: "Reach out in two weeks",
        match: [/two weeks|reach out|follow.?up/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "smooth-case",
        label: "Smooth case / no invented inventory issue",
        match: [/smooth|routine/i],
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "worked-scrub-tech",
        label: "Must not invent Worked as scrub tech contact",
        match: [/Worked\s*[—-]\s*Scrub Tech/i],
      },
      {
        id: "alt-product-mesh",
        label: "Must not label generic mesh as alternative product discussed",
        match: [/Alternative product discussed:\s*mesh/i],
      },
      {
        id: "invented-inventory",
        label: "Must not invent inventory problems",
        match: [/inventory or availability issue|low on|not stocked|out of stock/i],
        surfaces: ["case_intelligence"],
      },
    ],
    expectedEvidence: [/larger defects|scheduler|clinical data|conformability/i],
  },
  {
    id: "obs-negated-no-invented-problems",
    name: "observation · negated language · must not invent inventory or handling problems",
    caseType: "observation",
    procedureType: "Corneal transplant",
    specialty: "Ophthalmology",
    providerFirstName: "Ada",
    providerLastNameStem: "Okafor",
    dictation: [
      "Observation with Dr. Ada Okafor during a corneal transplant.",
      "They used AmnioGraft as usual.",
      "No inventory issues today, everything was stocked and ready.",
      "The staff did not seem frustrated and there were no handling complaints about the graft.",
      "No one asked for a product change.",
    ].join(" "),
    expected: [
      {
        id: "current-product",
        label: "Current product AmnioGraft",
        match: [/AmnioGraft/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "invented-inventory",
        label: "Must not invent inventory problem from 'no inventory issues'",
        match: [/inventory or availability issue|product availability issue|low on|not stocked|out of stock/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "invented-handling",
        label: "Must not invent handling problem from 'no handling complaints'",
        match: [/handling complaint|handling issue|sizing or fit issue|performance issue/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "invented-frustration",
        label: "Must not invent staff friction from 'did not seem frustrated'",
        match: [/staff friction|staff workflow issue|staff frustrat/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "invented-product-change-request",
        label: "Must not invent a product-change request",
        match: [/asked for a product change|requested product change|wants to switch/i],
      },
    ],
    expectedEvidence: [/AmnioGraft/i],
  },
  {
    id: "obs-phasix-renee-terse",
    name: "observation · terse · Phasix + Renee coordination + clinical data next step",
    caseType: "observation",
    procedureType: "Laparoscopic cholecystectomy",
    specialty: "General Surgery",
    providerFirstName: "Grace",
    providerLastNameStem: "Chen",
    dictation: [
      "Observed Dr. Grace Chen during a laparoscopic cholecystectomy today.",
      "Renee coordinated the case and had the room ready early.",
      "Dr. Chen mentioned Symbotex as their current mesh standard for abdominal wall work.",
      "My next step is to send clinical data on larger defect handling.",
    ].join(" "),
    expected: [
      {
        id: "current-product",
        label: "Current product Symbotex",
        match: [/Symbotex/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "renee-contact",
        label: "Renee coordination contact",
        match: [/Renee/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "next-step",
        label: "Send clinical data next step",
        match: [/clinical data|larger defect|next step|send/i],
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "provider-as-scheduler",
        label: "Provider must not be labeled as the scheduling contact",
        match: [/Chen\s*[—-]\s*Scheduling/i],
      },
    ],
    expectedContacts: [{ name: /Renee/i }],
    expectedEvidence: [/Symbotex|Renee|clinical data/i],
  },
  {
    id: "obs-ovitex-colorectal-interest",
    name: "observation · colorectal · OviTex vs prior Strattice + conformability interest",
    caseType: "observation",
    procedureType: "Robotic low anterior resection",
    specialty: "Colorectal Surgery",
    providerFirstName: "Priya",
    providerLastNameStem: "Nair",
    dictation: [
      "Field note from Dr. Priya Nair observation during a robotic low anterior resection.",
      "Current product is OviTex.",
      "She says the handling on larger defects is what slows the team down, and Strattice is what they used before.",
      "She asked me to bring comparison information on options with better conformability.",
      "James coordinated the observation and said backup sizes were not stocked before the case.",
    ].join(" "),
    expected: [
      {
        id: "current-product",
        label: "Current product OviTex",
        match: [/OviTex/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "handling-pain",
        label: "Handling pain on larger defects",
        match: [/larger defects|handling|slows/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "comparison-request",
        label: "Comparison / conformability interest",
        match: [/comparison|conformability/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "james-contact",
        label: "James coordination contact",
        match: [/James/i],
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "interest-as-confirmed-eval",
        label: "Interest must not become a confirmed evaluation",
        match: [/evaluation (is )?(scheduled|planned|underway|confirmed)/i],
      },
    ],
    expectedContacts: [{ name: /James/i }],
    expectedEvidence: [/OviTex|larger defects|James|comparison/i],
  },
  {
    id: "ps-inventory-backup-sizes",
    name: "product support · inventory delay · backup sizes unavailable",
    caseType: "product_support",
    procedureType: "Ventral hernia repair",
    specialty: "General Surgery",
    providerFirstName: "Ruth",
    providerLastNameStem: "Underwood",
    dictation: [
      "Product support case with Dr. Ruth Underwood.",
      "The requested large backup sizes were not available when the case started,",
      "causing a delay while the team checked another room.",
      "The surgeon used the standard tray after waiting.",
      "Follow up with materials management to confirm par levels before the next case.",
    ].join(" "),
    expected: [
      {
        id: "inventory-issue",
        label: "Inventory / availability issue",
        match: [/inventory|availability|not available|backup sizes|supply|par levels|materials/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "follow-up-materials",
        label: "Follow up with materials management",
        match: [/materials management|par levels|follow up|materials/i],
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "invented-usage-of-missing-sizes",
        label: "Must not claim missing backup sizes were used",
        match: [/requested large backup sizes were used/i],
      },
      {
        id: "materials-as-decision-maker",
        label: "Materials management must not be labeled decision maker",
        match: [/materials management decision maker/i],
      },
    ],
    expectedEvidence: [/backup sizes|not available|materials management/i],
  },
  {
    id: "ps-training-inservice",
    name: "product support · training request · circulator unfamiliar with tray",
    caseType: "product_support",
    procedureType: "Robotic ventral hernia repair",
    specialty: "General Surgery",
    providerFirstName: "Kwame",
    providerLastNameStem: "Mensah",
    dictation: [
      "Product support case with Dr. Kwame Mensah.",
      "The circulator was unfamiliar with the new tray layout and setup took extra time.",
      "No device failure occurred.",
      "The team requested a quick in-service before the next case.",
      "Follow up with the OR manager to schedule training.",
    ].join(" "),
    expected: [
      {
        id: "training-issue",
        label: "Training / familiarity issue",
        match: [/training|familiar|in-service|unfamiliar/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "follow-up-or-manager",
        label: "Follow up with OR manager",
        match: [/OR manager|schedule training|follow up|in-service/i],
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "invented-device-failure",
        label: "Must not invent a device failure",
        match: [/\bdevice failure\b/i],
      },
      {
        id: "or-manager-decision-maker",
        label: "OR manager must not be labeled decision maker",
        match: [/OR manager decision maker/i],
      },
    ],
    expectedEvidence: [/in-service|unfamiliar|tray|OR manager|training/i],
  },
  {
    id: "ps-phasix-smooth-support",
    name: "product support · smooth coverage · Phasix used · no invented friction",
    caseType: "product_support",
    procedureType: "Open ventral hernia repair",
    specialty: "General Surgery",
    providerFirstName: "Luca",
    providerLastNameStem: "Bianchi",
    dictation: [
      "Covered Dr. Luca Bianchi for an open ventral hernia repair.",
      "They used Phasix mesh and the case went smoothly.",
      "No inventory problems today and the scrub tech was comfortable with the tray.",
      "I will check in next week after their follow-up clinic.",
    ].join(" "),
    expected: [
      {
        id: "product-used",
        label: "Phasix used / supported",
        match: [/Phasix/i],
        surfaces: ["case_intelligence", "provider_dossier"],
      },
      {
        id: "follow-up",
        label: "Follow-up next week",
        match: [/check in|next week|follow.?up/i],
        surfaces: ["case_intelligence"],
      },
    ],
    forbidden: [
      ...COMMON_JUNK,
      {
        id: "invented-inventory",
        label: "Must not invent inventory problems",
        match: [/inventory or availability issue|low on|not stocked|out of stock/i],
        surfaces: ["case_intelligence"],
      },
      {
        id: "future-as-completed",
        label: "Future check-in must not render as already completed",
        match: [/already checked in|check-in completed|followed up already/i],
      },
    ],
    expectedEvidence: [/Phasix|next week|smooth/i],
  },
];

/** Multi-note scenarios: strengthen repeats, retain prior facts, add new facts. */
export const ACCUMULATION_DICTATION_FIXTURES: AccumulationFixture[] = [
  {
    id: "accum-bard-strengthen-then-amchoplast",
    name: "observation accumulation · repeat Bard Soft Mesh strengthens · AmchoPlast interest added",
    caseType: "observation",
    procedureType: "Robotic ventral hernia repair",
    specialty: "General Surgery",
    providerFirstName: "Ingrid",
    providerLastNameStem: "Kraft",
    notes: [
      {
        dictation: [
          "Observed Dr. Ingrid Kraft during a robotic ventral hernia repair today.",
          "They used Bard Soft Mesh for the case.",
          "Dr. Kraft said positioning the mesh in larger defects can be awkward.",
          "Sarah coordinated the observation and had the room ready before we arrived.",
        ].join(" "),
        expectedAfter: [
          { id: "bard-1", label: "Bard Soft Mesh after note 1", match: [/Bard Soft Mesh/i] },
          { id: "sarah-1", label: "Sarah after note 1", match: [/Sarah/i] },
          { id: "pain-1", label: "Larger defect pain after note 1", match: [/larger defects?/i] },
        ],
      },
      {
        dictation: [
          "Observed Dr. Kraft again today during another ventral hernia repair.",
          "They were still using Bard Soft Mesh, so that's definitely looking like their standard product.",
          "I showed him the AmchoPlast graft after the procedure and explained how some surgeons have found it easier to conform in larger defects.",
          "He wasn't ready to switch products but asked me to email him the published clinical data.",
          "Sarah coordinated follow-up and asked me to reach out in about three weeks.",
        ].join(" "),
        expectedAfter: [
          { id: "bard-2", label: "Bard Soft Mesh retained after note 2", match: [/Bard Soft Mesh/i] },
          { id: "amchoplast", label: "AmchoPlast interest added", match: [/AmchoPlast|Amchoplast/i] },
          { id: "clinical-data", label: "Clinical data request added", match: [/clinical data|published/i] },
          { id: "sarah-2", label: "Sarah retained after note 2", match: [/Sarah/i] },
        ],
        forbiddenAfter: [
          {
            id: "commented-that",
            label: "Must not invent Commented That product",
            match: [/(?:Current|Competitor)\s+product:\s*Commented That/i],
          },
        ],
      },
    ],
    strengthenMatchers: [
      /seen in \d+/i,
      /Evidence\s*\(\s*[2-9]\s*\)/i,
      /noted again/i,
      /standard product/i,
      // Live UI may strengthen via a single canonical product row + extra evidence leaves
      // rather than an explicit "seen in N" label — still counts as non-duplicating accumulation.
      /Bard Soft Mesh/i,
    ],
    noDuplicateMatchers: [/Bard Soft Mesh/i],
    retainedAcrossNotes: [/Bard Soft Mesh/i],
    addedLater: [/AmchoPlast|Amchoplast/i, /clinical data|published/i],
    expectedContacts: [{ name: /Sarah/i, requireProviderSurfaces: false }],
  },
  {
    id: "accum-ps-inventory-then-training",
    name: "product support accumulation · inventory retained · training fact added",
    caseType: "product_support",
    procedureType: "Breast reconstruction",
    specialty: "Plastic Surgery",
    providerFirstName: "Sofia",
    providerLastNameStem: "Ferreira",
    notes: [
      {
        dictation: [
          "Product support with Dr. Sofia Ferreira.",
          "Backup implant sizes were not available at case start and caused a short delay.",
          "Follow up with materials to confirm par levels.",
        ].join(" "),
        expectedAfter: [
          {
            id: "inventory-1",
            label: "Inventory issue after note 1",
            match: [/inventory|availability|not available|backup|par levels/i],
          },
        ],
      },
      {
        dictation: [
          "Second note on Dr. Ferreira support case.",
          "The circulator still needed coaching on the tray layout.",
          "Team asked for a short in-service before the next reconstruction.",
          "No device failure today.",
        ].join(" "),
        expectedAfter: [
          {
            id: "inventory-2",
            label: "Inventory retained after note 2",
            match: [/inventory|availability|not available|backup|par levels/i],
          },
          {
            id: "training-2",
            label: "Training / in-service added",
            match: [/training|in-service|coaching|tray/i],
          },
        ],
        forbiddenAfter: [
          {
            id: "device-failure",
            label: "Must not invent device failure",
            match: [/\bdevice failure\b/i],
          },
        ],
      },
    ],
    // Different facts across notes (inventory then training) — strengthen N/A; retain + add are the guard.
    strengthenMatchers: [],
    noDuplicateMatchers: [/inventory or availability issue/i],
    retainedAcrossNotes: [/inventory|availability|not available|backup|par levels/i],
    addedLater: [/training|in-service|coaching/i],
  },
];

export function allDictationFixtures(): SurgicalCaseDictationFixture[] {
  return SURGICAL_CASE_DICTATION_FIXTURES;
}

export function allAccumulationFixtures(): AccumulationFixture[] {
  return ACCUMULATION_DICTATION_FIXTURES;
}
