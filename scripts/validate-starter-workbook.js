#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKBOOK = path.join(ROOT, "Energy_Price_Comparison_Template.xlsx");
const REQUIRED_SHEETS = ["Start Here", "Settings", "Latest Prices", "Examples"];
const REQUIRED_ENTRIES = [
  "[Content_Types].xml",
  "_rels/.rels",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/styles.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
  "xl/worksheets/sheet3.xml",
  "xl/worksheets/sheet4.xml",
];

function fail(message) {
  console.error(`Validation failed: ${message}`);
  process.exit(1);
}

function readStoredZipEntries(buffer) {
  if (buffer.readUInt32LE(0) !== 0x04034b50) {
    fail("file does not start with a ZIP local-file header");
  }

  const entries = new Map();
  let offset = 0;
  while (offset < buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) {
      break;
    }
    if (signature !== 0x04034b50) {
      fail(`unexpected ZIP signature 0x${signature.toString(16)} at offset ${offset}`);
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    if (compressionMethod !== 0) {
      fail(`unsupported compression method ${compressionMethod}; validator expects stored entries`);
    }

    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    const contentStart = nameEnd + extraLength;
    const contentEnd = contentStart + compressedSize;
    const name = buffer.subarray(nameStart, nameEnd).toString("utf8");
    const content = buffer.subarray(contentStart, contentEnd);

    if (compressedSize !== uncompressedSize) {
      fail(`${name} has mismatched stored sizes`);
    }

    entries.set(name, content);
    offset = contentEnd;
  }

  return entries;
}

function decodeXmlText(xml) {
  return xml
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

if (!fs.existsSync(WORKBOOK)) {
  fail(`missing ${path.relative(ROOT, WORKBOOK)}`);
}

const buffer = fs.readFileSync(WORKBOOK);
const entries = readStoredZipEntries(buffer);

for (const entry of REQUIRED_ENTRIES) {
  if (!entries.has(entry)) {
    fail(`missing ZIP entry ${entry}`);
  }
}

const workbookXml = entries.get("xl/workbook.xml").toString("utf8");
const sheetNames = [...workbookXml.matchAll(/<sheet name="([^"]+)"/g)].map((match) =>
  decodeXmlText(match[1]),
);

for (const sheetName of REQUIRED_SHEETS) {
  if (!sheetNames.includes(sheetName)) {
    fail(`missing required sheet "${sheetName}"`);
  }
}

const allXml = [...entries.values()].map((entry) => entry.toString("utf8")).join("\n");
const requiredText = [
  "Paste your OilPriceAPI key into Settings cell B2.",
  "https://api.oilpriceapi.com",
  "/v1/prices/excel-latest.xml",
  "No XML or manifest setup",
  "WTI_USD",
  "BRENT_CRUDE_USD",
  "WEBSERVICE(Settings!$B$3",
  "FILTERXML($J$10",
  "Missing API key",
  "Authentication failure",
  "Quota or rate-limit failure",
  "No data or unexpected empty response",
];

for (const text of requiredText) {
  if (!allXml.includes(text)) {
    fail(`missing expected workbook text: ${text}`);
  }
}

const forbiddenText = [
  "Power Query refresh is not implemented",
  "Pending Power Query implementation",
  "Pending refresh implementation",
  "manifest setup required",
];

for (const text of forbiddenText) {
  if (allXml.includes(text)) {
    fail(`workbook contains obsolete setup text: ${text}`);
  }
}

if (!allXml.includes('definedName name="ApiKey"')) {
  fail("missing ApiKey defined name");
}

if (entries.has("xl/vbaProject.bin") || allXml.includes("vbaProject.bin")) {
  fail("workbook must not contain macros");
}

const forbiddenPatterns = [
  /sk_live_[A-Za-z0-9_-]+/i,
  /sk_test_[A-Za-z0-9_-]+/i,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /api[_-]?key["'\s:=]+[A-Za-z0-9._-]{20,}/i,
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(allXml)) {
    fail(`workbook appears to contain key material matching ${pattern}`);
  }
}

console.log(`Validated ${path.relative(ROOT, WORKBOOK)}`);
console.log(`Sheets: ${sheetNames.join(", ")}`);
