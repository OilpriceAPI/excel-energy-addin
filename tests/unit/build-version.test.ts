import * as fs from "fs";
import * as path from "path";

describe("release version contract", () => {
  const root = path.join(__dirname, "..", "..");

  it("keeps the package, manifest, task pane, and runtime versions aligned", () => {
    const packageVersion = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ).version;
    const manifest = fs.readFileSync(path.join(root, "manifest.xml"), "utf8");
    const taskpane = fs.readFileSync(
      path.join(root, "public", "taskpane.html"),
      "utf8",
    );
    const attribution = fs.readFileSync(
      path.join(root, "src", "utils", "client-attribution.ts"),
      "utf8",
    );

    expect(packageVersion).toBe("1.1.1");
    expect(manifest).toContain(`<Version>${packageVersion}.0</Version>`);
    expect(taskpane).toContain(`id="diag-version">${packageVersion}</dd>`);
    expect(attribution).toContain(
      `OILPRICEAPI_EXCEL_VERSION = "${packageVersion}"`,
    );
  });

  it("derives deployed versions from the source major and minor version", () => {
    const stampScript = fs.readFileSync(
      path.join(root, "scripts", "stamp-cache-bust.js"),
      "utf8",
    );

    expect(stampScript).not.toContain("return `1.0.${runNumber.trim()}.0`");
    expect(stampScript).toContain("parts[0]");
    expect(stampScript).toContain("parts[1]");
  });

  it("keeps browser attribution source and operator guidance aligned", () => {
    const functions = fs.readFileSync(
      path.join(root, "src", "functions", "functions.ts"),
      "utf8",
    );
    const taskpane = fs.readFileSync(
      path.join(root, "src", "taskpane", "taskpane.ts"),
      "utf8",
    );
    const operatorGuideFiles = [
      "ADDIN_ACTIVATION_CHECKLIST.md",
      "DISTRIBUTION.md",
      "EXCEL_SUPPORT_RUNBOOK.md",
      "INSTALL.md",
    ];

    for (const source of [functions, taskpane]) {
      expect(source).toContain('"X-API-Client": OILPRICEAPI_EXCEL_CLIENT');
      expect(source).toContain(
        '"X-Excel-Addin-Version": OILPRICEAPI_EXCEL_VERSION',
      );
    }
    for (const file of operatorGuideFiles) {
      const guide = fs.readFileSync(path.join(root, file), "utf8");
      expect(guide).toMatch(
        /authorization,content-type,x-api-client,x-excel-addin-version/i,
      );
      expect(guide).not.toMatch(/do not request `x-api-client`/i);
      expect(guide).not.toMatch(
        /request shape is limited to `authorization,content-type`/i,
      );
    }
  });
});
