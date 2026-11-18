import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { formatCaseIdentityProviderName } from "@/lib/surgical-sales/buildCaseIdentity";

import { normalizeSchedulerPersonName } from "@/lib/surgical-sales/sharedIntelligence/schedulerContactExtractionPolicy";



function normalizePersonNameToken(name: string): string {

  return name

    .toLowerCase()

    .replace(/^dr\.?\s+/i, "")

    .replace(/\s+/g, " ")

    .trim();

}



function extractPersonFromContactLabel(label: string | null | undefined): string | null {

  const trimmed = String(label ?? "").trim();

  if (!trimmed) return null;

  const head = trimmed.split("·")[0]?.trim();

  return head ? normalizeSchedulerPersonName(head) || head : null;

}



export function personNameMatchesProvider(

  personName: string | null | undefined,

  providerName: string | null | undefined,

): boolean {

  const person = normalizePersonNameToken(

    normalizeSchedulerPersonName(String(personName ?? "")) || String(personName ?? ""),

  );

  const provider = normalizePersonNameToken(

    formatCaseIdentityProviderName(providerName) || String(providerName ?? ""),

  );

  if (!person || !provider) return false;

  if (person === provider) return true;



  const personParts = person.split(" ").filter(Boolean);

  const providerParts = provider.split(" ").filter(Boolean);

  if (personParts.length === 1 && providerParts.includes(personParts[0]!)) return true;

  if (providerParts.length === 1 && personParts.includes(providerParts[0]!)) return true;

  // Surname-first artifacts ("Lettuce Today") still match the assigned provider.
  const providerSurname = providerParts[providerParts.length - 1];
  if (
    providerSurname &&
    personParts.length > 1 &&
    personParts[0] === providerSurname
  ) {
    return true;
  }

  return false;

}



export function evidenceLooksLikeObservedWithProvider(

  evidence: string,

  providerName: string | null | undefined,

): boolean {

  const provider = normalizePersonNameToken(formatCaseIdentityProviderName(providerName) || "");

  if (!provider) return false;



  const lastName = provider.split(" ").pop() ?? provider;

  return evidenceLooksLikeObservedWithPersonName(evidence, lastName);

}



function evidenceLooksLikeObservedWithPersonName(evidence: string, personName: string): boolean {

  const lastName = normalizePersonNameToken(personName).split(" ").pop() ?? personName;

  if (!lastName || lastName.length < 2) return false;



  const escapedLastName = lastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(

    `\\b(?:observed|observation|watching|shadowed|seeing|with|case with|(?:first|second|third|fourth|fifth|\\d+(?:st|nd|rd|th)) case)\\b[^.!?]{0,120}\\b(?:dr\\.?\\s+)?${escapedLastName}\\b`,

    "i",

  ).test(evidence);

}



/** True when evidence describes observing the named person in the OR — not a scheduler contact. */
export function evidenceDescribesObservationOfPerson(

  evidence: string,

  personName: string | null | undefined,

): boolean {

  const person = normalizePersonNameToken(

    normalizeSchedulerPersonName(String(personName ?? "")) || String(personName ?? ""),

  );

  if (!person) return false;

  return evidenceLooksLikeObservedWithPersonName(evidence, person);

}



function contactRoleMislabelsObservedSurgeon(input: {

  normalized_label?: string | null;

  evidence_text?: string | null;

}): boolean {

  const label = String(input.normalized_label ?? "").trim();

  const evidence = String(input.evidence_text ?? "").trim();

  if (!label || !/\bscheduling coordinator\b/i.test(label)) return false;



  const person = extractPersonFromContactLabel(label);

  if (!person) return false;



  if (evidenceDescribesObservationOfPerson(evidence, person)) return true;



  const head = label.split("·")[0]?.trim() ?? "";

  return (

    /^dr\.?\s+/i.test(head) &&

    /\b(?:observed|observation|case with|(?:first|second|third|fourth|fifth) case)\b/i.test(evidence)

  );

}



function evidenceLooksLikeProviderSentimentNotContact(
  evidence: string,
  personName: string | null | undefined,
  providerName: string | null | undefined,
): boolean {
  const evidenceText = String(evidence ?? "").trim();
  if (!evidenceText) return false;

  const person = normalizePersonNameToken(
    normalizeSchedulerPersonName(String(personName ?? "")) || String(personName ?? ""),
  );
  const provider = normalizePersonNameToken(formatCaseIdentityProviderName(providerName) || "");
  const surname = provider.split(" ").pop() ?? person.split(" ").pop() ?? "";
  if (!surname || surname.length < 2) return false;

  const escaped = surname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    String.raw`\b(?:dr\.?\s+)?${escaped}\b[^.!?]{0,48}\b(?:seemed|seems|appeared|appears|open|interested|receptive|willing)\b`,
    "i",
  ).test(evidenceText);
}

function contactLabelIsRoleOnly(person: string): boolean {
  return /\b(?:or manager|office manager|materials management|coordinator|scheduler|scheduling coordinator|key contact|credentialing contact)\b/i.test(
    person.trim(),
  );
}

/** The assigned surgeon must not surface as a scheduling contact chip. */
export function shouldRejectAssignedProviderContactRole(input: {
  concept: string;
  person_mentioned?: string | null;
  normalized_label?: string | null;
  evidence_text?: string | null;
  providerName?: string | null;
}): boolean {
  if (String(input.concept) !== "contact_role") return false;

  if (contactRoleMislabelsObservedSurgeon(input)) return true;

  const person =
    input.person_mentioned?.trim() ||
    extractPersonFromContactLabel(input.normalized_label) ||
    null;

  const normalizedPerson = person ? normalizeSchedulerPersonName(person) || person : null;
  if (
    normalizedPerson &&
    !contactLabelIsRoleOnly(normalizedPerson) &&
    !isPlausiblePersonName(normalizedPerson)
  ) {
    return true;
  }

  const providerName = String(input.providerName ?? "").trim();
  const evidence = String(input.evidence_text ?? "");

  if (providerName) {
    if (personNameMatchesProvider(normalizedPerson, providerName)) return true;
    if (evidenceLooksLikeObservedWithProvider(evidence, providerName)) return true;
    if (evidenceLooksLikeProviderSentimentNotContact(evidence, normalizedPerson, providerName)) {
      return true;
    }
  } else if (evidenceLooksLikeProviderSentimentNotContact(evidence, normalizedPerson, null)) {
    return true;
  }

  return false;
}


