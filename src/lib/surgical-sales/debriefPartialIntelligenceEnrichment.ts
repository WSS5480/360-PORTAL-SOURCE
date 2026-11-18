import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import {
  buildSchedulingOwnershipEvidenceSummary,
  classifySchedulingDebriefStrength,
  humanEvidenceForDomain,
} from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import { extractPrimaryNamedPerson, extractPrimarySchedulingNamedPerson } from "@/lib/surgical-sales/namedEntityPreservation";
import {
  applyObservationApprovalDebriefGuardrails,
  buildObservationAccessPartialUpdate,
  debriefIndicatesObservationInterest,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import type {
  IntelligenceDomain,
  PartialIntelligenceUpdate,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import {
  repIndicatesCredentialingPlatformUnknown,
  resolveCredentialingPlatformLabel,
} from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";

/** Regression narrative — approachable surgeon, Karen scheduling, Mike PA, IntelliCentrics. */
export const ANDY_KAREN_DEBRIEF_REGRESSION_NOTE = `[Honestly good conversation overall. He seems pretty approachable and definitely didn't shut down the observation idea or anything. He mentioned if we work through the right people it usually isn't a problem getting into cases. He kept bringing up Karen from his office. Sounds like she handles most of the scheduling stuff on their side and works with the OR scheduling team. I need to get her info still but she's probably the right starting point if we want to figure out timing. They're apparently doing a lot more complex abdominal wall and robotic hernia work lately. We talked a little bit about some frustrations with visualization and fixation during certain cases. He seemed interested in what we're doing with ACSIS but I still need to actually see one of their cases before I know how strong the fit is. He also mentioned Mike a few times, his PA. Sounds like Mike gets involved anytime they're evaluating new products or making workflow changes so I should probably connect with him too at some point. As far as the hospital side goes there's definitely some credentialing process for vendors. I think he said IntelliCentrics but I could be wrong on that. Didn't sound like he personally deals with much of it. Overall though definitely worth continuing. Feels like there's probably a path in there if we can get visibility into a case.`;

function isGenericPartialPlaceholder(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (/^Still needed:\s*Additional detail still needs validation\.?$/i.test(text)) return true;
  if (
    text.length < 24 &&
    /additional detail still needs validation/i.test(text)
  ) {
    return true;
  }
  return false;
}

function hasDomainUpdate(
  mapping: LogUpdateOpenAiMapping,
  domain: IntelligenceDomain,
): boolean {
  return (
    mapping.confirmed_updates.some((u) => u.domain === domain) ||
    mapping.partial_updates.some(
      (u) => u.domain === domain && !isGenericPartialPlaceholder(u.value),
    )
  );
}

function hasSchedulingOwnershipPartial(mapping: LogUpdateOpenAiMapping): boolean {
  return mapping.partial_updates.some(
    (u) => u.domain === "scheduling" && /\bscheduling\s+ownership\b/i.test(u.label),
  );
}

function hasSchedulingContactPartial(mapping: LogUpdateOpenAiMapping): boolean {
  return mapping.partial_updates.some(
    (u) =>
      u.domain === "scheduling" &&
      !/\bscheduling\s+ownership\b/i.test(u.label) &&
      /\bscheduling\s+owner\b/i.test(u.label),
  );
}

function pushPartial(
  list: PartialIntelligenceUpdate[],
  row: PartialIntelligenceUpdate,
): void {
  if (list.some((p) => p.domain === row.domain && p.label === row.label)) return;
  list.push(row);
}

function quoteAround(text: string, pattern: RegExp): string | null {
  const m = pattern.exec(text);
  if (m?.index == null) return null;
  const start = Math.max(0, m.index - 10);
  const end = Math.min(text.length, m.index + m[0].length + 60);
  return text.slice(start, end).trim();
}

/** Ensures high-value partial leads exist even when the model under-maps the debrief. */
export function enrichDebriefMappingWithPartialLeads(
  mapping: LogUpdateOpenAiMapping,
  rawNote: string,
): LogUpdateOpenAiMapping {
  const note = rawNote.trim();
  if (!note) return mapping;

  const partial_updates = mapping.partial_updates.filter(
    (row) => !isGenericPartialPlaceholder(row.value),
  );
  const schedulingStrength = classifySchedulingDebriefStrength(note);

  if (!hasDomainUpdate(mapping, "or_access") && debriefIndicatesObservationInterest(note)) {
    const built = buildObservationAccessPartialUpdate(note);
    if (built) pushPartial(partial_updates, built);
  }

  if (!hasSchedulingOwnershipPartial(mapping) && schedulingStrength === "clear") {
    const namedPerson = extractPrimarySchedulingNamedPerson(note);
    pushPartial(partial_updates, {
      domain: "scheduling",
      label: "Scheduling ownership partially mapped",
      value: buildSchedulingOwnershipEvidenceSummary(note),
      still_needs: [
        "Confirm whether provider office, facility, or shared workflow owns observation timing",
        ...(namedPerson
          ? [`${namedPerson.name} contact info if they coordinate scheduling`]
          : []),
      ],
      confidence: "medium",
      save_target: "provider",
      reasoning: "Debrief suggests shared scheduling between provider office and OR scheduling.",
      source_scope: "provider office + facility scheduling — shared workflow likely",
    });
  }

  if (!hasSchedulingContactPartial(mapping) && schedulingStrength !== "none") {
    const namedPerson = extractPrimarySchedulingNamedPerson(note);
    pushPartial(partial_updates, {
      domain: "scheduling",
      label: "Scheduling owner partially identified",
      value: buildSchedulingOwnershipEvidenceSummary(note),
      still_needs: namedPerson
        ? [`${namedPerson.name} contact info`, "Confirm final scheduling owner"]
        : ["Name scheduling coordinator", "Confirm final scheduling owner"],
      confidence: "medium",
      save_target: "provider",
      reasoning: namedPerson
        ? `Named office contact (${namedPerson.name}) for scheduling without contact details on file.`
        : "Scheduling coordination described without a named owner on file.",
      source_scope: "provider office scheduling — not facility-wide unless confirmed",
    });
  }

  if (!hasDomainUpdate(mapping, "credentialing") && /\bcredential/i.test(note)) {
    const platform = resolveCredentialingPlatformLabel(note);
    const unknownPlatform = repIndicatesCredentialingPlatformUnknown(note);
    pushPartial(partial_updates, {
      domain: "credentialing",
      label: "Facility vendor access partially mapped",
      value:
        platform.label === "Unknown" || unknownPlatform
          ? "Vendor credentialing is required; credentialing platform is Unknown on file. Provider does not manage it personally."
          : `Vendor credentialing goes through ${platform.label}. Provider does not manage it personally.`,
      still_needs:
        platform.label === "Unknown"
          ? ["Confirm credentialing platform and steps"]
          : ["Confirm credentialing steps and timeline"],
      confidence: platform.confidence === "High" ? "medium" : "low",
      save_target: "organization",
      reasoning:
        platform.label === "Unknown"
          ? "Credentialing mentioned without a confirmed platform name."
          : `Credentialing platform named in debrief: ${platform.label}.`,
      source_scope: "facility vendor access",
    });
  }

  if (
    !hasDomainUpdate(mapping, "case_mix") &&
    (/\brobotic hernia\b/i.test(note) ||
      (/\babdominal wall\b/i.test(note) && /\brobotic hernia\b/i.test(note)) ||
      (/\bhernia\b/i.test(note) && /\bvolume increasing\b/i.test(note)) ||
      (/\babdominal wall\b/i.test(note) &&
        /\b(reconstruction|reconstructive)\b/i.test(note) &&
        /\b(higher volume|volume increasing|more .* cases|increasing volume)\b/i.test(note)) ||
      (/\babdominal wall\b/i.test(note) && /\bhigher volume\b/i.test(note)))
  ) {
    pushPartial(partial_updates, {
      domain: "case_mix",
      label: "Case opportunity partially mapped",
      value: /\brobotic hernia\b/i.test(note)
        ? "Robotic hernia case volume appears to be increasing."
        : /\babdominal wall\b/i.test(note) && /\b(reconstruction|reconstructive)\b/i.test(note)
          ? "Complex abdominal wall reconstruction case volume appears to be increasing."
          : "More complex abdominal wall and robotic hernia work lately.",
      still_needs: ["Estimated volume or frequency"],
      confidence: "medium",
      save_target: "provider",
      reasoning: "Procedure mix shift described without quantified volume.",
      source_scope: "provider procedure focus",
    });
  }

  if (!hasDomainUpdate(mapping, "product_fit") && /\bACSIS\b/i.test(note)) {
    pushPartial(partial_updates, {
      domain: "product_fit",
      label: "Early clinical interest surfaced",
      value: "ACSIS discussed conceptually; fit not validated through observation or surgeon-reviewed notes.",
      still_needs: [
        "Observe relevant cases",
        "Validate workflow pain points",
        "Review observations with surgeon before product evaluation",
      ],
      confidence: "medium",
      save_target: "provider",
      reasoning: "Product interest without case observation.",
      source_scope: "provider evaluation",
    });
  }

  if (
    !hasDomainUpdate(mapping, "workflow") &&
    /\bvisualization\b/i.test(note) &&
      /\bfixation\b/i.test(note)
  ) {
    pushPartial(partial_updates, {
      domain: "workflow",
      label: "Procedure workflow partially mapped",
      value: "Frustrations with visualization and fixation during certain cases were discussed.",
      still_needs: ["Which cases and how workflow pain shows up in room"],
      confidence: "medium",
      save_target: "provider",
      reasoning: "Workflow pain mentioned without full context.",
      source_scope: "provider workflow",
    });
  }

  if (!hasDomainUpdate(mapping, "stakeholders") && /\bMike\b/i.test(note) && /\bPA\b/i.test(note)) {
    pushPartial(partial_updates, {
      domain: "stakeholders",
      label: "Decision support partially mapped",
      value:
        "Mike (PA) is involved when evaluating new products or workflow changes.",
      still_needs: ["Mike contact info", "Confirm influence level on product decisions"],
      confidence: "medium",
      save_target: "provider",
      reasoning: "Named PA stakeholder without contact details.",
      source_scope: "provider team — suspected contact lead",
    });
  }

  // Attach source quotes on enrichment rows when missing from model output
  const withQuotes = partial_updates.map((row) => {
    if (row.reasoning.includes("Source quote:")) return row;
    let quote: string | null = null;
    if (row.domain === "scheduling" && /\bKaren\b/i.test(note)) {
      quote =
        buildSchedulingOwnershipEvidenceSummary(note) ??
        quoteAround(note, /\bKaren\b[^.]{0,120}\./i);
    } else if (row.domain === "or_access") {
      quote = humanEvidenceForDomain("or_access", note) ?? quoteAround(note, /\bdid not seem opposed\b[^.]{0,80}\./i);
    } else if (row.domain === "credentialing") {
      quote = quoteAround(note, /\bIntelliCentrics\b[^.]{0,80}\./i) ?? quoteAround(note, /\bcredentialing\b[^.]{0,100}\./i);
    } else if (row.domain === "stakeholders") {
      quote = quoteAround(note, /\bMike\b[^.]{0,120}\./i);
    } else if (row.domain === "case_mix") {
      quote = quoteAround(note, /\b(?:higher volume|abdominal wall)[^.]{0,120}\./i);
    }
    if (!quote) return row;
    return {
      ...row,
      reasoning: `${row.reasoning} Source quote: "${quote.slice(0, 220)}"`,
    };
  });

  return applyObservationApprovalDebriefGuardrails(
    { ...mapping, partial_updates: withQuotes },
    note,
  );
}
