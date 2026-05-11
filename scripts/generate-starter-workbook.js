#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "Energy_Price_Comparison_Template.xlsx");

const SHEETS = [
  {
    name: "Start Here",
    rows: [
      ["OilPriceAPI Excel Starter Workbook"],
      ["Step", "What to do"],
      ["1", "Paste your OilPriceAPI key into Settings cell B2."],
      ["2", "Confirm the base URL in Settings cell B3."],
      [
        "3",
        "Refresh is not enabled in this generated shell yet. See Latest Prices for the Power Query blocker.",
      ],
      [],
      [
        "Status",
        "This workbook is valid .xlsx structure and contains no embedded API key.",
      ],
    ],
    widths: [16, 88],
  },
  {
    name: "Settings",
    rows: [
      ["Setting", "Value", "Notes"],
      [
        "API key",
        "",
        "Paste your own key here before using a refresh-enabled version. This distributed workbook intentionally ships blank.",
      ],
      ["Base URL", "https://api.oilpriceapi.com", "Editable if the API base changes."],
      ["Authentication", "Bearer token", "Use the key from cell B2 as the bearer token."],
    ],
    widths: [22, 34, 82],
  },
  {
    name: "Latest Prices",
    rows: [
      ["Status", "Power Query refresh is not implemented in this generated artifact."],
      [
        "Blocker",
        "A refreshable Power Query connection should be authored and verified in Excel or with a proven workbook library before website-clean links this file as fully self-service.",
      ],
      [
        "Expected flow",
        "After the blocker is resolved, paste an API key in Settings!B2 and click Data > Refresh All.",
      ],
      [],
      ["Commodity", "API code", "Expected result", "Refresh status"],
      ["WTI", "WTI_USD", "", "Pending Power Query implementation"],
      ["Brent", "BRENT_USD", "", "Pending Power Query implementation"],
      ["Natural gas", "NATURAL_GAS_USD", "", "Pending endpoint confirmation"],
      ["Diesel / fuel surcharge", "", "", "Pending endpoint confirmation"],
    ],
    widths: [26, 22, 34, 44],
  },
  {
    name: "Examples",
    rows: [
      ["Example", "Supported now?", "Notes"],
      ["WTI latest price", "Pending refresh implementation", "Use only after API code and query are verified."],
      ["Brent latest price", "Pending refresh implementation", "Use only after API code and query are verified."],
      ["Natural gas latest price", "Pending endpoint confirmation", "Do not market until endpoint is confirmed."],
      [
        "Diesel / fuel surcharge",
        "Pending endpoint confirmation",
        "Do not market until endpoint is confirmed.",
      ],
      [],
      ["Error states required before website link"],
      ["Missing API key"],
      ["Authentication failure"],
      ["Quota or rate-limit failure"],
      ["No data or unexpected empty response"],
    ],
    widths: [34, 34, 78],
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index) {
  let name = "";
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function sheetXml(sheet) {
  const cols = sheet.widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");
  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, cellIndex) => {
          if (value === undefined || value === null || value === "") {
            return "";
          }
          const reference = `${columnName(cellIndex + 1)}${rowIndex + 1}`;
          return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return xml(`\
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${rows}</sheetData>
</worksheet>`);
}

function xml(body) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`;
}

function workbookXml() {
  const sheets = SHEETS.map(
    (sheet, index) =>
      `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  ).join("");

  return xml(`\
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="false"/>
  <bookViews><workbookView activeTab="0"/></bookViews>
  <sheets>${sheets}</sheets>
</workbook>`);
}

function workbookRelsXml() {
  const sheetRelationships = SHEETS.map(
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join("");
  return xml(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRelationships}
  <Relationship Id="rId${SHEETS.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
}

function contentTypesXml() {
  const sheetOverrides = SHEETS.map(
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");
  return xml(`\
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheetOverrides}
</Types>`);
}

function rootRelsXml() {
  return xml(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function stylesXml() {
  return xml(`\
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`);
}

function appXml() {
  const sheetNames = SHEETS.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join("");
  return xml(`\
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>OilPriceAPI starter workbook generator</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${SHEETS.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${SHEETS.length}" baseType="lpstr">${sheetNames}</vt:vector></TitlesOfParts>
</Properties>`);
}

function coreXml() {
  return xml(`\
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>OilPriceAPI Excel Starter Workbook</dc:title>
  <dc:creator>OilPriceAPI</dc:creator>
  <cp:lastModifiedBy>OilPriceAPI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-05-11T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-05-11T00:00:00Z</dcterms:modified>
</cp:coreProperties>`);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(date.getUTCFullYear(), 1980);
  const time =
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    Math.floor(date.getUTCSeconds() / 2);
  const day = (year - 1980) << 9 | (date.getUTCMonth() + 1) << 5 | date.getUTCDate();
  return { time, day };
}

function writeZip(entries, outputPath) {
  const fixedDate = new Date(Date.UTC(2026, 4, 11, 0, 0, 0));
  const { time, day } = dosDateTime(fixedDate);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = Buffer.from(entry.content, "utf8");
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(day, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(day, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.writeFileSync(outputPath, Buffer.concat([...localParts, centralDirectory, end]));
}

const entries = [
  { name: "[Content_Types].xml", content: contentTypesXml() },
  { name: "_rels/.rels", content: rootRelsXml() },
  { name: "docProps/app.xml", content: appXml() },
  { name: "docProps/core.xml", content: coreXml() },
  { name: "xl/workbook.xml", content: workbookXml() },
  { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml() },
  { name: "xl/styles.xml", content: stylesXml() },
  ...SHEETS.map((sheet, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    content: sheetXml(sheet),
  })),
];

writeZip(entries, OUTPUT);
console.log(`Generated ${path.relative(ROOT, OUTPUT)} (${fs.statSync(OUTPUT).size} bytes)`);
