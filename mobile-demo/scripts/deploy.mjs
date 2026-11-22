// Builds the phone demo and publishes it to the gh-pages branch of a GitHub repo (GitHub Pages).
//
//   npm run demo:deploy                                  -> sonyaaat/sleepstory
//   npm run demo:deploy -- --repo <owner>/<repo>         -> any other repo you can push to
//
// The site is served at https://<owner>.github.io/<repo>/, so the build uses the repo name as its base path.
// The new build is committed on top of the existing gh-pages branch (never a force push).

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = path.resolve(demoDir, "..");
const outDir = path.join(demoDir, "out");

const option = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const repo = option("--repo") ?? "sonyaaat/sleepstory";
const [owner, name] = repo.split("/");
if (!owner || !name) throw new Error(`--repo must look like owner/name, got "${repo}"`);

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();

// 1. Build, with the repo name as the base path.
execFileSync(process.execPath, [path.join(rootDir, "node_modules/next/dist/bin/next"), "build", demoDir], {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, DEMO_BASE_PATH: name },
});
writeFileSync(path.join(outDir, ".nojekyll"), ""); // lets GitHub Pages serve the _next folder

// 2. Commit the build on top of the current gh-pages branch, in a temporary repo.
const source = git(["rev-parse", "--short", "HEAD"], rootDir);
const url = `https://github.com/${repo}.git`;
const work = mkdtempSync(path.join(tmpdir(), "sleepstory-pages-"));
try {
  git(["init", "-q"], work);
  git(["config", "core.autocrlf", "false"], work);
  if (git(["ls-remote", "--heads", url, "gh-pages"], work)) {
    git(["fetch", "-q", "--depth", "1", url, "gh-pages"], work);
    git(["checkout", "-q", "-b", "gh-pages", "FETCH_HEAD"], work);
  } else {
    git(["symbolic-ref", "HEAD", "refs/heads/gh-pages"], work);
  }
  for (const entry of readdirSync(work)) if (entry !== ".git") rmSync(path.join(work, entry), { recursive: true, force: true });
  cpSync(outDir, work, { recursive: true });
  git(["add", "-A"], work);
  if (!git(["status", "--porcelain"], work)) {
    console.log(`\nNothing changed since the last deploy to ${repo}.`);
  } else {
    git(["commit", "-q", "-m", option("--message") ?? `deployed phone demo from ${source}`], work);
    git(["push", "-q", url, "HEAD:gh-pages"], work);
    console.log(`\nPublished to the gh-pages branch of ${repo}.`);
  }
  console.log(`Site: https://${owner.toLowerCase()}.github.io/${name}/`);
} finally {
  try {
    rmSync(work, { recursive: true, force: true });
  } catch {
    // a temp folder left behind is harmless
  }
}
