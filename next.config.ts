import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second dev server (e.g. for automated screenshots) can use its own build folder,
  // so two servers never write to the same .next and corrupt each other's cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
