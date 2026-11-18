/**
 * Credentialing platform labels from debrief dictation — no invented vendor names.
 */

const PLATFORM_UNCERTAINTY_NEAR_RE =
  /\b(?:could be wrong|might be wrong|not sure|unsure|wasn'?t\s+sure|was not sure|don'?t know|do not know|unclear|unknown|maybe|might have said|think (?:he|she|they) said|probably|possibly|whether\s+that)\b/i;

const KNOWN_PLATFORM_TOKEN_RE =
  /\b(?:intellicentrics|symplr|vendormate|vendor\s*mate|green\s*security|ghx|reptrax)\b/i;

const PLATFORM_CONFIRMED_USE_RE =
  /\b(?:use|uses|using|managed\s+through|goes\s+through|runs?\s+on)\s+(?:intellicentrics|symplr|vendormate|vendor\s*mate|green\s*security|ghx|reptrax)\b/i;

export function repIndicatesCredentialingPlatformUnknown(dictation: string): boolean {
  const text = dictation.trim();
  if (!text) return false;
  if (/\b(?:platform|system)\s+(?:is\s+)?unknown\b/i.test(text)) return true;
  if (/\b(?:don't|do not)\s+know\s+(?:what\s+)?(?:platform|system)\b/i.test(text)) return true;
  if (/\bneed to figure out what (?:platform|system)\b/i.test(text)) return true;
  if (/\bcredentialing platform\b/i.test(text) && PLATFORM_UNCERTAINTY_NEAR_RE.test(text)) {
    return true;
  }
  const intellicentricsMention = /\bIntelliCentrics\b/i.exec(text);
  if (intellicentricsMention?.index != null) {
    const window = text.slice(
      Math.max(0, intellicentricsMention.index - 80),
      intellicentricsMention.index + 80,
    );
    if (PLATFORM_UNCERTAINTY_NEAR_RE.test(window)) return true;
  }
  return false;
}

export function resolveCredentialingPlatformLabel(dictation: string): {
  label: string;
  confidence: "High" | "Medium" | "Low";
  invented: boolean;
} {
  const text = dictation.trim();
  if (!/\bcredential/i.test(text)) {
    return { label: "", confidence: "Low", invented: false };
  }

  if (repIndicatesCredentialingPlatformUnknown(text)) {
    return { label: "Unknown", confidence: "Medium", invented: false };
  }

  if (PLATFORM_CONFIRMED_USE_RE.test(text)) {
    const token = text.match(KNOWN_PLATFORM_TOKEN_RE)?.[0] ?? "";
    if (token) {
      const key = token.toLowerCase().replace(/\s+/g, "");
      const label =
        key === "intellicentrics"
          ? "IntelliCentrics"
          : key.charAt(0).toUpperCase() + key.slice(1);
      return { label, confidence: "High", invented: false };
    }
  }

  if (KNOWN_PLATFORM_TOKEN_RE.test(text)) {
    return { label: "Unknown", confidence: "Medium", invented: false };
  }

  return {
    label: "Unknown",
    confidence: "Medium",
    invented: false,
  };
}
