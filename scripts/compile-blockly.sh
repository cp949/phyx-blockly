#!/usr/bin/env bash

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}/.."

cd blockly-src
npm ci
npm run build --workspace packages/blockly
npm run package --workspace packages/blockly
