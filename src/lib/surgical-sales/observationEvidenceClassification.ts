/** Rep explicitly lacks evidence — do not infer findings from these fragments. */
export function isUnknownEvidenceStatement(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return true;
  return (
    /\bneed\s+(?:a\s+)?few\s+more\s+cases\b/.test(lower) ||
    /\bneed\s+more\s+(?:cases|observations)\b/.test(lower) ||
    /\bnot\s+sure\b/.test(lower) ||
    /\btoo\s+early\s+(?:for\s+me\s+)?to\s+(?:tell|know)\b/.test(lower) ||
    /\btoo\s+early\s+for\b/.test(lower) ||
    /\bwhere\s+the\s+pain\s+points\s+are\b/.test(lower) ||
    /\bdon't\s+know\s+(?:yet|where)\b/.test(lower) ||
    /\bhard\s+to\s+say\b/.test(lower)
  );
}

/** Absence of complaints or issues — not positive pain-point evidence. */
export function isNegativeEvidenceStatement(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  return (
    /\b(?:didn't|did not|don't|do not)\s+hear\b/.test(lower) ||
    /\b(?:didn't|did not|don't|do not)\s+(?:see|notice)\b/.test(lower) ||
    /\bno\s+one\s+(?:complain|mentioned|reported)\b/.test(lower) ||
    /\bnobody\s+(?:complain|mentioned|reported)\b/.test(lower) ||
    /\bno\s+(?:real\s+)?(?:pain\s+points?|complaints?|issues?)\b/.test(lower) ||
    /\bwithout\s+(?:any\s+)?complaints?\b/.test(lower) ||
    /\bno\s+one\s+had\s+issues\b/.test(lower) ||
    /\b(?:seemed|was)\s+fine\b/.test(lower) ||
    /\bwithout\s+problems\b/.test(lower) ||
    /\bno\s+complaints\b/.test(lower)
  );
}

export function isStaffPainFinding(finding: string): boolean {
  const lower = finding.trim().toLowerCase();
  if (!lower) return false;
  if (/\b(organized|comfortable|efficient|prepared|smooth|coordinated)\b/.test(lower)) {
    return false;
  }
  return /\b(delay|frustrat|trouble|pain|complain|setup|availability|opening|struggl|issue|concern)\b/.test(
    lower,
  );
}

export function isStaffWorkflowFinding(finding: string): boolean {
  const lower = finding.trim().toLowerCase();
  return /\b(organized|comfortable|efficient|prepared|smooth|coordinated|appeared)\b/.test(lower);
}

export function isCurrentProductInUseEvidence(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (isUnknownEvidenceStatement(text) || isNegativeEvidenceStatement(text)) return false;
  return (
    /\b(?:still\s+)?using\b/.test(lower) ||
    /\b(?:primary|standard)\s+(?:product|mesh|tray)\b/.test(lower) ||
    /\bon\s+pretty\s+much\s+everything\b/.test(lower)
  );
}
