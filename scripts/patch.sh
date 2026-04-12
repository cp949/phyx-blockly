#!/usr/bin/env bash

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}/.."

git -C blockly-src restore .
node ./scripts/copy-patch-files.cjs
