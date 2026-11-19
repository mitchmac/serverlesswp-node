#!/bin/bash
# Point build/Dockerfile at a PHP release: sets PHP_VERSION and PHP_SHA256.
#
#   ./update-php-version.sh            latest release of the branch the Dockerfile is on (e.g. 8.3)
#   ./update-php-version.sh 8.3.37     a specific release
#
# The SHA-256 comes from php.net's release API; the Dockerfile verifies the
# downloaded tarball against it, so the build fails if the two disagree.
#
# Prints key=value lines (previous, version, sha256, changed) and appends them
# to $GITHUB_OUTPUT when it is set.

set -euo pipefail

cd "$(dirname "$0")"
dockerfile=Dockerfile

current=$(sed -n 's/^ARG PHP_VERSION=//p' "$dockerfile")
current_sha=$(sed -n 's/^ARG PHP_SHA256=//p' "$dockerfile")
if [ -z "$current" ] || [ -z "$current_sha" ]; then
  echo "Could not find ARG PHP_VERSION / ARG PHP_SHA256 in $dockerfile" >&2
  exit 1
fi

requested=${1:-}
if [ -z "$requested" ]; then
  # "8.3.36" -> "8.3": the API returns the newest release of that branch.
  requested=$(echo "$current" | cut -d. -f1,2)
fi
if ! [[ "$requested" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
  echo "Not a PHP version: $requested" >&2
  exit 1
fi

release=$(curl -fsSL --retry 3 "https://www.php.net/releases/index.php?json&version=${requested}")

version=$(echo "$release" | jq -r '.version // empty')
if [ -z "$version" ]; then
  echo "php.net has no release for $requested: $release" >&2
  exit 1
fi

sha256=$(echo "$release" | jq -r --arg f "php-${version}.tar.bz2" '.source[]? | select(.filename == $f) | .sha256')
if ! [[ "$sha256" =~ ^[0-9a-f]{64}$ ]]; then
  echo "No SHA-256 for php-${version}.tar.bz2 in php.net's release data" >&2
  exit 1
fi

current_minor=$(echo "$current" | cut -d. -f1,2)
target_minor=$(echo "$version" | cut -d. -f1,2)
if [ "$current_minor" != "$target_minor" ]; then
  echo "Warning: moving from PHP $current_minor to $target_minor; check the configure flags and php.ini" >&2
fi

changed=false
if [ "$version" != "$current" ] || [ "$sha256" != "$current_sha" ]; then
  changed=true
  sed -i \
    -e "s/^ARG PHP_VERSION=.*/ARG PHP_VERSION=${version}/" \
    -e "s/^ARG PHP_SHA256=.*/ARG PHP_SHA256=${sha256}/" \
    "$dockerfile"
fi

output="previous=${current}
version=${version}
sha256=${sha256}
changed=${changed}"

echo "$output"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "$output" >> "$GITHUB_OUTPUT"
fi
