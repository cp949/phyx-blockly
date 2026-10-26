#!/usr/bin/env bash

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}"

UPSTREAM_REF=$(cat ./UPSTREAM_REF.txt | tr -d '[:space:]')

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      if [[ -z "$2" ]]; then
        echo "missing value for --ref" >&2
        exit 1
      fi
      UPSTREAM_REF="$2"
      shift 2
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

cleanup() {
  git -C blockly-src restore .
}

trap cleanup EXIT

rm -f .dist-ref

git -C blockly-src fetch --tags origin

if [[ "${UPSTREAM_REF}" == "latest" ]]; then
  UPSTREAM_REF=$(git -C blockly-src tag --sort=-v:refname | grep -E '^blockly-v[0-9]' | head -1)
  echo "latest tag: ${UPSTREAM_REF}"
fi

git -C blockly-src checkout "${UPSTREAM_REF}"
echo "blockly-src: $(git -C blockly-src describe --tags --exact-match 2>/dev/null || git -C blockly-src rev-parse --short HEAD)"

node ./scripts/patch-base.cjs check HEAD
bash ./scripts/patch.sh
bash ./scripts/compile-blockly.sh

rm -rf dist
cp -rf blockly-src/packages/blockly/dist dist
node ./scripts/dist-package.cjs

# release.sh가 dist의 upstream ref를 확인할 수 있도록 기록한다.
echo "${UPSTREAM_REF}" > .dist-ref
