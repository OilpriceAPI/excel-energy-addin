#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_FACT_FILES = [
  "README.md",
  "DEVELOPMENT.md",
  "CUSTOMER_QUICKSTART.md",
  "APPSOURCE_METADATA.md",
  "manifest.xml",
  "public/index.html",
  "public/privacy.html",
  "public/taskpane.html",
  "src/functions/functions.json",
];
const FIXTURE_FILES = fs
  .readdirSync(path.join(ROOT, "tests", "fixtures", "api"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => path.join("tests", "fixtures", "api", file));
const CLAIM_SCAN_FILES = [...PUBLIC_FACT_FILES, ...FIXTURE_FILES];
const BLOCKED_CLAIMS = [
  /\blive (oil|gas|fuel|commodity|energy)?\s*prices?\b/i,
  /\breal[ -]?time\b/i,
  /\bworks on any computer\b/i,
  /\bworks on every Excel\b/i,
  /\ball endpoints\b/i,
  /\bunlimited endpoints\b/i,
  /\btrading[- ]grade\b/i,
  /\b99\.9%\b/i,
  /\bSOC 2\b/i,
  /\bunrestricted (raw[- ]data )?redistribution\b/i,
];

const failures = [];
for (const relativePath of CLAIM_SCAN_FILES) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: required public-fact surface is missing`);
    continue;
  }
  const contents = fs.readFileSync(absolutePath, "utf8");
  for (const pattern of BLOCKED_CLAIMS) {
    if (pattern.test(contents)) {
      failures.push(`${relativePath}: blocked claim matched ${pattern}`);
    }
  }
}

const requiredContract = "https://api.oilpriceapi.com/product-facts.json";
for (const relativePath of [
  "README.md",
  "APPSOURCE_METADATA.md",
  "public/index.html",
]) {
  const contents = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  if (!contents.includes(requiredContract)) {
    failures.push(
      `${relativePath}: canonical product-facts contract is not linked`,
    );
  }
}

const forbiddenArtifacts = [
  "public/Energy_Price_Comparison_Template.xlsx",
  "public/error-handler.js",
  "src/utils/api-client.ts",
  "src/types/user-tier.ts",
];
for (const relativePath of forbiddenArtifacts) {
  if (fs.existsSync(path.join(ROOT, relativePath))) {
    failures.push(`${relativePath}: obsolete public artifact still exists`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${CLAIM_SCAN_FILES.length} public and fixture surfaces against the canonical contract.`,
);
