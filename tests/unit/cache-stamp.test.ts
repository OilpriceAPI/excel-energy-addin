import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";

it("stamps minified runtime URLs and keeps existing query strings intact", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "opa-cache-stamp-"));
  try {
    fs.mkdirSync(path.join(temporary, "scripts"));
    fs.mkdirSync(path.join(temporary, "dist"));
    fs.copyFileSync(
      path.join(__dirname, "../../scripts/stamp-cache-bust.js"),
      path.join(temporary, "scripts/stamp-cache-bust.js"),
    );
    fs.writeFileSync(path.join(temporary, "dist/manifest.xml"),
      '<Version>1.1.1.0</Version><Url DefaultValue="https://example.com/functions.js"/>');
    fs.writeFileSync(path.join(temporary, "dist/functions.json"), "{}");
    const html = '<script src=functions.js></script><script src=taskpane.js defer></script>' +
      '<script src="functions.js"></script><script src=\'taskpane.js\'></script>' +
      '<script src="functions.js?v=existing"></script>';
    fs.writeFileSync(path.join(temporary, "dist/taskpane.html"), html);
    execFileSync(process.execPath, [path.join(temporary, "scripts/stamp-cache-bust.js")], {
      env: { ...process.env, GITHUB_SHA: "abcdef0123456789", GITHUB_RUN_NUMBER: "42" },
      stdio: "pipe",
    });
    const stamped = fs.readFileSync(path.join(temporary, "dist/taskpane.html"), "utf8");
    expect(stamped).toContain("src=functions.js?v=abcdef0>");
    expect(stamped).toContain("src=taskpane.js?v=abcdef0 defer");
    expect(stamped).toContain('src="functions.js?v=abcdef0"');
    expect(stamped).toContain("src='taskpane.js?v=abcdef0'");
    expect(stamped).toContain('src="functions.js?v=existing"');
    const manifest = fs.readFileSync(path.join(temporary, "dist/manifest.xml"), "utf8");
    expect(manifest).toContain("<Version>1.1.42.0</Version>");
    expect(manifest).toContain('functions.js?v=abcdef0"');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
