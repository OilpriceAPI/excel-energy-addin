#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "Energy_Price_Comparison_Template.xlsx");
const PUBLIC_OUTPUT = path.join(ROOT, "public", "Energy_Price_Comparison_Template.xlsx");

const STYLE = {
  normal: 0,
  title: 1,
  eyebrow: 2,
  muted: 3,
  label: 4,
  input: 5,
  status: 6,
  header: 7,
  price: 8,
  footnote: 9,
  code: 10,
};

const SHEETS = [
  {
    name: "Latest Prices",
    activeCell: "B5",
    widths: [
      20,
      30,
      14,
      24,
      28,
      16,
      { width: 4, hidden: true },
      { width: 4, hidden: true },
      { width: 4, hidden: true },
      { width: 58, hidden: true },
    ],
    rows: [
      row(24, { A: text("OilPriceAPI", STYLE.eyebrow) }),
      row(40, {
        A: text("Latest oil prices", STYLE.title),
        J: formula('IF($B$5="","",WEBSERVICE($J$3&$J$4&"?api_key="&$B$5&"&codes="&$J$5))'),
      }),
      row(24, {
        A: text("Paste your key once. Press Enter. WTI and Brent appear below.", STYLE.muted),
        J: text("https://api.oilpriceapi.com"),
      }),
      row(8, { J: text("/v1/prices/excel-latest.xml") }),
      row(30, {
        A: text("API key", STYLE.label),
        B: blank(STYLE.input),
        C: text("Paste key here and press Enter", STYLE.muted),
        J: text("WTI_USD,BRENT_CRUDE_USD"),
      }),
      row(28, {
        A: text("Status", STYLE.label),
        B: formula(
          'IF($B$5="","Waiting for API key",IFERROR(IF(FILTERXML($J$2,"/oilpriceapi/status")="auth_failed","API key was not accepted. Check the key cell and try again.",FILTERXML($J$2,"/oilpriceapi/message")),"Excel formula fetch did not return data. Use oilpriceapi.com/excel for instant download."))',
          "Waiting for API key",
          STYLE.status,
        ),
      }),
      row(24, {
        A: text("Retrieved", STYLE.label),
        B: formula('IF($B$5="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/retrieved_at"),""))', "", STYLE.muted),
      }),
      row(12, {}),
      row(24, {
        A: text("Benchmark", STYLE.header),
        B: text("Price", STYLE.header),
        C: text("Currency", STYLE.header),
        D: text("Source", STYLE.header),
        E: text("Timestamp", STYLE.header),
        F: text("Status", STYLE.header),
      }),
      row(34, {
        A: text("WTI crude", STYLE.normal),
        B: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[1]/formatted"),""))', "", STYLE.price),
        C: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[1]/currency"),""))'),
        D: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[1]/source"),""))'),
        E: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[1]/timestamp"),""))', "", STYLE.muted),
        F: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[1]/status"),""))'),
      }),
      row(34, {
        A: text("Brent crude", STYLE.normal),
        B: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[2]/formatted"),""))', "", STYLE.price),
        C: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[2]/currency"),""))'),
        D: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[2]/source"),""))'),
        E: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[2]/timestamp"),""))', "", STYLE.muted),
        F: formula('IF($J$2="","",IFERROR(FILTERXML($J$2,"/oilpriceapi/prices/price[2]/status"),""))'),
      }),
      row(18, {}),
      row(36, {
        A: text("If it does not load", STYLE.label),
        B: text(
          "Use the instant Excel download at oilpriceapi.com/excel if workbook formulas are blocked.",
          STYLE.footnote,
        ),
      }),
    ],
  },
];

function row(height, cells) {
  return { height, cells };
}

function text(value, style = STYLE.normal) {
  return { value, style };
}

function blank(style = STYLE.normal) {
  return { value: "", style, preserveBlank: true };
}

function formula(value, cached = "", style = STYLE.normal) {
  return { formula: value, cached, style };
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

function cellReference(column, rowNumber) {
  if (Number.isInteger(column)) {
    return `${columnName(column)}${rowNumber}`;
  }
  return `${column}${rowNumber}`;
}

function cellXml(cell, reference) {
  if (cell === undefined || cell === null) {
    return "";
  }

  const value = typeof cell === "object" ? cell : { value: cell, style: STYLE.normal };
  const style = value.style === undefined ? "" : ` s="${value.style}"`;

  if (Object.prototype.hasOwnProperty.call(value, "formula")) {
    const cached = value.cached === undefined ? "" : `<v>${escapeXml(value.cached)}</v>`;
    return `<c r="${reference}" s="${value.style || STYLE.normal}" t="str"><f>${escapeXml(value.formula)}</f>${cached}</c>`;
  }

  if (value.value === "" && value.preserveBlank) {
    return `<c r="${reference}"${style}/>`;
  }

  if (value.value === "") {
    return "";
  }

  return `<c r="${reference}"${style} t="inlineStr"><is><t>${escapeXml(value.value)}</t></is></c>`;
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
    .map((sheetRow, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const height = sheetRow.height ? ` ht="${sheetRow.height}" customHeight="1"` : "";
      const cells = Object.entries(sheetRow.cells)
        .map(([column, value]) => cellXml(value, cellReference(column, rowNumber)))
        .join("");
      return `<row r="${rowNumber}"${height}>${cells}</row>`;
    })
    .join("");

  return xml(`\
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="0" tabSelected="1">
      <selection activeCell="${escapeXml(sheet.activeCell)}" sqref="${escapeXml(sheet.activeCell)}"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
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
    <definedName name="ApiKey">'Latest Prices'!$B$5</definedName>
    <definedName name="ApiBaseUrl">'Latest Prices'!$J$3</definedName>
    <definedName name="WorkbookEndpoint">'Latest Prices'!$J$4</definedName>
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
  <fonts count="6">
    <font><sz val="11"/><color rgb="FF1F2933"/><name val="Aptos"/></font>
    <font><sz val="24"/><color rgb="FF111111"/><name val="Georgia"/></font>
    <font><sz val="9"/><color rgb="FF7A746A"/><name val="Aptos"/></font>
    <font><b/><sz val="10"/><color rgb="FF4A4036"/><name val="Aptos"/></font>
    <font><sz val="18"/><color rgb="FF111111"/><name val="Georgia"/></font>
    <font><sz val="9"/><color rgb="FF6B6258"/><name val="Aptos"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF3C4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFAF8F1"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border/>
    <border><bottom style="thin"><color rgb="FFBDB6A8"/></bottom></border>
    <border><left style="thin"><color rgb="FFE1D8C8"/></left><right style="thin"><color rgb="FFE1D8C8"/></right><top style="thin"><color rgb="FFE1D8C8"/></top><bottom style="thin"><color rgb="FFE1D8C8"/></bottom></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="2" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment wrapText="1" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="bottom"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top"/></xf>
  </cellXfs>
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
  const day = ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
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
