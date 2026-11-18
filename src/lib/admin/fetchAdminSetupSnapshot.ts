import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildCaptureIntelligenceCategoryCatalog,
  captureIntelligenceCategoryCatalogStats,
} from "@/lib/surgical-sales/buildCaptureIntelligenceCategoryCatalog";
import { DEBRIEF_INTELLIGENCE_CATEGORIES } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import { INTELLIGENCE_CAPTURE_CATEGORY_DEFS } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { OPTIONAL_INTELLIGENCE_CATEGORIES } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import { fetchAdminLeaderboardConfigPayload } from "@/lib/surgical-sales/leaderboardConfigDb";
import { ensurePreCallPlanSystemTemplates } from "@/lib/surgical-sales/preCallPlanTemplateDb";
import { PRE_CALL_PLAN_TEMPLATE_SEEDS } from "@/lib/surgical-sales/preCallPlanTemplateSeeds";
import { normalizeStateToTileCode } from "@/lib/admin/usStateTiles";
import type { AdminSetupSnapshot } from "@/lib/admin/adminSetupTypes";

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function warnOptionalQueryError(label: string, error: { message: string } | null) {
  if (error) console.warn(`[fetchAdminSetupSnapshot] ${label}:`, error.message);
}

export async function fetchAdminSetupSnapshot(): Promise<AdminSetupSnapshot> {
  await ensurePreCallPlanSystemTemplates();

  const [
    salesProductsRes,
    playbooksRes,
    facilitiesRes,
    internalUsersRes,
    salesRepsRes,
    territoryManagersRes,
    repCoverageRes,
    repManagerRes,
    authUsersRes,
    profilesRes,
    leaderboardPayload,
    documentFoldersRes,
    documentFilesRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("surgical_sales_products")
      .select("id, name, category, active, updated_at")
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("sales_pre_call_plan_templates")
      .select("id, name, status, product_line, template_engagement_type, is_system, owner_user_id")
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("sales_organizations")
      .select("id, name, surgical_crm_type, surgical_crm_status, surgical_crm_billing_state")
      .is("surgical_crm_archived_at", null)
      .order("name", { ascending: true })
      .limit(500),
    supabaseAdmin.from("internal_users").select("user_id, role"),
    supabaseAdmin.from("user_profiles").select("user_id").eq("is_internal_sales_rep", true),
    supabaseAdmin.from("user_profiles").select("user_id").eq("is_territory_manager", true),
    supabaseAdmin.from("sales_rep_state_coverage").select("user_id, state_code"),
    supabaseAdmin.from("sales_rep_manager_assignments").select("rep_user_id, manager_user_id"),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    supabaseAdmin.from("user_profiles").select("user_id, full_name, email"),
    fetchAdminLeaderboardConfigPayload(),
    supabaseAdmin.from("sales_command_document_folders").select("id, access_level"),
    supabaseAdmin.from("sales_command_document_files").select("id", { count: "exact", head: true }),
  ]);

  if (salesProductsRes.error) throw new Error(salesProductsRes.error.message);
  if (playbooksRes.error) throw new Error(playbooksRes.error.message);
  if (facilitiesRes.error) throw new Error(facilitiesRes.error.message);
  if (authUsersRes.error) throw new Error(authUsersRes.error.message);

  warnOptionalQueryError("internal_users", internalUsersRes.error);
  warnOptionalQueryError("user_profiles.is_internal_sales_rep", salesRepsRes.error);
  warnOptionalQueryError("user_profiles.is_territory_manager", territoryManagersRes.error);
  warnOptionalQueryError("sales_rep_state_coverage", repCoverageRes.error);
  warnOptionalQueryError("sales_rep_manager_assignments", repManagerRes.error);
  warnOptionalQueryError("sales_command_document_folders", documentFoldersRes.error);
  warnOptionalQueryError("sales_command_document_files", documentFilesRes.error);

  const products = (salesProductsRes.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "").trim() || "Unnamed product",
    category: row.category ? String(row.category) : null,
    active: row.active !== false,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }));

  const playbookItems = (playbooksRes.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "").trim() || "Unnamed playbook",
    status: String(row.status ?? "active"),
    productLine: row.product_line ? String(row.product_line) : null,
    engagementType: row.template_engagement_type ? String(row.template_engagement_type) : null,
    isSystem: row.is_system === true,
    scope: row.owner_user_id ? ("user" as const) : ("company" as const),
  }));

  const territoryMap = new Map<string, AdminSetupSnapshot["territories"]["items"][number]>();
  const stateCounts: Record<string, number> = {};
  let unmappedCount = 0;
  for (const row of facilitiesRes.data ?? []) {
    const rawState = String(row.surgical_crm_billing_state ?? "").trim();
    const tileCode = normalizeStateToTileCode(rawState);
    if (tileCode) {
      stateCounts[tileCode] = (stateCounts[tileCode] ?? 0) + 1;
    } else {
      unmappedCount += 1;
    }

    const territory = tileCode ?? (rawState || "Unassigned");
    const existing = territoryMap.get(territory) ?? {
      territory,
      facilityCount: 0,
      facilities: [],
    };
    existing.facilityCount += 1;
    if (existing.facilities.length < 8) {
      existing.facilities.push({
        id: String(row.id),
        name: String(row.name ?? "").trim() || "Unnamed facility",
        type: row.surgical_crm_type ? String(row.surgical_crm_type) : null,
        status: row.surgical_crm_status ? String(row.surgical_crm_status) : null,
      });
    }
    territoryMap.set(territory, existing);
  }

  const territoryItems = [...territoryMap.values()].sort((a, b) => {
    if (a.territory === "Unassigned") return 1;
    if (b.territory === "Unassigned") return -1;
    return b.facilityCount - a.facilityCount || a.territory.localeCompare(b.territory);
  });

  const internalUserIds = new Set((internalUsersRes.data ?? []).map((row) => String(row.user_id)));
  const salesRepIds = new Set((salesRepsRes.data ?? []).map((row) => String(row.user_id)));
  const territoryManagerIds = new Set((territoryManagersRes.data ?? []).map((row) => String(row.user_id)));

  const coverageByUserId = new Map<string, string[]>();
  const repCoverageByState: Record<string, number> = {};
  for (const row of repCoverageRes.data ?? []) {
    const userId = String(row.user_id ?? "");
    const stateCode = String(row.state_code ?? "").trim().toUpperCase();
    if (!userId || !stateCode) continue;
    const existing = coverageByUserId.get(userId) ?? [];
    existing.push(stateCode);
    coverageByUserId.set(userId, existing);
    repCoverageByState[stateCode] = (repCoverageByState[stateCode] ?? 0) + 1;
  }
  for (const [userId, states] of coverageByUserId) {
    coverageByUserId.set(userId, [...new Set(states)].sort());
  }

  const managerByRepId = new Map<string, string>();
  const managedRepsByManagerId = new Map<string, string[]>();
  for (const row of repManagerRes.data ?? []) {
    const repUserId = String(row.rep_user_id ?? "");
    const managerUserId = String(row.manager_user_id ?? "");
    if (!repUserId || !managerUserId) continue;
    managerByRepId.set(repUserId, managerUserId);
    const existing = managedRepsByManagerId.get(managerUserId) ?? [];
    existing.push(repUserId);
    managedRepsByManagerId.set(managerUserId, existing);
  }
  for (const [managerUserId, repIds] of managedRepsByManagerId) {
    managedRepsByManagerId.set(managerUserId, [...new Set(repIds)]);
  }

  const profileById = new Map<string, { name: string | null; email: string | null }>();
  for (const row of profilesRes.data ?? []) {
    const id = String(row.user_id ?? "");
    if (!id) continue;
    profileById.set(id, {
      name: row.full_name ? String(row.full_name) : null,
      email: row.email ? String(row.email) : null,
    });
  }

  const relevantUserIds = new Set([...internalUserIds, ...salesRepIds, ...territoryManagerIds]);
  const authUsers = (authUsersRes.data?.users ?? []).filter((user) => relevantUserIds.has(user.id));

  const team = authUsers
    .map((user) => {
      const profile = profileById.get(user.id);
      const roles: string[] = [];
      if (internalUserIds.has(user.id)) roles.push("Admin");
      if (salesRepIds.has(user.id)) roles.push("Sales rep");
      if (territoryManagerIds.has(user.id)) roles.push("Territory manager");
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? null,
        name: profile?.name ?? null,
        roles,
        lastSignInAt: user.last_sign_in_at ?? null,
        managerUserId: managerByRepId.get(user.id) ?? null,
        managedRepIds: managedRepsByManagerId.get(user.id) ?? [],
      };
    })
    .sort((a, b) => {
      const roleRank = (roles: string[]) =>
        roles.includes("Admin") ? 0 : roles.includes("Territory manager") ? 1 : roles.includes("Sales rep") ? 2 : 3;
      const diff = roleRank(a.roles) - roleRank(b.roles);
      if (diff !== 0) return diff;
      return (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "");
    })
    .slice(0, 24);

  const salesReps = authUsers
    .filter((user) => salesRepIds.has(user.id))
    .map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? null,
        name: profile?.name ?? null,
        coveredStates: coverageByUserId.get(user.id) ?? [],
        isTerritoryManager: territoryManagerIds.has(user.id),
        managerUserId: managerByRepId.get(user.id) ?? null,
      };
    })
    .sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));

  const catalog = buildCaptureIntelligenceCategoryCatalog();
  const catalogStats = captureIntelligenceCategoryCatalogStats(catalog);

  const documentFolders = documentFoldersRes.data ?? [];
  const repVisibleFolderCount = documentFolders.filter((row) => row.access_level !== "admin_only").length;

  return {
    loadedAt: new Date().toISOString(),
    company: {
      salesProductCount: products.length,
      activeSalesProductCount: products.filter((product) => product.active).length,
      specialtyCategories: uniqueSorted(products.map((product) => product.category)),
    },
    products,
    playbooks: {
      total: playbookItems.length,
      systemCount: playbookItems.filter((item) => item.isSystem).length,
      systemSeedCount: PRE_CALL_PLAN_TEMPLATE_SEEDS.length,
      activeCount: playbookItems.filter((item) => item.status === "active").length,
      items: playbookItems,
    },
    territories: {
      totalFacilities: facilitiesRes.data?.length ?? 0,
      territoryCount: territoryItems.length,
      items: territoryItems,
      stateCounts,
      unmappedCount,
      repCoverageByState,
    },
    users: {
      adminCount: internalUserIds.size,
      salesRepCount: salesRepIds.size,
      territoryManagerCount: territoryManagerIds.size,
      salesReps,
      team,
    },
    intelligence: {
      captureCategoryCount: INTELLIGENCE_CAPTURE_CATEGORY_DEFS.length,
      debriefCategoryCount: DEBRIEF_INTELLIGENCE_CATEGORIES.length,
      optionalCategoryCount: OPTIONAL_INTELLIGENCE_CATEGORIES.length,
      catalogGroupCount: catalogStats.groupCount,
      catalogRowCount: catalogStats.totalRows,
      leaderboardEnabledMetricCount: leaderboardPayload.activeMetrics.length,
      leaderboardUpdatedAt: leaderboardPayload.updatedAt,
    },
    documents: {
      folderCount: documentFolders.length,
      fileCount: documentFilesRes.count ?? 0,
      repVisibleFolderCount,
    },
  };
}
