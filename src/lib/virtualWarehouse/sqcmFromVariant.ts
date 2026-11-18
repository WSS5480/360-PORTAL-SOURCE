/** Sq cm for one unit of a variant (same rules as portal bulk pricing). */
export function sqcmFromVariant(v: {
  total_sqcm?: unknown;
  width_cm?: unknown;
  length_cm?: unknown;
  size_label?: unknown;
}): number {
  const direct = Number(v?.total_sqcm);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const w = Number(v?.width_cm);
  const l = Number(v?.length_cm);
  if (Number.isFinite(w) && Number.isFinite(l) && w > 0 && l > 0) return w * l;
  const sLabel = String(v?.size_label ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const m = sLabel.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)(?:cm)?$/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a * b;
  }
  return 0;
}
