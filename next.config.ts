import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Render build machine runs out of memory during the type check (2 GB heap, Nov 17 2026). Types are still
   *  checked locally/CI with `npx tsc --noEmit`; the deploy build skips that step. */
  typescript: { ignoreBuildErrors: true },
  /** react-pdf must run from node_modules — bundling breaks its reconciler with React 19. */
  serverExternalPackages: ["@react-pdf/renderer", "us-atlas", "topojson-client", "d3-geo", "d3-selection", "d3-zoom"],
  /** Faster dev compiles — tree-shake heavy packages on import. */
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr", "zod"],
  },
};

export default nextConfig;
