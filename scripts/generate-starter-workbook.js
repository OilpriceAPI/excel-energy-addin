#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "Energy_Price_Comparison_Template.xlsx");
const PUBLIC_OUTPUT = path.join(ROOT, "public", "Energy_Price_Comparison_Template.xlsx");

const SHEETS = [
  {
    name: "Start Here",
    rows: [
      ["OilPriceAPI Excel Starter Workbook"],
      ["Step", "What to do"],
      ["1", "Paste your OilPriceAPI key into Settings cell B2."],
      ["2", "Go to Latest Prices. WTI and Brent should populate automatically."],
      ["3", "If Excel does not refresh immediately, use Formulas > Calculate Now or Data > Refresh All."],
      [],
      [
        "Compatibility",
        "Formula refresh uses WEBSERVICE and FILTERXML, which are intended for Windows desktop Excel. Use this starter on Excel for Windows, not Excel for Mac or Excel for the web.",
      ],
      ["No XML or manifest setup", "Do not use Developer tools, XML Expansion Packs, sideloading, or macros for this workbook."],
      [
        "Status",
        "This workbook is valid .xlsx structure, contains no embedded API key, and uses native Excel formulas.",
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
        "Paste your own OilPriceAPI key here. The distributed workbook intentionally ships blank.",
      ],
      ["Base URL", "https://api.oilpriceapi.com", "Editable if the API base changes."],
      ["Workbook endpoint", "/v1/prices/excel-latest.xml", "Used by native Excel formulas on the Latest Prices sheet."],
      ["Included benchmarks", "WTI_USD,BRENT_CRUDE_USD", "Starter workbook scope for first value."],
    ],
    widths: [22, 34, 82],
  },
  {
    name: "Latest Prices",
    rows: [
      ["OilPriceAPI latest prices"],
      [
        "Workbook status",
        formula('IF(Settings!$B$2="","Missing API key - paste your OilPriceAPI key into Settings!B2.",IFERROR(FILTERXML($J$10,"/oilpriceapi/message"),"Refresh error - check API key and network."))'),
      ],
      [
        "Retrieved at",
        formula('IF(Settings!$B$2="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/retrieved_at"),""))'),
      ],
      [],
      ["Commodity", "API code", "Price", "Formatted", "Currency", "Unit", "Source", "Timestamp", "Status"],
      [
        "WTI crude",
        "WTI_USD",
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[1]/value"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[1]/formatted"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[1]/currency"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[1]/unit"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[1]/source"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[1]/timestamp"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[1]/status"),""))'),
      ],
      [
        "Brent crude",
        "BRENT_CRUDE_USD",
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[2]/value"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[2]/formatted"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[2]/currency"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[2]/unit"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[2]/source"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[2]/timestamp"),""))'),
        formula('IF($J$10="","",IFERROR(FILTERXML($J$10,"/oilpriceapi/prices/price[2]/status"),""))'),
      ],
      [],
      ["Visible error states", "Missing API key", "Authentication failure", "Quota or rate-limit failure", "No data or unexpected empty response"],
      ["Raw response", "", "", "", "", "", "", "", "", formula('IF(Settings!$B$2="","",WEBSERVICE(Settings!$B$3&Settings!$B$4&"?api_key="&Settings!$B$2&"&codes="&Settings!$B$5))')],
    ],
    widths: [22, 22, 14, 16, 12, 14, 28, 28, 16, { width: 18, hidden: true }],
  },
  {
    name: "Examples",
    rows: [
      ["Example", "Supported now?", "Notes"],
      ["WTI latest price", "Yes", "Paste API key in Settings!B2 and read the WTI row on Latest Prices."],
      ["Brent latest price", "Yes", "Paste API key in Settings!B2 and read the Brent row on Latest Prices."],
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

function formula(value, cached = "") {
  return { formula: value, cached };
}

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

function cellXml(value, reference) {
  if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "formula")) {
    const cached = value.cached === undefined ? "" : `<v>${escapeXml(value.cached)}</v>`;
    return `<c r="${reference}" t="str"><f>${escapeXml(value.formula)}</f>${cached}</c>`;
  }

  return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function sheetXml(sheet) {
  const cols = sheet.widths
    .map((widthConfig, index) => {
      const width = typeof widthConfig === "object" ? widthConfig.width : widthConfig;
      const hidden = typeof widthConfig === "object" && widthConfig.hidden ? ' hidden="1"' : "";
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"${hidden}/>`;
    })
    .join("");
  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, cellIndex) => {
          if (value === undefined || value === null || value === "") {
            return "";
          }
          const reference = `${columnName(cellIndex + 1)}${rowIndex + 1}`;
          return cellXml(value, reference);
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
  <definedNames>
    <definedName name="ApiKey">'Settings'!$B$2</definedName>
    <definedName name="ApiBaseUrl">'Settings'!$B$3</definedName>
    <definedName name="WorkbookEndpoint">'Settings'!$B$4</definedName>
  </definedNames>
  <calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>
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
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
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
writeZip(entries, PUBLIC_OUTPUT);
console.log(`Generated ${path.relative(ROOT, PUBLIC_OUTPUT)} (${fs.statSync(PUBLIC_OUTPUT).size} bytes)`);
