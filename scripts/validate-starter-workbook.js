#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKBOOK = path.join(ROOT, "Energy_Price_Comparison_Template.xlsx");
const REQUIRED_SHEETS = ["API Runner"];
const FORBIDDEN_SHEETS = ["Start Here", "Settings", "Examples"];
const REQUIRED_ENTRIES = [
  "[Content_Types].xml",
  "_rels/.rels",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/styles.xml",
  "xl/worksheets/sheet1.xml",
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

for (const entry of ["xl/worksheets/sheet2.xml", "xl/worksheets/sheet3.xml", "xl/worksheets/sheet4.xml"]) {
  if (entries.has(entry)) {
    fail(`unexpected extra worksheet entry ${entry}`);
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

for (const sheetName of FORBIDDEN_SHEETS) {
  if (sheetNames.includes(sheetName)) {
    fail(`old multi-tab sheet still present: ${sheetName}`);
  }
}

const allXml = [...entries.values()].map((entry) => entry.toString("utf8")).join("\n");
const decodedXml = decodeXmlText(allXml);
const requiredText = [
  "API Runner Workbook",
  "API key in use",
  "Endpoint path",
  "Query string",
  "API request",
  "Rows returned",
  "https://api.oilpriceapi.com",
  "/v1/excel/run.xml",
  "/v1/prices/latest",
  "/v1/prices/past_month",
  "/v1/futures/ice-brent/curve",
  "WTI_USD",
  "BRENT_CRUDE_USD",
  "WEBSERVICE($N$3",
  "FILTERXML($N$2",
  "/oilpriceapi/columns/col1",
  "/oilpriceapi/rows/row[1]/col1",
  'showGridLines="0"',
  'activeCell="B5"',
  'definedName name="ApiKey"'
];

for (const text of requiredText) {
  if (!decodedXml.includes(text) && !allXml.includes(text)) {
    fail(`missing expected workbook text: ${text}`);
  }
}

const forbiddenText = [
  "Power Query refresh is not implemented",
  "Pending Power Query implementation",
  "Pending refresh implementation",
  "manifest setup required",
  "Settings!B2",
  "Settings cell B2",
  "Paste your OilPriceAPI key into Settings",
  "No setup chores",
  "No XML Expansion Packs",
  "Live API Runner",
  "instant Excel download",
  "static workbook",
];

for (const text of forbiddenText) {
  if (decodedXml.includes(text)) {
    fail(`workbook contains obsolete setup text: ${text}`);
  }
}

if (!workbookXml.includes("<definedName name=\"ApiKey\">'API Runner'!$B$5</definedName>")) {
  fail("ApiKey defined name must point at the one-page key cell");
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
  if (pattern.test(decodedXml)) {
    fail(`workbook appears to contain key material matching ${pattern}`);
  }
}

console.log(`Validated ${path.relative(ROOT, WORKBOOK)}`);
console.log(`Sheets: ${sheetNames.join(", ")}`);
