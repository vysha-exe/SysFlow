import type { NextConfig } from "next";

/**
 * Bundler: Webpack is used for dev + build via npm scripts (`--webpack`).
 * Next.js 16 defaults to Turbopack for `next dev`; on Windows some setups hit
 * Turbopack junction/symlink errors under `.next/dev`. Webpack avoids that.
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
