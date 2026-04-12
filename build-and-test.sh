#!/usr/bin/env bash

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}"

node ./tests/validate-package-json.test.cjs

bash ./build.sh

node ./tests/dist-integration.test.cjs
