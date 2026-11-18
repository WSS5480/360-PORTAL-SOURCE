import type { ObservationNoteExtraction } from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  isUsableObservationEntity,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";
import { observationEntityIntelligenceCategory } from "@/lib/surgical-sales/observationNoteEntityMapping";



function parseSnapshot(existing: unknown): Record<string, unknown> {

  if (!existing) return {};

  if (typeof existing === "string") {

    try {

      const parsed = JSON.parse(existing) as unknown;

      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};

    } catch {

      return {};

    }

  }

  if (typeof existing === "object") return existing as Record<string, unknown>;

  return {};

}



export function mergeObservationNoteIntoCaseSnapshot(

  existing: unknown,

  extraction: ObservationNoteExtraction,

): Record<string, unknown> {

  const snapshot = parseSnapshot(existing);

  const sectionMap = new Map<string, string[]>();



  if (Array.isArray(snapshot.sections)) {

    for (const entry of snapshot.sections) {

      if (!entry || typeof entry !== "object") continue;

      const id = String((entry as { id?: string }).id ?? "");

      const items = Array.isArray((entry as { items?: unknown }).items)

        ? (entry as { items: unknown[] }).items.map((item) => String(item))

        : [];

      if (id) sectionMap.set(id, items);

    }

  }



  for (const entity of extraction.entities) {
    if (!isUsableObservationEntity(entity)) continue;

    const finding = observationEntityFinding(entity);
    const categoryId = observationEntityIntelligenceCategory(entity.type, finding);

    if (!categoryId) continue;

    const line = finding.trim();

    if (!line) continue;

    const bucket = sectionMap.get(categoryId) ?? [];

    if (!bucket.includes(line)) bucket.push(line);

    sectionMap.set(categoryId, bucket);

  }



  const sections = [...sectionMap.entries()].map(([id, items]) => ({ id, items }));



  return {

    ...snapshot,

    sections,

    extracted_at: extraction.extractedAt,

    primary_category: extraction.primaryCategory,

  };

}


