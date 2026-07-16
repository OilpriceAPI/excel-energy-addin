const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const SKIP_DIRS = new Set([
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "submission-screenshots",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
]);

const SKIP_EXTENSIONS = new Set([
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
  ".xlsx",
  ".zip",
]);

const PATTERNS = [
  {
    name: "64-character hex token",
    regex: /\b[a-f0-9]{64}\b/i,
  },
  {
    name: "Authorization Token header",
    regex: /\bToken\s+[A-Za-z0-9._~+/=-]{32,}\b/i,
  },
  {
    name: "Authorization Bearer header",
    regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{32,}\b/i,
  },
  {
    name: "OilPriceAPI-prefixed token",
    regex: /\boilpriceapi_[A-Za-z0-9_-]{20,}\b/i,
  },
  {
    name: "hardcoded API key assignment",
    regex: /\bapi[_-]?key\b\s*[:=]\s*["'][A-Za-z0-9._~+/=-]{20,}["']/i,
  },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".github") {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(fullPath, files);
      continue;
    }

    if (SKIP_FILES.has(entry.name)) continue;
    if (SKIP_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

    files.push(fullPath);
  }

  return files;
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

const findings = [];

for (const file of walk(ROOT)) {
  const stat = fs.statSync(file);
  if (stat.size > 2 * 1024 * 1024) continue;

  const buffer = fs.readFileSync(file);
  if (isBinary(buffer)) continue;

  const content = buffer.toString("utf8");
  const relPath = path.relative(ROOT, file);

  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(content);
    if (match) {
      findings.push({
        file: relPath,
        line: lineNumberFor(content, match.index),
        pattern: pattern.name,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found. Replace real keys with placeholders.");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} (${finding.pattern})`);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
