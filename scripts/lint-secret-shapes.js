const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const trackedFiles = execFileSync("git", ["ls-files"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const scannedPrefixes = [
  ".github/",
  "docs/",
  "src/",
  "tests/",
  "README",
  "manifest.xml",
  "package.json",
];

const skippedExtensions = new Set([
  ".ico",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".xlsx",
  ".zip",
]);

const contextPattern =
  /(?:authorization\s*:\s*(?:token|bearer)\s+|api[_ -]?key\s*(?:[:=]|is|`)?\s*|apikey\s*(?:[:=]|is|`)?\s*)([`'"]?)([A-Za-z0-9_-]{32,})\1/gi;

const redactedPattern = /^(?:\[?redacted\b|do-not-commit|your[_-]?api[_-]?key|apiKey)$/i;

const findings = [];

for (const file of trackedFiles) {
  if (!scannedPrefixes.some((prefix) => file.startsWith(prefix))) {
    continue;
  }

  if (skippedExtensions.has(path.extname(file).toLowerCase())) {
    continue;
  }

  const absolutePath = path.join(repoRoot, file);
  const contents = fs.readFileSync(absolutePath, "utf8");

  contents.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(contextPattern)) {
      const token = match[2];
      if (redactedPattern.test(token)) {
        continue;
      }

      findings.push({
        file,
        line: index + 1,
        preview: `${token.slice(0, 4)}...${token.slice(-4)}`,
      });
    }
  });
}

if (findings.length > 0) {
  console.error("Secret-shaped API key literals found:");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.preview}`);
  }
  process.exit(1);
}

console.log("No API-key-shaped literals found in scanned files.");
