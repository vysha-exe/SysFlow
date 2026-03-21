import path from "node:path";
import type { NextConfig } from "next";

/**
 * Use the directory you run `npm run dev` / `npm run build` from (should be
 * `frontend/`). If a `package-lock.json` exists higher up (e.g. in your user
 * home), Next can infer the wrong workspace root and fail to resolve
 * `next-themes` — the webpack alias below forces this app's `node_modules`.
 */
const projectRoot = process.cwd();

/**
 * Bundler: Webpack is used for dev + build via npm scripts (`--webpack`).
 * Next.js 16 defaults to Turbopack for `next dev`; on Windows some setups hit
 * Turbopack junction/symlink errors under `.next/dev`. Webpack avoids that.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,

  webpack: (config) => {
    const nextThemes = path.join(projectRoot, "node_modules", "next-themes");
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | string[] | boolean>),
      "next-themes": nextThemes,
    };
    return config;
  },
};

export default nextConfig;
