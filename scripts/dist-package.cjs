const fs = require("fs");

function main() {
  const fromPkg = JSON.parse(fs.readFileSync("package.json"));
  const toPkg = JSON.parse(fs.readFileSync("dist/package.json"));

  const fromVersion = fromPkg["version"];
  let toVersion = toPkg["version"];

  // 블록리의 특정 버전을 여러 번 패치할 수 있으므로
  // 끝에 patch.N 형태의 버전번호를 붙인다.
  // ex) 12.5.1-patch.1
  // N은 점으로 분리한다. 점이 없으면 semver가 문자열로 비교해 p10 < p2가 된다.
  if (fromVersion === toVersion) {
    console.warn(
      `warning: version is same '${fromVersion}', need updating suffix patch number`
    );
  }

  const arr = [
    "version",
    "name",
    "description",
    "repository",
    "bugs",
    "homepage",
    "author",
    "license",
    "keywords",
    "publishConfig",
  ];
  arr.forEach((it) => {
    toPkg[it] = fromPkg[it];
  });

  fs.writeFileSync("dist/package.json", JSON.stringify(toPkg, null, 2));
  fs.copyFileSync("./README.md", "dist/README.md");
}

main();
