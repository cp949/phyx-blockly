const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

// src/ 파일을 복사해 upstream 파일을 통째로 덮어쓴다.
// upstream이 같은 파일을 바꿔도 모르고 지나가지 않도록,
// 패치 기준이 된 upstream 파일의 blob 해시를 src-base.json에 기록한다.
//
// 사용법: node scripts/patch-base.cjs <check|diff|accept> [ref]
//   check   기록한 해시와 upstream 현재 해시를 비교한다. 다르면 실패한다.
//   diff    src/ 파일과 upstream 파일의 차이를 보여준다.
//   accept  upstream 변경을 검토한 뒤 현재 해시를 기록한다.
// ref를 생략하면 UPSTREAM_REF.txt를 쓴다.

const BLOCKLY_SRC = "blockly-src";
const MANIFEST = "src-base.json";

function git(args, options = {}) {
  return childProcess.execFileSync("git", ["-C", BLOCKLY_SRC, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function collectFiles(dirPath) {
  return fs.readdirSync(dirPath, {withFileTypes: true}).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
  });
}

function listPatchFiles() {
  const srcRoot = path.resolve("src");
  return collectFiles(srcRoot)
    .map((file) => path.relative(srcRoot, file).split(path.sep).join("/"))
    .sort();
}

function resolveRef(refArg) {
  const ref = refArg ?? fs.readFileSync("UPSTREAM_REF.txt", "utf8").trim();
  if (ref !== "latest") {
    return ref;
  }
  // build.sh와 같은 규칙으로 latest를 태그로 푼다.
  return git(["tag", "--sort=-v:refname"])
    .split("\n")
    .find((tag) => /^blockly-v[0-9]/.test(tag));
}

// upstream에 없는 파일(패치로 새로 만든 파일)은 null이다.
function upstreamBlob(ref, file) {
  try {
    return git(["rev-parse", `${ref}:${file}`]).trim();
  } catch {
    return null;
  }
}

function readManifest() {
  if (!fs.existsSync(MANIFEST)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

function writeManifest(ref, files) {
  const manifest = {ref, files};
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

function check(ref) {
  const manifest = readManifest();
  if (!manifest) {
    console.error(`${MANIFEST}가 없다. 'npm run patch:accept'로 만든다.`);
    process.exit(1);
  }

  const problems = [];
  const srcFiles = listPatchFiles();

  for (const file of srcFiles) {
    if (!(file in manifest.files)) {
      problems.push(`${file}: ${MANIFEST}에 기록이 없다.`);
      continue;
    }
    const base = manifest.files[file];
    const actual = upstreamBlob(ref, file);
    if (base === actual) {
      continue;
    }
    problems.push(`${file}: upstream(${ref})이 패치 기준과 다르다.`);
    if (base && actual) {
      // 기준 blob과 현재 blob의 차이가 곧 upstream이 바꾼 내용이다.
      problems.push(git(["diff", "--no-color", base, actual]));
    }
  }

  for (const file of Object.keys(manifest.files)) {
    if (!srcFiles.includes(file)) {
      problems.push(`${file}: ${MANIFEST}에는 있으나 src/에 없다.`);
    }
  }

  if (problems.length > 0) {
    console.error(problems.join("\n"));
    console.error(
      [
        "",
        "src/ 패치 파일을 upstream 변경에 맞춰 수정한다.",
        "'npm run patch:diff'로 src/와 upstream의 차이를 본다.",
        "수정을 마치면 'npm run patch:accept'로 기준을 갱신한다.",
      ].join("\n")
    );
    process.exit(1);
  }
  console.log(`patch base ok (${srcFiles.length} files, ${ref})`);
}

function diff(ref) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patch-diff-"));
  try {
    for (const file of listPatchFiles()) {
      console.log(`=== ${file}`);
      if (!upstreamBlob(ref, file)) {
        console.log("(upstream에 없는 새 파일)");
        continue;
      }
      const upstreamPath = path.join(tmpRoot, "upstream");
      fs.writeFileSync(upstreamPath, git(["show", `${ref}:${file}`]));
      // 차이가 있으면 git diff --no-index는 종료 코드 1을 돌려준다.
      const result = childProcess.spawnSync(
        "git",
        [
          "diff",
          "--no-index",
          "--no-color",
          "--no-prefix",
          upstreamPath,
          path.join("src", file),
        ],
        {encoding: "utf8"}
      );
      console.log(
        // git은 헤더의 절대 경로에서 앞의 /를 뗀다. 두 형태를 모두 바꾼다.
        result.stdout
          .replaceAll(upstreamPath, `upstream/${file}`)
          .replaceAll(upstreamPath.slice(1), `upstream/${file}`) ||
          "(차이 없음)"
      );
    }
  } finally {
    fs.rmSync(tmpRoot, {recursive: true, force: true});
  }
}

function accept(ref) {
  const files = {};
  for (const file of listPatchFiles()) {
    files[file] = upstreamBlob(ref, file);
  }
  writeManifest(ref, files);
  console.log(`${MANIFEST} updated (${ref})`);
}

function main() {
  const [command, refArg] = process.argv.slice(2);
  const commands = {check, diff, accept};
  if (!commands[command]) {
    console.error("usage: patch-base.cjs <check|diff|accept> [ref]");
    process.exit(1);
  }
  commands[command](resolveRef(refArg));
}

main();
