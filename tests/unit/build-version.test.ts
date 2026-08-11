import * as fs from "fs";
import * as path from "path";
import { parse } from "yaml";

type WorkflowStep = {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
};

type Workflow = {
  permissions?: Record<string, unknown>;
  jobs: Record<string, { steps: WorkflowStep[] }>;
};

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

  it("documents every customer-visible structured 403 recovery", () => {
    const taskpane = fs.readFileSync(
      path.join(root, "public", "taskpane.html"),
      "utf8",
    );
    const quickstart = fs.readFileSync(
      path.join(root, "CUSTOMER_QUICKSTART.md"),
      "utf8",
    );
    for (const code of [
      "API_ACCESS_SUSPENDED",
      "EMAIL_CONFIRMATION_REQUIRED",
      "ACCESS_DENIED",
      "UPGRADE_REQUIRED",
    ]) {
      expect(taskpane).toContain(`#${code}`);
      expect(quickstart).toContain(`#${code}`);
    }
    expect(taskpane).toMatch(
      /#UPGRADE_REQUIRED<\/strong>: (?:your )?quota or account entitlement/i,
    );
    const productFactSurfaces = [
      taskpane,
      quickstart,
      fs.readFileSync(path.join(root, "README.md"), "utf8"),
      fs.readFileSync(path.join(root, "APPSOURCE_METADATA.md"), "utf8"),
    ].join("\n");
    expect(productFactSurfaces).not.toMatch(
      /(?:product facts|product-facts)[^\n]{0,120}(?:reviewed|2026-0[67]|schema `1\.0\.0`)/i,
    );
  });

  it("keeps dependency audit in the hosted release gate", () => {
    for (const file of ["test.yml", "github-pages.yml"]) {
      const workflow = parse(
        fs.readFileSync(
          path.join(root, ".github", "workflows", file),
          "utf8",
        ),
      ) as Workflow;
      const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
      const checkout = steps.find(
        (step) => step.uses === "actions/checkout@v6",
      );
      const setupNode = steps.find(
        (step) => step.uses === "actions/setup-node@v6",
      );

      expect(workflow.permissions?.contents).toBe("read");
      expect(checkout?.with?.["persist-credentials"]).toBe(false);
      expect(setupNode?.with?.["node-version"]).toBe("24");
      expect(
        steps.some(
          (step) => step.run === "npm audit --audit-level=moderate",
        ),
      ).toBe(true);
      if (file === "github-pages.yml") {
        expect(steps.map((step) => step.uses)).toEqual(
          expect.arrayContaining([
            "actions/configure-pages@v6",
            "actions/upload-pages-artifact@v5",
            "actions/deploy-pages@v5",
          ]),
        );
      }
    }
  });

  it("distinguishes the semantic release from the submitted manifest build", () => {
    const distribution = fs.readFileSync(
      path.join(root, "DISTRIBUTION.md"),
      "utf8",
    );
    const metadata = fs.readFileSync(
      path.join(root, "APPSOURCE_METADATA.md"),
      "utf8",
    );
    expect(distribution).toMatch(/semantic add-in version/i);
    expect(distribution).toMatch(/built manifest\s+version/i);
    expect(metadata).toMatch(/exact submitted manifest/i);
    expect(metadata).toMatch(/sha-256/i);
  });
});
