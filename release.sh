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

# Block publishing a dist that was built from another version or upstream ref.
# release.sh does not build, so a stale dist would be published as-is.
if [[ ! -f dist/package.json || ! -f .dist-ref ]]; then
  echo "dist is missing. Run 'npm run build' first." >&2
  exit 1
fi

DIST_VERSION=$(node -p "require('./dist/package.json').version")
if [[ "${DIST_VERSION}" != "${CURRENT_VERSION}" ]]; then
  echo "dist version (${DIST_VERSION}) differs from package.json (${CURRENT_VERSION}). Rebuild with 'npm run build'." >&2
  exit 1
fi

# "latest" is resolved to a tag at build time, so only a pinned ref can be compared.
EXPECTED_REF=$(tr -d '[:space:]' < ./UPSTREAM_REF.txt)
BUILT_REF=$(tr -d '[:space:]' < ./.dist-ref)
if [[ "${EXPECTED_REF}" != "latest" && "${BUILT_REF}" != "${EXPECTED_REF}" ]]; then
  echo "dist was built from ${BUILT_REF}, but UPSTREAM_REF.txt is ${EXPECTED_REF}. Rebuild with 'npm run build'." >&2
  exit 1
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
