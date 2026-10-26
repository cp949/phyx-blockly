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
  // Blockly 13부터 jsdom이 dependencies에서 peerDependencies로 옮겨졌다.
  const distPkg = require(path.join(repoRoot, "dist", "package.json"));
  const jsdomVersion =
    distPkg.dependencies?.jsdom ?? distPkg.peerDependencies?.jsdom;

  if (!jsdomVersion) {
    throw new Error(
      "dist/package.json does not declare a jsdom dependency or peerDependency."
    );
  }

  installPackage(tempRoot, `jsdom@${jsdomVersion}`);
}

function createConsumerFixture() {
  const repoRoot = path.resolve(__dirname, "..");
  const distRoot = path.join(repoRoot, "dist");

  if (!fs.existsSync(path.join(distRoot, "package.json"))) {
    throw new Error("dist package does not exist. Run `npm run build` first.");
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

const XML_NS = "https://developers.google.com/blockly/xml";

function numberBlock(value) {
  return `<block type="math_number"><field name="NUM">${value}</field></block>`;
}

function generateCode({Blockly, javascript}, xmlText) {
  const workspace = new Blockly.Workspace();
  const xml = Blockly.utils.xml.textToDom(xmlText);

  Blockly.Xml.domToWorkspace(xml, workspace);
  return javascript.javascriptGenerator.workspaceToCode(workspace);
}

// 생성한 코드를 async 함수로 실행하고 result 변수 값을 돌려준다.
// 정규식만으로는 await 우선순위가 틀려도 잡지 못하므로 실제로 실행한다.
function runAndGetResult(code) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return new AsyncFunction(`${code}\nreturn result;`)();
}

function testNoReturnProcedure(blockly) {
  const code = generateCode(
    blockly,
    `
    <xml xmlns="${XML_NS}">
      <block type="procedures_defnoreturn" x="10" y="10">
        <field name="NAME">myFunc</field>
      </block>
      <block type="procedures_callnoreturn" x="10" y="120">
        <mutation name="myFunc"></mutation>
        <field name="NAME">myFunc</field>
      </block>
    </xml>
  `
  );

  assert.match(code, /async function myFunc\(\)/);
  assert.match(code, /await myFunc\(\);/);
}

async function testReturnProcedureInExpression(blockly) {
  const code = generateCode(
    blockly,
    `
    <xml xmlns="${XML_NS}">
      <variables><variable id="r1">result</variable></variables>
      <block type="procedures_defreturn" x="10" y="10">
        <field name="NAME">getValue</field>
        <value name="RETURN">${numberBlock(41)}</value>
      </block>
      <block type="variables_set" x="10" y="120">
        <field name="VAR" id="r1">result</field>
        <value name="VALUE">
          <block type="math_arithmetic">
            <field name="OP">ADD</field>
            <value name="A">
              <block type="procedures_callreturn">
                <mutation name="getValue"></mutation>
                <field name="NAME">getValue</field>
              </block>
            </value>
            <value name="B">${numberBlock(1)}</value>
          </block>
        </value>
      </block>
    </xml>
  `
  );

  assert.match(code, /async function getValue\(\)/);
  assert.match(code, /await getValue\(\)/);
  assert.equal(await runAndGetResult(code), 42);
}

// await 결과에 멤버 접근을 하려면 괄호가 필요하다.
// Order.FUNCTION_CALL로 두면 `await getText().length`가 되어 Promise의 length를 읽는다.
async function testReturnProcedureWithMemberAccess(blockly) {
  const code = generateCode(
    blockly,
    `
    <xml xmlns="${XML_NS}">
      <variables><variable id="r1">result</variable></variables>
      <block type="procedures_defreturn" x="10" y="10">
        <field name="NAME">getText</field>
        <value name="RETURN">
          <block type="text"><field name="TEXT">hello</field></block>
        </value>
      </block>
      <block type="variables_set" x="10" y="120">
        <field name="VAR" id="r1">result</field>
        <value name="VALUE">
          <block type="text_length">
            <value name="VALUE">
              <block type="procedures_callreturn">
                <mutation name="getText"></mutation>
                <field name="NAME">getText</field>
              </block>
            </value>
          </block>
        </value>
      </block>
    </xml>
  `
  );

  assert.match(code, /\(await getText\(\)\)\.length/);
  assert.equal(await runAndGetResult(code), 5);
}

// 인자 이름은 13.x의 Block.getVarModels()와 getId() 패치 경로를 지난다.
async function testReturnProcedureWithArgument(blockly) {
  const code = generateCode(
    blockly,
    `
    <xml xmlns="${XML_NS}">
      <variables>
        <variable id="r1">result</variable>
        <variable id="x1">x</variable>
      </variables>
      <block type="procedures_defreturn" x="10" y="10">
        <mutation><arg name="x" varid="x1"></arg></mutation>
        <field name="NAME">addOne</field>
        <value name="RETURN">
          <block type="math_arithmetic">
            <field name="OP">ADD</field>
            <value name="A">
              <block type="variables_get"><field name="VAR" id="x1">x</field></block>
            </value>
            <value name="B">${numberBlock(1)}</value>
          </block>
        </value>
      </block>
      <block type="variables_set" x="10" y="120">
        <field name="VAR" id="r1">result</field>
        <value name="VALUE">
          <block type="procedures_callreturn">
            <mutation name="addOne"><arg name="x"></arg></mutation>
            <field name="NAME">addOne</field>
            <value name="ARG0">${numberBlock(41)}</value>
          </block>
        </value>
      </block>
    </xml>
  `
  );

  assert.match(code, /async function addOne\(x\)/);
  assert.match(code, /await addOne\(41\)/);
  assert.equal(await runAndGetResult(code), 42);
}

async function main() {
  const tempRoot = createConsumerFixture();

  try {
    const blockly = loadBlocklyFromFixture(tempRoot);

    testNoReturnProcedure(blockly);
    await testReturnProcedureInExpression(blockly);
    await testReturnProcedureWithMemberAccess(blockly);
    await testReturnProcedureWithArgument(blockly);
    console.log("dist integration tests passed");
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
