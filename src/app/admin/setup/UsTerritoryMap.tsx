"use client";

import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { getUsStateMapMetrics, getUsStateMapRenderList } from "@/lib/admin/buildUsStateMapFeatures";

import styles from "./usTerritoryMap.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

function intensityFill(count: number, max: number): string {
  if (count <= 0) return "rgba(148, 163, 184, 0.22)";
  const ratio = max > 0 ? count / max : 0;
  const t = 0.28 + ratio * 0.72;
  return `color-mix(in srgb, var(--brand-600) ${Math.round(t * 100)}%, white)`;
}

function labelUsesLightText(count: number, max: number, highlighted: boolean): boolean {
  if (highlighted) return true;
  if (count <= 0) return false;
  const ratio = max > 0 ? count / max : 0;
  return 0.28 + ratio * 0.72 > 0.55;
}

function isIdentityTransform(transform: ZoomTransform): boolean {
  return transform.k === 1 && transform.x === 0 && transform.y === 0;
}

export default function UsTerritoryMap({
  counts,
  selected,
  highlightedStates,
  onSelect,
  emptyHint = "Hover a state to see counts",
  formatDetail,
}: {
  counts: Record<string, number>;
  selected?: string | null;
  highlightedStates?: string[];
  onSelect?: (code: string | null) => void;
  emptyHint?: string;
  formatDetail?: (code: string, count: number) => React.ReactNode;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const shadowFilterId = React.useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLayerRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const states = useMemo(() => getUsStateMapRenderList(), []);
  const metrics = useMemo(() => getUsStateMapMetrics(), []);
  const max = Math.max(0, ...Object.values(counts));
  const highlighted = useMemo(() => new Set(highlightedStates ?? []), [highlightedStates]);

  const activeCode = hover ?? selected ?? null;
  const activeState = activeCode ? states.find((state) => state.code === activeCode) : null;
  const activeCount = activeCode ? (counts[activeCode] ?? 0) : 0;
  const canReset = !isIdentityTransform(transform);

  useEffect(() => {
    const svg = svgRef.current;
    const zoomLayer = zoomLayerRef.current;
    if (!svg || !zoomLayer) return;

    const { minX, minY, width, height } = metrics;
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .clickDistance(6)
      .translateExtent([
        [minX - width * 0.45, minY - height * 0.45],
        [minX + width * 1.45, minY + height * 1.45],
      ])
      .extent([
        [minX, minY],
        [minX + width, minY + height],
      ])
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.type === "dblclick") return false;
        if (event.type === "mousedown" || event.type === "touchstart") {
          if ("button" in event && event.button === 1) return true;
          return event.type === "touchstart" || event.button === 0;
        }
        return false;
      })
      .on("zoom", (event) => {
        select(zoomLayer).attr("transform", event.transform.toString());
        setTransform(event.transform);
      });

    select(svg).call(zoomBehavior).on("dblclick.zoom", null);
    zoomBehaviorRef.current = zoomBehavior;

    return () => {
      select(svg).on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [metrics]);

  const resetView = () => {
    const svg = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    if (!svg || !zoomBehavior) return;
    select(svg).call(zoomBehavior.transform, zoomIdentity);
  };

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    if (!svg || !zoomBehavior) return;
    select(svg).call(zoomBehavior.scaleBy, factor);
  };

  return (
    <div className={styles.root}>
      <div className={styles.mapFrame}>
        <div className={styles.mapControls}>
          <button type="button" className={styles.mapControlBtn} onClick={() => zoomBy(1.35)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className={styles.mapControlBtn} onClick={() => zoomBy(1 / 1.35)} aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            className={styles.mapControlBtn}
            onClick={resetView}
            disabled={!canReset}
            aria-label="Reset map view"
          >
            Reset
          </button>
        </div>
        <div className={styles.mapHint}>Scroll to zoom · Drag to pan</div>

        <svg
          ref={svgRef}
          viewBox={metrics.viewBox}
          className={styles.mapSvg}
          role="img"
          aria-label="United States territory coverage map"
        >
          <defs>
            <filter id={shadowFilterId} x="-2%" y="-2%" width="104%" height="104%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(15,23,42,0.12)" />
            </filter>
          </defs>

          <rect
            className={styles.mapSurface}
            x={metrics.minX}
            y={metrics.minY}
            width={metrics.width}
            height={metrics.height}
          />

          <g ref={zoomLayerRef} filter={`url(#${shadowFilterId})`}>
            {states.map((state) => {
              const count = counts[state.code] ?? 0;
              const isHighlighted = highlighted.has(state.code);
              const isActive = activeCode === state.code;
              const isSelected = selected === state.code;
              const fill = isHighlighted
                ? "color-mix(in srgb, var(--brand-600) 72%, white)"
                : intensityFill(count, max);
              const stroke = isHighlighted
                ? "var(--brand-800)"
                : isSelected
                  ? "var(--brand-700)"
                  : isActive
                    ? "rgba(15, 23, 42, 0.55)"
                    : "rgba(255, 255, 255, 0.88)";
              const strokeWidth = isHighlighted || isSelected ? 2 : isActive ? 1.4 : 0.75;
              const labelClass = labelUsesLightText(count, max, isHighlighted)
                ? `${styles.stateLabel} ${styles.stateLabelOnDark}`
                : styles.stateLabel;

              return (
                <g
                  key={state.code}
                  className={`${styles.state}${onSelect ? ` ${styles.stateInteractive}` : ""}`}
                  onMouseEnter={() => setHover(state.code)}
                  onMouseLeave={() => setHover((prev) => (prev === state.code ? null : prev))}
                  onClick={() => onSelect?.(isSelected ? null : state.code)}
                >
                  <path
                    d={state.path}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {state.showLabel ? (
                    <text
                      x={state.centroid[0]}
                      y={state.centroid[1]}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={labelClass}
                    >
                      {state.code}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {activeState && !activeState.showLabel ? (
              <g className={styles.hoverBadge}>
                <rect
                  x={activeState.centroid[0] - 14}
                  y={activeState.centroid[1] - 9}
                  width={28}
                  height={18}
                  rx={4}
                  fill="rgba(15, 23, 42, 0.78)"
                />
                <text
                  x={activeState.centroid[0]}
                  y={activeState.centroid[1] + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={9}
                  fontWeight={800}
                >
                  {activeState.code}
                </text>
              </g>
            ) : null}
          </g>
        </svg>
      </div>

      <div className={styles.footer}>
        <div className={styles.detail}>
          {activeState ? (
            formatDetail ? (
              formatDetail(activeState.code, activeCount)
            ) : (
              <span>
                {activeState.name} — <strong>{activeCount}</strong>
              </span>
            )
          ) : (
            <span>{emptyHint}</span>
          )}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendLabel}>Fewer</span>
          {[0.14, 0.4, 0.6, 0.8, 1].map((t, i) => (
            <span
              key={i}
              className={styles.legendSwatch}
              style={{
                background:
                  i === 0
                    ? "rgba(148,163,184,0.22)"
                    : `color-mix(in srgb, var(--brand-600) ${Math.round(t * 100)}%, white)`,
              }}
            />
          ))}
          <span className={styles.legendLabel}>More</span>
        </div>
      </div>
    </div>
  );
}
