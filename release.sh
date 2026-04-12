#!/usr/bin/env bash

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}"

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Releasing @cp949/phyx-blockly@${CURRENT_VERSION}"

node ./tests/validate-package-json.test.cjs
node ./tests/dist-integration.test.cjs

cd dist
npm publish . --access=public --registry=https://registry.npmjs.org/
