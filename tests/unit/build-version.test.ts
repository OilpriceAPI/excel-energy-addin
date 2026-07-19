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
});
