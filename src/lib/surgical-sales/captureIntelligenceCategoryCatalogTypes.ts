export type CaptureIntelligenceCategoryCatalogRow = {
  id: string;
  label: string;
  description?: string;
  details: string[];
};

export type CaptureIntelligenceCategoryCatalogGroup = {
  id: string;
  title: string;
  description: string;
  rows: CaptureIntelligenceCategoryCatalogRow[];
};

export type CaptureIntelligenceCategoryCatalogStats = {
  groupCount: number;
  totalRows: number;
};
