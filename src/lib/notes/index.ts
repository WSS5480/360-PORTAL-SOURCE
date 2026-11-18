export {
  OPERATIONAL_NOTE_TYPES,
  OPERATIONAL_NOTE_TYPE_LABELS,
  OPERATIONAL_NOTE_SOURCES,
  OPERATIONAL_NOTE_ENTITY_TYPES,
  CreateOperationalNoteClientSchema,
  buildRelatedEntitiesForNote,
  defaultNoteTypeForEntity,
  mapOperationalNoteRow,
  operationalNoteTypeLabel,
  type CreateOperationalNoteClientInput,
  type CreateOperationalNoteParams,
  type OperationalNote,
  type OperationalNoteActor,
  type OperationalNoteContextDefaults,
  type OperationalNoteEntityType,
  type OperationalNoteSource,
  type OperationalNoteType,
} from "@/lib/notes/operationalNote";

export {
  createOperationalNote,
  mergeNoteInputWithContext,
  operationalNoteContextFromCaseRow,
  type CreateOperationalNoteResult,
} from "@/lib/notes/createOperationalNote";
