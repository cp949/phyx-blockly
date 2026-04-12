const fs = require("fs");
const path = require("path");
const assert = require("assert");
const childProcess = require("child_process");
const {createRequire} = require("module");

function installPackage(tempRoot, spec) {
  childProcess.execFileSync(
    "npm",
    ["install", "--no-save", "--no-package-lock", spec],
    {
      cwd: tempRoot,
      stdio: "pipe",
    }
  );
}

function linkOrInstallJsdom(repoRoot, tempRoot, nodeModulesDir) {
  const jsdomVersion =
    require(path.join(repoRoot, "dist", "package.json")).dependencies?.jsdom;

  if (!jsdomVersion) {
    throw new Error("dist/package.json does not declare a jsdom dependency.");
  }

  installPackage(tempRoot, `jsdom@${jsdomVersion}`);
}

function createConsumerFixture() {
  const repoRoot = path.resolve(__dirname, "..");
  const distRoot = path.join(repoRoot, "dist");

  if (!fs.existsSync(path.join(distRoot, "package.json"))) {
    throw new Error("dist package does not exist. Run `npm run dist` first.");
  }

  const tempRoot = fs.mkdtempSync(path.join(repoRoot, ".tmp-dist-test-"));
  const nodeModulesDir = path.join(tempRoot, "node_modules");
  const aliasedBlocklyDir = path.join(nodeModulesDir, "blockly");

  fs.mkdirSync(nodeModulesDir, {recursive: true});
  fs.writeFileSync(
    path.join(tempRoot, "package.json"),
    JSON.stringify({name: "dist-integration-test", version: "1.0.0"})
  );
  linkOrInstallJsdom(repoRoot, tempRoot, nodeModulesDir);
  fs.cpSync(distRoot, aliasedBlocklyDir, {recursive: true});

  return tempRoot;
}

function loadBlocklyFromFixture(tempRoot) {
  const requireFromFixture = createRequire(path.join(tempRoot, "package.json"));
  return {
    Blockly: requireFromFixture("blockly"),
    javascript: requireFromFixture("blockly/javascript"),
  };
}

function buildWorkspaceXml() {
  return `
    <xml xmlns="https://developers.google.com/blockly/xml">
      <block type="procedures_defnoreturn" x="10" y="10">
        <field name="NAME">myFunc</field>
      </block>
      <block type="procedures_callnoreturn" x="10" y="120">
        <mutation name="myFunc"></mutation>
        <field name="NAME">myFunc</field>
      </block>
    </xml>
  `;
}

function testDistGeneratesAsyncProcedureCode() {
  const tempRoot = createConsumerFixture();

  try {
    const {Blockly, javascript} = loadBlocklyFromFixture(tempRoot);
    const workspace = new Blockly.Workspace();
    const xml = Blockly.utils.xml.textToDom(buildWorkspaceXml());

    Blockly.Xml.domToWorkspace(xml, workspace);
    const code = javascript.javascriptGenerator.workspaceToCode(workspace);

    assert.match(code, /async function myFunc\(\)/);
    assert.match(code, /await myFunc\(\);/);
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
}

function main() {
  testDistGeneratesAsyncProcedureCode();
  console.log("dist integration tests passed");
}

main();
