#!/usr/bin/env node
/**
 * stamp-cache-bust.js
 *
 * Runs as an npm `postbuild` step, so every local `npm run build` AND the CI
 * GitHub Pages workflow (which calls `npm run build`) stamp the emitted `dist/`
 * automatically. Source files (manifest.xml, functions.json, the HTML pages) are
 * treated as templates and left untouched — only the copies in `dist/` are stamped.
 *
 * What it does:
 *   1. Derives a build token = short git SHA (CI `GITHUB_SHA` or `git rev-parse
 *      --short HEAD`), falling back to a UTC timestamp, then `dev`.
 *   2. Appends `?v=<token>` to the URLs Excel fetches for the custom-functions
 *      runtime — functions.js, functions.json, taskpane.html — in BOTH
 *      dist/manifest.xml and the runtime HTML pages that load functions.js via a
 *      relative <script src>. GitHub Pages ignores the query string, so the file
 *      still serves, but the changed URL forces Excel to refetch instead of
 *      serving a stale cached functions.js.
 *   3. Bumps the manifest <Version> to 1.0.<n>.0 (n = CI GITHUB_RUN_NUMBER, or a
 *      local patch+1 fallback) so Office detects the update and re-reads the
 *      manifest. The <Id> is never touched.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DIST = path.resolve(__dirname, "..", "dist");

function deriveToken() {
  const ciSha = process.env.GITHUB_SHA;
  if (ciSha && ciSha.trim()) {
    return ciSha.trim().slice(0, 7);
  }
  try {
    const sha = execSync("git rev-parse --short HEAD", {
      cwd: path.resolve(__dirname, ".."),
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (sha) return sha;
  } catch (_) {
    // git not available (e.g. shallow/exported tree) — fall through
  }
  const ts = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  return ts || "dev";
}

function deriveVersion(currentVersion) {
  const runNumber = process.env.GITHUB_RUN_NUMBER;
  if (runNumber && /^\d+$/.test(runNumber.trim())) {
    return `1.0.${runNumber.trim()}.0`;
  }
  // Local fallback: bump the patch segment of the current 4-part version.
  const parts = (currentVersion || "1.0.0.0").split(".");
  while (parts.length < 4) parts.push("0");
  const patch = parseInt(parts[2], 10);
  parts[2] = String((Number.isFinite(patch) ? patch : 0) + 1);
  parts[3] = "0";
  return parts.slice(0, 4).join(".");
}

/** Append ?v=<token> to any URL/relative ref ending in one of the given filenames. */
function stampUrls(content, token, filenames) {
  let out = content;
  for (const name of filenames) {
    const escaped = name.replace(/[.]/g, "\\.");
    // Match the filename only when it is the end of the ref (immediately
    // followed by the closing quote) and not already stamped.
    const re = new RegExp(`${escaped}(?=")`, "g");
    out = out.replace(re, `${name}?v=${token}`);
  }
  return out;
}

function stampManifest(token) {
  const file = path.join(DIST, "manifest.xml");
  let xml = fs.readFileSync(file, "utf8");

  // Read current version, then bump it. Never touch <Id>.
  const versionMatch = xml.match(/<Version>([^<]+)<\/Version>/);
  const currentVersion = versionMatch ? versionMatch[1].trim() : "1.0.0.0";
  const newVersion = deriveVersion(currentVersion);
  xml = xml.replace(
    /<Version>[^<]+<\/Version>/,
    `<Version>${newVersion}</Version>`,
  );

  // Cache-bust the fetched runtime URLs (taskpane.html, functions.js,
  // functions.json). These appear in bt:Url DefaultValues and the
  // DefaultSettings SourceLocation. Icon/.png and resid-based refs are untouched.
  xml = stampUrls(xml, token, [
    "taskpane.html",
    "functions.js",
    "functions.json",
  ]);

  fs.writeFileSync(file, xml);
  return { newVersion, file };
}

function stampFunctionsJson(token) {
  const file = path.join(DIST, "functions.json");
  const raw = fs.readFileSync(file, "utf8");
  const json = JSON.parse(raw);

  // Some custom-function metadata files declare the runtime JS via a top-level
  // "url". This manifest declares it in manifest.xml instead, so there is no url
  // to stamp here — but handle it robustly if one is ever added.
  let changed = false;
  if (typeof json.url === "string" && !json.url.includes("?v=")) {
    json.url = `${json.url}?v=${token}`;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  }
  return { file, changed };
}

function stampHtml(token) {
  // The runtime pages load functions.js (and taskpane.js) via a relative
  // <script src>. In the shared-runtime path Excel loads these HTML pages, so
  // the manifest URL alone will NOT defeat a stale cached functions.js — the
  // script tags must be stamped too.
  const pages = ["taskpane.html", "functions.html"];
  const stamped = [];
  for (const page of pages) {
    const file = path.join(DIST, page);
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, "utf8");
    html = stampUrls(html, token, ["functions.js", "taskpane.js"]);
    fs.writeFileSync(file, html);
    stamped.push(page);
  }
  return stamped;
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error(
      `[stamp-cache-bust] dist/ not found at ${DIST}; run the build first.`,
    );
    process.exit(1);
  }
  const token = deriveToken();
  const { newVersion } = stampManifest(token);
  const fnJson = stampFunctionsJson(token);
  const htmlPages = stampHtml(token);

  console.log(`[stamp-cache-bust] token=${token} version=${newVersion}`);
  console.log(
    `[stamp-cache-bust] stamped manifest.xml, ${htmlPages.join(", ")}` +
      (fnJson.changed
        ? ", functions.json (url)"
        : " (functions.json has no url field to stamp)"),
  );
}

main();
