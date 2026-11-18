export const ADMIN_SETUP_STEP_IDS = [
  "company",
  "products",
  "playbooks",
  "documents",
  "territories",
  "users",
  "intelligence",
  "review",
] as const;

export type AdminSetupStepId = (typeof ADMIN_SETUP_STEP_IDS)[number];

export type AdminSetupProductSummary = {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
  updatedAt: string | null;
};

export type AdminSetupPlaybookSummary = {
  id: string;
  name: string;
  status: string;
  productLine: string | null;
  engagementType: string | null;
  isSystem: boolean;
  scope: "company" | "user";
};

export type AdminSetupTerritorySummary = {
  territory: string;
  facilityCount: number;
  facilities: { id: string; name: string; type: string | null; status: string | null }[];
};

export type AdminSetupSalesRepSummary = {
  id: string;
  email: string | null;
  name: string | null;
  coveredStates: string[];
  isTerritoryManager: boolean;
  managerUserId: string | null;
};

export type AdminSetupUserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  roles: string[];
  lastSignInAt: string | null;
  managerUserId: string | null;
  managedRepIds: string[];
};

export type AdminSetupIntelligenceSummary = {
  captureCategoryCount: number;
  debriefCategoryCount: number;
  optionalCategoryCount: number;
  catalogGroupCount: number;
  catalogRowCount: number;
  leaderboardEnabledMetricCount: number;
  leaderboardUpdatedAt: string | null;
};

export type AdminSetupSnapshot = {
  loadedAt: string;
  company: {
    salesProductCount: number;
    activeSalesProductCount: number;
    specialtyCategories: string[];
  };
  products: AdminSetupProductSummary[];
  playbooks: {
    total: number;
    systemCount: number;
    systemSeedCount: number;
    activeCount: number;
    items: AdminSetupPlaybookSummary[];
  };
  territories: {
    totalFacilities: number;
    territoryCount: number;
    items: AdminSetupTerritorySummary[];
    stateCounts: Record<string, number>;
    unmappedCount: number;
    repCoverageByState: Record<string, number>;
  };
  users: {
    adminCount: number;
    salesRepCount: number;
    territoryManagerCount: number;
    salesReps: AdminSetupSalesRepSummary[];
    team: AdminSetupUserSummary[];
  };
  intelligence: AdminSetupIntelligenceSummary;
  documents: {
    folderCount: number;
    fileCount: number;
    repVisibleFolderCount: number;
  };
};
