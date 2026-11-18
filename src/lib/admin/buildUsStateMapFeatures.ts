"use client";

import { feature } from "topojson-client";
import { geoIdentity, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

import { US_STATE_TILES } from "@/lib/admin/usStateTiles";
import { stateCodeFromFips } from "@/lib/admin/usStateFips";

export type UsStateMapFeature = Feature<Geometry, { name: string }> & {
  id?: string;
  stateCode: string;
};

export type UsStateMapRenderInfo = {
  code: string;
  name: string;
  path: string;
  centroid: [number, number];
  showLabel: boolean;
};

const pathGenerator = geoPath(geoIdentity());

let cachedTopology: Topology | null = null;
let cachedStatesObject: GeometryCollection | null = null;

function loadTopology(): { topology: Topology; statesObject: GeometryCollection } {
  if (cachedTopology && cachedStatesObject) {
    return { topology: cachedTopology, statesObject: cachedStatesObject };
  }

  // Lazy-load atlas JSON so Turbopack does not attach it to unrelated RSC routes.
  const topology = require("us-atlas/states-albers-10m.json") as unknown as Topology;
  cachedTopology = topology;
  cachedStatesObject = topology.objects.states as GeometryCollection;
  return { topology, statesObject: cachedStatesObject };
}

function labelFits(feature: UsStateMapFeature): boolean {
  const [[x0, y0], [x1, y1]] = pathGenerator.bounds(feature);
  return x1 - x0 >= 36 && y1 - y0 >= 26;
}

let cachedRenderList: UsStateMapRenderInfo[] | null = null;

/** Pre-projected Albers USA paths keyed by state code (computed once). */
export function getUsStateMapRenderList(): UsStateMapRenderInfo[] {
  if (cachedRenderList) return cachedRenderList;

  const { topology, statesObject } = loadTopology();
  const collection = feature(topology, statesObject);
  cachedRenderList = collection.features
    .map((raw) => {
      const code = stateCodeFromFips(String(raw.id ?? ""));
      if (!code || !US_STATE_TILES[code]) return null;

      const stateFeature = raw as UsStateMapFeature;
      stateFeature.stateCode = code;

      const path = pathGenerator(stateFeature);
      if (!path) return null;

      const centroid = pathGenerator.centroid(stateFeature) as [number, number];

      return {
        code,
        name: US_STATE_TILES[code].name,
        path,
        centroid,
        showLabel: labelFits(stateFeature),
      };
    })
    .filter((entry): entry is UsStateMapRenderInfo => entry != null);

  return cachedRenderList;
}

export function getUsStateMapViewBox(): string {
  const { viewBox } = getUsStateMapMetrics();
  return viewBox;
}

export function getUsStateMapMetrics(): {
  minX: number;
  minY: number;
  width: number;
  height: number;
  viewBox: string;
} {
  const { topology } = loadTopology();
  const [x0, y0, x1, y1] = topology.bbox ?? [0, 0, 975, 610];
  const pad = 4;
  const minX = x0 - pad;
  const minY = y0 - pad;
  const width = x1 - x0 + pad * 2;
  const height = y1 - y0 + pad * 2;
  return {
    minX,
    minY,
    width,
    height,
    viewBox: `${minX} ${minY} ${width} ${height}`,
  };
}
