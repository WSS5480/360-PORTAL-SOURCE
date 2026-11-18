import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_EXECUTION_LEADERBOARD_CATEGORY_WEIGHTS,
  DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS,
  mergeExecutionLeaderboardConfig,
  type ExecutionLeaderboardConfig,
  type PartialExecutionLeaderboardConfig,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  getLeaderboardCatalogMetric,
  isLeaderboardCatalogMetricKey,
  LEADERBOARD_CATALOG_METRICS,
  type LeaderboardCatalogMetric,
  type LeaderboardCatalogMetricKey,
} from "@/lib/surgical-sales/leaderboardMetricCatalog";

const SETTINGS_ID = 1;

type SettingsRow = {
  enabled_metrics: unknown;
  metric_points: unknown;
  category_weights: unknown;
  updated_at: string | null;
  updated_by_user_id: string | null;
};

export type AdminLeaderboardConfigPayload = {
  config: ExecutionLeaderboardConfig;
  activeMetrics: AdminLeaderboardMetricView[];
  availableMetrics: AdminLeaderboardMetricView[];
  updatedAt: string | null;
  updatedByUserId: string | null;
};

export type AdminLeaderboardMetricView = LeaderboardCatalogMetric & {
  enabled: boolean;
  points: number;
};

const MetricPointsSchema = z.record(z.string(), z.number().int().min(0).max(10_000));

const UpdateLeaderboardConfigSchema = z.object({
  enabledMetrics: z.array(z.string()).min(1),
  metricPoints: MetricPointsSchema,
  categoryWeights: z
    .record(z.string(), z.number().min(0).max(10))
    .optional(),
});

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => String(value)).filter(Boolean);
}

function parseNumberRecord(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0) out[key] = Math.round(num);
  }
  return out;
}

function rowToPartialConfig(row: SettingsRow | null): PartialExecutionLeaderboardConfig | null {
  if (!row) return null;

  const enabledMetrics = parseStringArray(row.enabled_metrics).filter(isLeaderboardCatalogMetricKey);
  const metricPoints = parseNumberRecord(row.metric_points);
  const categoryWeights = parseNumberRecord(row.category_weights);

  return {
    enabledMetrics: enabledMetrics.length > 0 ? enabledMetrics : undefined,
    metricPoints: Object.keys(metricPoints).length > 0 ? metricPoints : undefined,
    categoryWeights: Object.keys(categoryWeights).length > 0 ? categoryWeights : undefined,
  };
}

export async function fetchExecutionLeaderboardConfigOverrides(): Promise<PartialExecutionLeaderboardConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("execution_leaderboard_settings")
    .select("enabled_metrics, metric_points, category_weights, updated_at, updated_by_user_id")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return rowToPartialConfig((data as SettingsRow | null) ?? null);
}

export async function fetchExecutionLeaderboardConfig(): Promise<ExecutionLeaderboardConfig> {
  const overrides = await fetchExecutionLeaderboardConfigOverrides();
  return mergeExecutionLeaderboardConfig(overrides);
}

function metricView(metric: LeaderboardCatalogMetric, config: ExecutionLeaderboardConfig): AdminLeaderboardMetricView {
  const enabled = config.enabledMetrics.includes(metric.key);
  const configuredPoints =
    metric.key in config.metricPoints
      ? config.metricPoints[metric.key as keyof typeof config.metricPoints]
      : metric.defaultPoints;

  return {
    ...metric,
    enabled,
    points: configuredPoints ?? metric.defaultPoints,
  };
}

export async function fetchAdminLeaderboardConfigPayload(): Promise<AdminLeaderboardConfigPayload> {
  try {
    const { data, error } = await supabaseAdmin
      .from("execution_leaderboard_settings")
      .select("enabled_metrics, metric_points, category_weights, updated_at, updated_by_user_id")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const row = (data as SettingsRow | null) ?? null;
    const config = mergeExecutionLeaderboardConfig(rowToPartialConfig(row));
    const enabled = new Set(config.enabledMetrics);

    const activeMetrics = config.enabledMetrics
      .map((key) => {
        const metric = LEADERBOARD_CATALOG_METRICS.find((entry) => entry.key === key);
        return metric ? metricView(metric, config) : null;
      })
      .filter((metric): metric is AdminLeaderboardMetricView => metric !== null);

    const availableMetrics = LEADERBOARD_CATALOG_METRICS.filter((metric) => !enabled.has(metric.key)).map((metric) =>
      metricView(metric, config),
    );

    return {
      config,
      activeMetrics,
      availableMetrics,
      updatedAt: row?.updated_at ?? null,
      updatedByUserId: row?.updated_by_user_id ?? null,
    };
  } catch {
    const config = mergeExecutionLeaderboardConfig(null);
    const enabled = new Set(config.enabledMetrics);
    return {
      config,
      activeMetrics: LEADERBOARD_CATALOG_METRICS.filter((metric) => enabled.has(metric.key)).map((metric) =>
        metricView(metric, config),
      ),
      availableMetrics: LEADERBOARD_CATALOG_METRICS.filter((metric) => !enabled.has(metric.key)).map((metric) =>
        metricView(metric, config),
      ),
      updatedAt: null,
      updatedByUserId: null,
    };
  }
}

export function validateLeaderboardConfigUpdate(raw: unknown):
  | { ok: true; value: z.infer<typeof UpdateLeaderboardConfigSchema> }
  | { ok: false; error: string } {
  const parsed = UpdateLeaderboardConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid leaderboard configuration payload." };
  }

  const invalidKeys = parsed.data.enabledMetrics.filter((key) => !isLeaderboardCatalogMetricKey(key));
  if (invalidKeys.length > 0) {
    return { ok: false, error: `Unknown metric key(s): ${invalidKeys.join(", ")}` };
  }

  const enabledMetrics = parsed.data.enabledMetrics.filter(isLeaderboardCatalogMetricKey);
  for (const key of enabledMetrics) {
    if (!(key in parsed.data.metricPoints)) {
      parsed.data.metricPoints[key] = getLeaderboardCatalogMetric(key).defaultPoints;
    }
  }

  return { ok: true, value: parsed.data };
}

export async function saveAdminLeaderboardConfig(args: {
  adminUserId: string;
  enabledMetrics: LeaderboardCatalogMetricKey[];
  metricPoints: Record<string, number>;
  categoryWeights?: Record<string, number>;
}): Promise<AdminLeaderboardConfigPayload> {
  const mergedPoints = {
    ...DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS,
    ...args.metricPoints,
  };

  const mergedWeights = {
    ...DEFAULT_EXECUTION_LEADERBOARD_CATEGORY_WEIGHTS,
    ...(args.categoryWeights ?? {}),
  };

  const { error } = await supabaseAdmin
    .from("execution_leaderboard_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        enabled_metrics: args.enabledMetrics,
        metric_points: mergedPoints,
        category_weights: mergedWeights,
        updated_at: new Date().toISOString(),
        updated_by_user_id: args.adminUserId,
      },
      { onConflict: "id" },
    );

  if (error) throw new Error(error.message);
  return fetchAdminLeaderboardConfigPayload();
}
