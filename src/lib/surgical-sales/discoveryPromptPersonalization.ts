/**
 * Rapid Discovery prompts — third-person provider framing for reps (not "you").
 */

export function discoveryProviderDisplayName(
  contact: Record<string, unknown>,
): string {
  const name = String(
    contact.provider_display_name ??
      contact.display_name ??
      contact.full_name ??
      contact.name ??
      "",
  ).trim();
  return name || "this provider";
}

function providerPossessive(providerName: string): string {
  const trimmed = providerName.trim();
  if (!trimmed || trimmed === "this provider") return "their";
  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

/**
 * Rewrite second-person discovery copy to reference the provider by name.
 */
export function personalizeDiscoveryPromptForProvider(
  prompt: string,
  providerName: string,
): string {
  const name = providerName.trim() || "this provider";
  const possessive = providerPossessive(name);
  let text = prompt.trim();
  if (!text || !/\b(you|your)\b/i.test(text)) return text;

  const replacements: [RegExp, string][] = [
    [/\bAre you open\b/gi, `Is ${name} open`],
    [/\bHow do you prefer\b/gi, `How does ${name} prefer`],
    [/\bHow involved do you want\b/gi, `How involved does ${name} want`],
    [/\bWhat do you want\b/gi, `What does ${name} want`],
    [/\bWhat matters most to you\b/gi, `What matters most to ${name}`],
    [/\bwhen you need\b/gi, `when ${name} needs`],
    [/\bWhat must you validate\b/gi, `What must ${name} validate`],
    [/\bbefore you can be\b/gi, `before ${name} can be in the room`],
    [/\bHow should you stay in touch\b/gi, `How should reps stay in touch with ${name}`],
    [/\bwhat do you know\b/gi, `what is known about ${name}`],
    [/\bWhat can you confirm about\b/gi, `What is known about`],
    [/\byour case days\b/gi, `${possessive} case days`],
    [/\byour volume\b/gi, `${possessive} volume`],
    [/\byour cases\b/gi, `${possessive} cases`],
    [/\byour primary\b/gi, `${possessive} primary`],
    [/\byour highest-volume\b/gi, `${possessive} highest-volume`],
    [/\byour\b/gi, possessive],
    [/\bDo you\b/g, `Does ${name}`],
    [/\bAre you\b/g, `Is ${name}`],
    [/\bHow do you\b/gi, `How does ${name}`],
    [/\bWhat do you\b/gi, `What does ${name}`],
    [/\byou\b/gi, name],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s{2,}/g, " ").trim();
}
