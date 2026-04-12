#!/usr/bin/env bash

set -e

# Run from the repository root regardless of the caller's current directory.
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}"

# Read the package version once so logging and publish behavior stay in sync.
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Releasing @cp949/phyx-blockly@${CURRENT_VERSION}"

# Pre-release versions must be published under a non-latest npm tag.
PUBLISH_TAG=""
if [[ "${CURRENT_VERSION}" == *-* ]]; then
  PUBLISH_TAG="next"
fi

# Block publishing unless the package metadata and built dist package are valid.
node ./tests/validate-package-json.test.cjs
node ./tests/dist-integration.test.cjs

cd dist
if [[ -n "${PUBLISH_TAG}" ]]; then
  # Pass "--tag next" so npm does not treat a patch pre-release as the default latest release.
  npm publish . --access=public --registry=https://registry.npmjs.org/ --tag "${PUBLISH_TAG}"
else
  npm publish . --access=public --registry=https://registry.npmjs.org/
fi
