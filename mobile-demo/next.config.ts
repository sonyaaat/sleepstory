// Phone demo (DEMO-13): a static, browser-only build of the app's own screens.
// It reuses ../src unchanged. Only the three modules that need a server are swapped for browser
// versions in ./lib: the server actions, the database queries and the demo sessions.

import path from "node:path";
import type { NextConfig } from "next";

const lib = path.join(__dirname, "lib");

// GitHub Pages serves a project site under /<repo>; the deploy script sets DEMO_BASE_PATH to the repo name.
// Written without the slash ("sleepstory"), so Git Bash on Windows doesn't turn it into a file path.
const base = (process.env.DEMO_BASE_PATH ?? "").replace(/^\/+|\/+$/g, "");
const basePath = base ? `/${base}` : "";

/** Real module -> browser version. Matched on the resolved path, so relative imports are swapped too. */
const SWAPS: [RegExp, string][] = [
  [/[\\/]src[\\/]app[\\/]actions\.ts$/, path.join(lib, "actions.ts")],
  [/[\\/]src[\\/]db[\\/]queries\.ts$/, path.join(lib, "queries.ts")],
  [/[\\/]src[\\/]db[\\/]session\.ts$/, path.join(lib, "session.ts")],
];

type Resolved = { createData?: { resource?: string; context?: string; request?: string; userRequest?: string } };

/** Points a resolved module at `file`, including the folder its own imports resolve from. */
const swapTo = (file: string) => (data: Resolved) => {
  const d = data.createData;
  if (!d?.resource) return; // not resolved yet
  if (d.request) d.request = d.request.split(d.resource).join(file);
  d.userRequest = file;
  d.resource = file;
  d.context = path.dirname(file);
};

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { DEMO_BASE_PATH: basePath },
  images: { unoptimized: true },
  // Compile ../src (the app itself) as part of this build.
  experimental: { externalDir: true },
  webpack(config, { webpack }) {
    for (const [pattern, file] of SWAPS) config.plugins.push(new webpack.NormalModuleReplacementPlugin(pattern, swapTo(file)));
    return config;
  },
};

export default nextConfig;
