const fs = require("fs");
const path = require("path");
const assert = require("assert");

function readJson(relativePath) {
  const fullPath = path.join(__dirname, "..", relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function testPackageBranding() {
  const pkg = readJson("package.json");

  assert.equal(pkg.name, "@cp949/phyx-blockly");
  // npm이 repository.url을 `git+https://` 형태로 정규화하므로 접두사를 허용한다.
  assert.equal(
    pkg.repository.url.replace(/^git\+/, ""),
    "https://github.com/cp949/phyx-blockly.git"
  );
  assert.equal(pkg.bugs.url, "https://github.com/cp949/phyx-blockly/issues");
  assert.equal(pkg.homepage, "https://github.com/cp949/phyx-blockly");
  assert.equal(pkg.publishConfig.registry, "https://registry.npmjs.org/");
  assert.ok(
    pkg.keywords.includes("phyx"),
    "package keywords should include phyx",
  );
}

function main() {
  testPackageBranding();
  console.log("validate-package-json tests passed");
}

main();
