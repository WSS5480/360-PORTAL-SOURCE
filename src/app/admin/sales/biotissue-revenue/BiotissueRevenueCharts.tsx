"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProductLineChartPoint } from "@/lib/surgical-sales/productLineRevenue";

const CLOSED = "#0b7285";
const QUOTA = "#64748b";
const RGV = "#0b7285";
const LAREDO = "#c2410c";
const GRID = "color-mix(in srgb, var(--foreground) 10%, var(--border))";
const TICK = "var(--muted)";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function compactAxis(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (abs >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const title = label || payload[0]?.name;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "8px 10px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {title ? <div style={{ marginBottom: 6, fontWeight: 900 }}>{title}</div> : null}
      {payload.map((row) => (
        <div key={row.name} style={{ display: "flex", gap: 10, justifyContent: "space-between", color: row.color }}>
          <span>{row.name}</span>
          <span>{money(Number(row.value || 0))}</span>
        </div>
      ))}
    </div>
  );
}

const legendStyle: React.CSSProperties = { fontSize: 12, fontWeight: 800, paddingTop: 4 };

function ChartFrame({ height, children }: { height: number; children: React.ReactElement }) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );
}

export function ClosedVsQuotaChart({ points }: { points: ProductLineChartPoint[] }) {
  const showQuota = points.some((p) => p.quota > 0);
  return (
    <ChartFrame height={260}>
      <BarChart data={points} barGap={4} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="shortLabel" tick={{ fill: TICK, fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compactAxis} tick={{ fill: TICK, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in srgb, var(--brand-600) 8%, transparent)" }} />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="closed" name="Closed" fill={CLOSED} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        {showQuota ? (
          <Bar dataKey="quota" name="Quota" fill={QUOTA} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        ) : null}
      </BarChart>
    </ChartFrame>
  );
}

export function CumulativeRunRateChart({ points }: { points: ProductLineChartPoint[] }) {
  const showQuota = points.some((p) => p.cumulativeQuota > 0);
  return (
    <ChartFrame height={240}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="shortLabel" tick={{ fill: TICK, fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compactAxis} tick={{ fill: TICK, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={legendStyle} />
        <Line
          type="monotone"
          dataKey="cumulativeClosed"
          name="Cumulative closed"
          stroke={CLOSED}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CLOSED }}
          isAnimationActive={false}
        />
        {showQuota ? (
          <Line
            type="monotone"
            dataKey="cumulativeQuota"
            name="Cumulative quota"
            stroke={QUOTA}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: QUOTA }}
            isAnimationActive={false}
          />
        ) : null}
      </LineChart>
    </ChartFrame>
  );
}

export function TerritoryStackChart({ points }: { points: ProductLineChartPoint[] }) {
  return (
    <ChartFrame height={240}>
      <BarChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="shortLabel" tick={{ fill: TICK, fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compactAxis} tick={{ fill: TICK, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in srgb, var(--brand-600) 8%, transparent)" }} />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="rgv" name="RGV" stackId="mix" fill={RGV} maxBarSize={36} isAnimationActive={false} />
        <Bar dataKey="laredo" name="Laredo" stackId="mix" fill={LAREDO} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
      </BarChart>
    </ChartFrame>
  );
}

export function TerritoryMixDonut({ rgv, laredo }: { rgv: number; laredo: number }) {
  const total = rgv + laredo;
  if (total <= 0) return null;
  const data = [
    { name: "RGV", value: rgv, fill: RGV },
    { name: "Laredo", value: laredo, fill: LAREDO },
  ];
  return (
    <div style={{ position: "relative", height: 240 }}>
      <ChartFrame height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={84}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ChartFrame>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: "-0.03em" }}>{money(total)}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>YTD mix</div>
      </div>
    </div>
  );
}
