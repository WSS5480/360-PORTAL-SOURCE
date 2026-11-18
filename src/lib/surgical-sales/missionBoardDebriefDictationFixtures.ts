/**
 * Regression dictation fixtures for Mission Board post-complete debrief extraction tests.
 */

export type MissionBoardDebriefDictationFixture = {
  id: string;
  title: string;
  dictation: string;
};

export const MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES: MissionBoardDebriefDictationFixture[] = [
  {
    id: "confirms_360_experience",
    title: "Provider confirms 360 Experience is the right next step",
    dictation:
      "Provider confirmed the 360 Experience is the right next step after our observation debrief. " +
      "They asked about our product evaluation path and said our solution could be helped by the structured 360 Experience program. " +
      "Need to follow up with the office to schedule the first evaluation session.",
  },
  {
    id: "product_trial_first",
    title: "Provider wants a product trial first",
    dictation:
      "Provider is interested in evaluation but wants a product trial on two cases before any broader commitment. " +
      "They asked about trial units and said hands-on evaluation with our product on their next ACL cases is the right next step.",
  },
  {
    id: "issue_not_meaningful",
    title: "Provider says issue is not meaningful",
    dictation:
      "Provider said the workflow turnover issue we discussed is not really meaningful for their team — " +
      "staff handle room turnover fine and they do not see a clinical frustration worth solving right now. " +
      "No follow up needed on that pain point unless something changes.",
  },
  {
    id: "office_manager_or_coordinator",
    title: "Provider needs office manager or OR coordinator involved",
    dictation:
      "Provider said we need to loop in the office manager and the OR coordinator before observation can be scheduled. " +
      "Maria handles scheduling for the OR and we need her contact info. " +
      "Credentialing was discussed but the platform is unknown until Maria confirms the vendor approval path.",
  },
  {
    id: "another_observation",
    title: "Provider is interested but wants another observation",
    dictation:
      "Provider is interested in moving forward but wants another observation before any product evaluation. " +
      "They said observation seems possible once we get through credentialing and we should follow up to observe a case next month.",
  },
  {
    id: "structured_use_confirmed",
    title: "Provider confirms structured use",
    dictation:
      "Provider confirmed structured use on their next case. " +
      "They committed to using our product on the next scheduled ACL case starting next week and asked about our solution setup for the OR.",
  },
];
