/**
 * Universal rep-facing titles for next-action / follow-up intelligence.
 * Converts narrative dictation fragments into concise imperative tasks.
 */

const MAX_TITLE_LENGTH = 120;

function finalizeTitle(text: string): string {
  const trimmed = text.trim().replace(/\.$/, "").replace(/\s+/g, " ");
  if (!trimmed) return "";
  const capped =
    trimmed.length > MAX_TITLE_LENGTH
      ? `${trimmed.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
      : trimmed;
  return capped.charAt(0).toUpperCase() + capped.slice(1);
}

function looksLikeCleanTaskTitle(text: string): boolean {
  return (
    text.length <= 90 &&
    !/^(?:i |my |asked me|i told|he asked|she asked|they asked|we )/i.test(text) &&
    !/\b(?:i'd|i'll|be happy to|in the future|asked me to)\b/i.test(text) &&
    !/^.*\bnext steps?\b\s*(?:are|is)\s+to\b/i.test(text) &&
    !/^get\s+[a-z]+(?:'s)?\s+(?:phone|email)\b/i.test(text) &&
    !/^confirm the\b/i.test(text) &&
    !/\bbetter understand\b/i.test(text)
  );
}

function stripNextStepBoilerplate(text: string): string {
  return text
    .replace(/^.*?\bnext steps?\b\s*(?:are|were|will be|is)?\s*(?:to\b)?\s*/i, "")
    .replace(/^my next step is to\s*/i, "")
    .replace(/^i\s+(?:plan|need|intend|want|am going)\s+to\s*/i, "")
    .replace(/^(?:we|i)\s+(?:should|will|'ll)\s*/i, "")
    .replace(/^follow[\s-]?up(?:\s+(?:to|on|with|by))?\s*/i, "Follow up ")
    .trim();
}

function extractThirdPartyRequestClause(text: string): string {
  const match = text.match(/\b(?:asked|requested|wants?) me to\s+(.+)$/i);
  if (!match?.[1]) return text;
  return `asked me to ${match[1].trim()}`;
}

function rewriteThirdPartyRequest(text: string): string {
  const clause = extractThirdPartyRequestClause(text);
  const match = clause.match(/^(?:asked|requested|wants?) me to\s+(.+)$/i);
  if (!match?.[1]) return text;

  const action = match[1].replace(/\.$/, "").trim();
  const emailPronoun = action.match(/^email\s+(?:her|him|them)\b(.*)$/i);
  if (emailPronoun) {
    const rest = (emailPronoun[1] ?? "").trim();
    if (/\b(?:dates?|times?|availability|available)\b/i.test(rest)) {
      return /\b(?:observation|case|schedul|next month)\b/i.test(rest)
        ? "Email proposed observation dates"
        : "Email proposed dates";
    }
    if (/\b(?:contact|information|details)\b/i.test(rest)) {
      return "Email requested contact information";
    }
    return rest ? `Email ${rest}` : "Send email follow-up";
  }

  const sendPronoun = action.match(/^send\s+(?:her|him|them)\b(.*)$/i);
  if (sendPronoun) {
    const rest = (sendPronoun[1] ?? "").trim();
    if (/\b(?:dates?|times?|availability|materials?|data|information)\b/i.test(rest)) {
      return rest ? `Send ${rest}` : "Send requested materials";
    }
  }

  return action.charAt(0).toUpperCase() + action.slice(1);
}

function rewriteRepOfferedCommitment(text: string): string {
  const hadRepOffer =
    /^i told\b/i.test(text) ||
    /\bi(?:'d|'ll|\s+would)\s*(?:be happy to\s*)?/i.test(text);

  let action = text
    .replace(/^i told (?:him|her|them|(?:the )?(?:provider|surgeon|doctor|dr\.?\s+[a-z]+))\s+(?:that\s+)?/i, "")
    .replace(/^i(?:'d|'ll|\s+would)\s*(?:be happy to\s*)?/i, "")
    .replace(/\s+in the future\b/gi, "")
    .trim();

  if (!hadRepOffer && action === text) return text;

  const parts: string[] = [];
  if (
    /\b(?:bring|share|send|provide)\b[^.]{0,100}\b(?:comparative\s+)?clinical\s+data\b/i.test(action)
  ) {
    parts.push("Share comparative clinical data");
  } else if (
    /\b(?:bring|share|send|provide)\b[^.]{0,80}\b(?:data|materials?|information|papers?|studies)\b/i.test(
      action,
    )
  ) {
    parts.push("Share clinical data and materials");
  }

  if (/\b(?:set up|schedule|arrange)\b[^.]{0,40}\b(?:an?\s+)?observation\s+case\b/i.test(action)) {
    parts.push("Schedule observation case");
  } else if (/\b(?:set up|schedule|arrange)\b[^.]{0,40}\bobservation\b/i.test(action)) {
    parts.push("Schedule observation");
  }

  if (parts.length > 0) {
    return parts
      .map((part, index) => (index === 0 ? part : part.charAt(0).toLowerCase() + part.slice(1)))
      .join(" and ");
  }

  action = action
    .replace(/^(?:bring|share|send|provide)\s+(?:some\s+)?/i, "")
    .replace(/\s+and set up\b/i, " and schedule")
    .trim();
  return action || text;
}

function rewriteConnectWithScheduling(text: string): string {
  const observationMatch = text.match(
    /^connect with ([A-Z][a-z]+)\b(?:[^.]{0,180}?)(?:determine whether )?(?:observation access can be arranged for )?(?:an? )?upcoming\s+(.+?)\s+(?:case|observation)/i,
  );
  if (observationMatch?.[1] && observationMatch?.[2]) {
    return `Connect with ${observationMatch[1]} and line up ${observationMatch[2].trim()} observation`;
  }

  const lineUpMatch = text.match(
    /^connect with ([A-Z][a-z]+)\b[^.]{0,120}?\b(?:about|on|regarding)\s+scheduling\b[^.]{0,80}?(?:and\s+)?line up an? (.+?) observation/i,
  );
  if (lineUpMatch?.[1] && lineUpMatch?.[2]) {
    return `Connect with ${lineUpMatch[1]} and line up ${lineUpMatch[2].trim()} observation`;
  }

  const requirementsMatch = text.match(
    /^connect with ([A-Z][a-z]+)\b(?:\s+(?:regarding|about|on)\s+)(scheduling requirements(?:[^.]{0,120})?)/i,
  );
  if (requirementsMatch?.[1] && requirementsMatch?.[2]) {
    const tail = requirementsMatch[2]
      .replace(/\s+and determine whether observation access can be arranged.*$/i, "")
      .replace(/\.$/, "")
      .trim();
    return `Connect with ${requirementsMatch[1]} on ${tail}`;
  }

  const simpleMatch = text.match(/^connect with ([A-Z][a-z]+)\b(?:\s+(?:regarding|about|on)\s+(.+))?$/i);
  if (simpleMatch?.[1]) {
    const tail = simpleMatch[2]?.replace(/\.$/, "").trim();
    return tail ? `Connect with ${simpleMatch[1]} on ${tail}` : `Connect with ${simpleMatch[1]}`;
  }

  return text;
}

function rewriteSendToNamedContact(text: string): string {
  const match = text.match(/^send ([A-Z][a-z]+)\b(.+)$/i);
  if (!match?.[1]) return text;

  const rest = (match[2] ?? "").trim();
  if (/\b(?:available )?(?:observation )?dates?\b/i.test(rest)) {
    if (/schedule my first case/i.test(rest)) {
      return `Send ${match[1]} available observation dates and schedule first case`;
    }
    return `Send ${match[1]} available observation dates`;
  }

  return text;
}

function rewriteObservationOpportunity(text: string): string {
  const observationMatch = text.match(
    /upcoming\s+(.+?)\s+(?:cases?\s+)?(?:might be\s+)?(?:available\s+for\s+)?observation/i,
  );
  if (observationMatch?.[1]) {
    return `Identify upcoming ${observationMatch[1].trim()} observation opportunities`;
  }
  return text;
}

function rewriteIdentifyContactInfo(text: string): string {
  if (!/^identify\s+/i.test(text)) return text;

  const observationLine = rewriteObservationOpportunity(text);
  if (observationLine !== text) return observationLine;

  let rewritten = text.replace(/^identify\s+/i, "Get ");
  if (!/contact information$/i.test(rewritten)) {
    rewritten = `${rewritten} contact information`;
  }
  return rewritten;
}

/**
 * Normalize any next-action source text (evidence fragment, card title, or summary line)
 * into a concise rep-facing task title.
 */
export function normalizeNextActionDisplayTitle(raw: string): string {
  let text = raw.trim().replace(/\.$/, "").replace(/\s+/g, " ");
  if (!text) return "";

  if (looksLikeCleanTaskTitle(text)) {
    return finalizeTitle(text);
  }

  text = stripNextStepBoilerplate(text);
  if (/\b(?:asked|requested|wants?) me to\b/i.test(text) && !/^asked me to\b/i.test(text)) {
    text = extractThirdPartyRequestClause(text);
  }
  text = rewriteThirdPartyRequest(text);
  text = rewriteRepOfferedCommitment(text);
  text = rewriteConnectWithScheduling(text);
  text = rewriteSendToNamedContact(text);

  text = text.replace(/^get\s+([a-z]+)'s\s+phone\s+or\s+email$/i, "Get $1 contact information");
  text = text.replace(/^get\s+([a-z]+)\s+contact\s+information$/i, "Get $1 contact information");

  text = rewriteIdentifyContactInfo(text);

  if (/^confirm\s+/i.test(text)) {
    text = text.replace(/^confirm\s+the\s+/i, "Confirm ").replace(/^confirm\s+/i, "Confirm ");
  }

  if (/\bbetter understand\b/i.test(text)) {
    const observationLine = rewriteObservationOpportunity(text);
    if (observationLine !== text) {
      text = observationLine;
    } else {
      text = text.replace(/\bbetter understand\b/i, "Identify");
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }
  }

  return finalizeTitle(text);
}
