const fs = require("fs");
const path = require("path");
const shell = require("shelljs");

function collectFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, {withFileTypes: true});

  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return [fullPath];
  });
}

function validatePatchFiles() {
  const srcRoot = path.resolve("src");
  if (!fs.existsSync(srcRoot)) {
    throw new Error(`patch source directory does not exist: ${srcRoot}`);
  }

  const files = collectFiles(srcRoot);
  if (files.length === 0) {
    throw new Error(`patch source directory is empty: ${srcRoot}`);
  }
}

function copyPatchFiles() {
  validatePatchFiles();
  const result = shell.cp("-rf", "src/*", "blockly-src/");
  if (result.code !== 0) {
    throw new Error("failed to copy patch files into blockly-src");
  }
}

function main() {
  copyPatchFiles();
}

main();
