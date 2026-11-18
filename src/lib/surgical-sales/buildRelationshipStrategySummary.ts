/** Compact relationship strategy line(s) from provider contact columns. */

export function buildRelationshipStrategySummary(contact: Record<string, unknown>): string | null {
  const parts: string[] = [];

  const influence = String(contact.influence_level ?? "").trim();
  if (influence && influence !== "unknown") {
    parts.push(`Influence: ${influence.replace(/_/g, " ")}`);
  }

  const decisionMaker = String(contact.provider_decision_maker_status ?? "").trim();
  if (decisionMaker) parts.push(`Decision-maker: ${decisionMaker}`);

  const champion = String(contact.provider_champion_potential ?? "").trim();
  if (champion) parts.push(`Champion potential: ${champion}`);

  const contactMethod = String(contact.preferred_contact_method ?? "").trim();
  if (contactMethod && contactMethod !== "unknown") {
    parts.push(`Contact style: ${contactMethod.replace(/_/g, " ")}`);
  }

  const followUp = String(contact.provider_follow_up_approach ?? "").trim();
  if (followUp) parts.push(followUp);

  const strategyNotes = String(contact.provider_rep_strategy_notes ?? "").trim();
  if (strategyNotes) parts.push(strategyNotes);

  return parts.length > 0 ? parts.join(" · ") : null;
}
