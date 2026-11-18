/** Shared regex patterns for observation note fact extraction. */

export const COMPETITOR_BRAND_PATTERN =
  /\b(bard|ethicon|covidien|medtronic|gore|baxter|stryker|johnson|jj|intuitive|competitor|rival)\b/i;

export const FIXATION_CONTEXT_PATTERN =
  /\b(?:fixation|placing\s+fixation|before\s+(?:mesh|fixation|placing\s+fixation)|prior\s+to\s+fixation|mesh\s+went\s+in|mesh\s+placement)\b/i;

export const ANGLE_REQUEST_PATTERN =
  /\b(?:asked\s+for|needed|wanted|requested)\s+(?:a\s+)?(?:different|another|better|new)\s+angle\b/i;

export const ANOTHER_ANGLE_PATTERN = /\b(?:another|different|better)\s+angle\b/i;

export const COULD_NOT_SEE_WELL_PATTERN =
  /\b(?:couldn't|could not)\s+see\s+well\b/i;

export const GETTING_VISUALIZATION_PATTERN =
  /\b(?:getting|obtaining|spent|spend|took|taking)\s+(?:extra\s+)?(?:time\s+)?(?:getting\s+)?(?:visualization|exposure|a\s+(?:better\s+)?view)\b/i;

export const REPOSITIONED_EXPOSURE_PATTERN =
  /\breposition(?:ed|ing)?\s+(?:for|to\s+(?:get|see|improve))\s+(?:a\s+)?(?:better\s+)?(?:exposure|visualization|view)\b/i;

export const VISUALIZATION_DIFFICULT_PATTERN =
  /\bvisuali[sz]ation\s+was\s+(?:difficult|challenging|poor|hard)\b/i;

export const VIEW_BEFORE_FIXATION_PATTERN =
  /\b(?:view|visuali[sz]|angle|exposure)\b/i;

export const READINESS_LOOKING_FOR_PATTERN =
  /\blooking\s+for\s+(?:something|supplies?|equipment|mesh|product|tray)\b/i;

export const PRODUCT_NOT_READY_PATTERN =
  /\b(?:product|mesh|tray|supplies?)\s+(?:wasn't|was not|not)\s+ready\b/i;

export const WAITING_AROUND_PATTERN = /\bwaiting\s+around\b/i;

export const PACKAGING_FRICTION_PATTERN =
  /\b(?:friction|trouble|difficult|hard|struggl\w*)\b[^.]{0,40}\b(?:opening|packaging|peel[- ]?pack|setup)\b/i;

export const PEEL_PACK_HARD_PATTERN =
  /\b(?:peel[- ]?pack|packaging)\s+(?:was\s+)?(?:hard|difficult|tricky)\s+(?:to\s+)?(?:open|use)\b/i;

export const PROVIDER_FRUSTRATION_PATTERN =
  /\b(?:frustrat\w*|complain\w*|annoyed|irritated)\b/i;

export const PROVIDER_ROLE_PATTERN = /\b(?:surgeon|provider|doctor|he|she)\b/i;

export const STAFF_ROLE_PATTERN = /\b(?:staff|nurse|tech|circulator)\b/i;

export const VISUALIZATION_CHALLENGE_VALUE = "visualization challenge before fixation";
export const EXTRA_VISUALIZATION_TIME_VALUE = "extra visualization time before fixation";
export const READINESS_DELAY_VALUE = "delay caused by readiness issue";
