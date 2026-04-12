#!/usr/bin/env bash

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}"

rm -rf dist
rm -rf node_modules
rm -rf blockly-src/node_modules
bash ./reset-blockly-src.sh
