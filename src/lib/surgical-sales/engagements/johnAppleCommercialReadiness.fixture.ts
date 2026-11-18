/**
 * Canonical John Apple observation intelligence fixture for commercial readiness regression.
 */

export const JOHN_APPLE_PROVIDER_CONTACT = {
  id: "provider-apple",
  first_name: "John",
  last_name: "Apple",
  provider_competitive_products: "Bard Mesh — needs confirmation during observation",
};

export const JOHN_APPLE_CURRENT_CASE = {
  id: "case-current",
  case_type: "observation",
  status: "completed",
  surgeon_contact_id: "provider-apple",
  procedure_type: "Robotic ventral hernia",
  provider_name: "John Apple",
  live_observation_competitors: "Bard Mesh noted again today",
  live_observation_workflow:
    "There were a couple points where they spent extra time getting a better view before placing fixation",
  live_observation_clinical_pain_points: "Provider concern: Clinical frustration during visualization",
  live_observation_staff_process: "Team seemed organized",
  live_observation_product_fit:
    "The early opportunity may be around visualization and fixation workflow",
};

export const JOHN_APPLE_PRIOR_COMPLETED_CASES = [
  {
    id: "prior-1",
    case_type: "observation",
    status: "completed",
    live_observation_competitors: "Bard Mesh observed",
    live_observation_workflow:
      "Spent extra time getting a better view before placing fixation",
    live_observation_staff_process: "Team seemed organized",
    activities: [
      {
        activity_type: "note",
        body: "They were using Bard Mesh again during the case. Team seemed organized.",
      },
    ],
  },
  {
    id: "prior-2",
    case_type: "observation",
    status: "completed",
    live_observation_competitors: "Bard Mesh observed",
    live_observation_workflow: "Extra visualization time before fixation",
    live_observation_staff_process: "Team seemed organized",
    activities: [
      {
        activity_type: "note",
        body: "Still using Bard Mesh on hernia cases. Team seemed organized.",
      },
    ],
  },
  {
    id: "prior-3",
    case_type: "observation",
    status: "completed",
    live_observation_competitors: "Bard Mesh observed",
    live_observation_workflow: "Extra time getting visualization before fixation",
    live_observation_clinical_pain_points: "Provider concern: Clinical frustration during visualization",
    live_observation_staff_process: "Team seemed organized",
    activities: [
      {
        activity_type: "note",
        body: "Bard Mesh used again. Provider frustration during visualization before fixation.",
      },
    ],
  },
  {
    id: "prior-4",
    case_type: "observation",
    status: "completed",
    live_observation_competitors: "Bard Mesh observed",
    live_observation_workflow: "It did seem to slow the flow down a little",
    live_observation_staff_process: "Uncertainty Stocked Products",
    activities: [
      {
        activity_type: "note",
        body: "Product was not ready when they needed it at the start. Staff needed to verify stocked products before proceeding. It did seem to slow the flow down a little. Team seemed organized.",
      },
    ],
  },
];

export const JOHN_APPLE_CURRENT_ACTIVITIES = [
  {
    activity_type: "note",
    body: "They were using Bard Mesh again. Extra visualization time before fixation. Team seemed organized.",
  },
];

export const JOHN_APPLE_OBSERVATION_NOTES = [
  "They were using Bard Mesh again during the case. Team seemed organized. Extra visualization time before fixation.",
  "Still using Bard Mesh on hernia cases. Team seemed organized.",
  "Bard Mesh used again. Provider frustration during visualization before fixation. Team seemed organized.",
  "Product was not ready when they needed it at the start. Staff needed to verify stocked products before proceeding. It did seem to slow the flow down a little.",
  "They were using Bard Mesh again. Extra visualization time before fixation. Team seemed organized.",
];

export const JOHN_APPLE_COMPLETED_OBSERVATION_COUNT = 5;

export const JOHN_APPLE_OBSERVATION_CORPUS = JOHN_APPLE_OBSERVATION_NOTES.map((body, index) => ({
  caseId: index < 4 ? `prior-${index + 1}` : "case-current",
  caseDate: null,
  observationIndex: index + 1,
  body,
  sourceNoteId: null,
  createdAt: null,
}));
