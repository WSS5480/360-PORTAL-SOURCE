import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** react-pdf must run from node_modules — bundling breaks its reconciler with React 19. */
  serverExternalPackages: ["@react-pdf/renderer", "us-atlas", "topojson-client", "d3-geo", "d3-selection", "d3-zoom"],
  /** Faster dev compiles — tree-shake heavy packages on import. */
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr", "zod"],
  },
};

export default nextConfig;
