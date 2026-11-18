"use client";

import React from "react";

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)] as const;
}

/** SVG elliptical arcs cannot reliably draw a full 360° sweep in one command — split or use <circle>. */
function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const sweep = end - start;
  if (sweep < 0.0001) return "";
  if (sweep >= 2 * Math.PI - 1e-6) {
    const [sx, sy] = polar(cx, cy, r, start);
    const [mx, my] = polar(cx, cy, r, start + Math.PI);
    return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 1 1 ${mx} ${my} A ${r} ${r} 0 1 1 ${sx} ${sy} Z`;
  }
  const [sx, sy] = polar(cx, cy, r, start);
  const [ex, ey] = polar(cx, cy, r, end);
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
}

function fmtSqcm(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type Props = {
  sqcmOnHand: number | null;
  sqcmVwUsed: number | null;
  loading?: boolean;
};

const VIEW = 120;
const CX = 60;
const CY = 60;
const R_OUT = 44;
const R_HOLE = 26;

/**
 * Pie chart for Virtual warehouse hero: fungible pool on hand vs sq cm committed
 * (ship-now bulk lines + VW shipment orders) — not double-counting headroom already in the pool.
 */
export default function VwSqcmPieChart(props: Props) {
  const { loading, sqcmOnHand, sqcmVwUsed } = props;
  const on = sqcmOnHand != null && Number.isFinite(sqcmOnHand) ? Math.max(0, sqcmOnHand) : 0;
  const used = sqcmVwUsed != null && Number.isFinite(sqcmVwUsed) ? Math.max(0, sqcmVwUsed) : 0;
  const total = on + used;

  const start = -Math.PI / 2;

  let pathOn = "";
  let pathUsed = "";
  let fullOn = false;
  let fullUsed = false;
  const eps = 1e-7;
  if (total > 0.0001) {
    const fracOn = on / total;
    const fracUsed = used / total;
    fullOn = fracOn >= 1 - eps;
    fullUsed = fracUsed >= 1 - eps;
    if (!fullOn && !fullUsed) {
      const aOn = fracOn * Math.PI * 2;
      const aUsed = fracUsed * Math.PI * 2;
      pathOn = slicePath(CX, CY, R_OUT, start, start + aOn);
      pathUsed = slicePath(CX, CY, R_OUT, start + aOn, start + aOn + aUsed);
    } else if (fullOn) {
      pathOn = "full";
    } else if (fullUsed) {
      pathUsed = "full";
    }
  }

  const legendRow = (swatch: string, label: string, value: string) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "10px 1fr auto",
        alignItems: "center",
        gap: "6px 10px",
        minWidth: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: swatch,
          boxShadow: "0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "rgba(255,255,255,0.72)",
          letterSpacing: 0.2,
          textTransform: "uppercase",
          minWidth: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.98)",
          fontWeight: 950,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      data-testid="vw-sqcm-pie"
      title="Sq cm balance: pool on hand vs committed (ship now & VW ship orders)"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        minWidth: 0,
        maxWidth: "min(100%, 360px)",
        padding: "7px 10px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.12) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.2)",
        backdropFilter: "blur(8px)",
      }}
    >
      <svg
        width={88}
        height={88}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        style={{ flexShrink: 0 }}
        aria-hidden
      >
        <defs>
          <linearGradient id="vwPieGradOn" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity={0.98} />
            <stop offset="55%" stopColor="#22d3ee" stopOpacity={0.98} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id="vwPieGradUsed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.96} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.88} />
          </linearGradient>
          <radialGradient id="vwPieHole" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#0a1628" stopOpacity={0.98} />
            <stop offset="100%" stopColor="#050b14" stopOpacity={1} />
          </radialGradient>
          <filter id="vwPieShadow" x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity={0.45} />
          </filter>
        </defs>

        <g filter="url(#vwPieShadow)">
          <circle
            cx={CX}
            cy={CY}
            r={R_OUT + 0.5}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={1}
          />
          <circle cx={CX} cy={CY} r={R_OUT} fill="rgba(255,255,255,0.06)" stroke="none" />
          {loading ? (
            <>
              <circle
                cx={CX}
                cy={CY}
                r={R_OUT - 1}
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={1.5}
                style={{ animation: "vw-pie-pulse 1.2s ease-in-out infinite" }}
              />
              <circle cx={CX} cy={CY} r={R_HOLE} fill="url(#vwPieHole)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            </>
          ) : total <= 0.0001 ? (
            <text
              x={CX}
              y={CY + 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize={10}
              fontWeight={800}
              letterSpacing={0.3}
            >
              No data
            </text>
          ) : (
            <>
              {pathOn === "full" ? (
                <circle cx={CX} cy={CY} r={R_OUT} fill="url(#vwPieGradOn)" stroke="rgba(0,0,0,0.2)" strokeWidth={0.6} />
              ) : pathOn ? (
                <path
                  d={pathOn}
                  fill="url(#vwPieGradOn)"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth={0.5}
                  strokeLinejoin="round"
                />
              ) : null}
              {pathUsed === "full" ? (
                <circle cx={CX} cy={CY} r={R_OUT} fill="url(#vwPieGradUsed)" stroke="rgba(0,0,0,0.2)" strokeWidth={0.6} />
              ) : pathUsed ? (
                <path
                  d={pathUsed}
                  fill="url(#vwPieGradUsed)"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth={0.5}
                  strokeLinejoin="round"
                />
              ) : null}
              <circle
                cx={CX}
                cy={CY}
                r={R_HOLE}
                fill="url(#vwPieHole)"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
              />
            </>
          )}
        </g>
      </svg>

      <style>{`
        @keyframes vw-pie-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.95; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "stretch",
          justifyContent: "center",
          minWidth: 0,
          flex: "1 1 auto",
        }}
      >
        {legendRow(
          "linear-gradient(135deg, #5eead4 0%, #22d3ee 50%, #0284c7 100%)",
          "On hand",
          loading ? "…" : fmtSqcm(on)
        )}
        {legendRow(
          "linear-gradient(135deg, #cbd5e1 0%, #a5b4fc 100%)",
          "Committed",
          loading ? "…" : fmtSqcm(used)
        )}
      </div>
    </div>
  );
}
