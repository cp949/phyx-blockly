#!/usr/bin/env bash

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}"

UPSTREAM_REF=$(cat ./UPSTREAM_REF.txt | tr -d '[:space:]')

git -C blockly-src fetch --tags origin

if [[ "${UPSTREAM_REF}" == "latest" ]]; then
  UPSTREAM_REF=$(git -C blockly-src tag --sort=-v:refname | grep -E '^blockly-v[0-9]' | head -1)
  echo "latest tag: ${UPSTREAM_REF}"
fi

git -C blockly-src restore .
git -C blockly-src checkout "${UPSTREAM_REF}"
echo "blockly-src: $(git -C blockly-src describe --tags --exact-match 2>/dev/null || git -C blockly-src rev-parse --short HEAD)"
