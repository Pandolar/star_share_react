#!/usr/bin/env bash
set -euo pipefail

RELEASE_ENV_FILE="${RELEASE_ENV_FILE:-/etc/star-share-release.env}"
if [[ -r "$RELEASE_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$RELEASE_ENV_FILE"
fi

: "${EO_ZONE_ID:?Set EO_ZONE_ID in $RELEASE_ENV_FILE}"
EO_STATIC_DOMAIN="${EO_STATIC_DOMAIN:-starstaticfiles.niceaigc.com}"

if (($# == 0)); then
  printf 'Usage: %s /starstatic/js/file.hash.js [...]\n' "$0" >&2
  printf 'Only use this for a proven bad EdgeOne object; normal releases need no purge.\n' >&2
  exit 2
fi

command -v tccli >/dev/null 2>&1 || { echo 'tccli is not installed' >&2; exit 1; }
targets=()
for path in "$@"; do
  [[ "$path" == /starstatic/* ]] || { printf 'Refusing non-static target: %s\n' "$path" >&2; exit 2; }
  targets+=("https://${EO_STATIC_DOMAIN}${path}")
done
targets_json="$(printf '%s\n' "${targets[@]}" | python3 -c 'import json,sys; print(json.dumps([line.strip() for line in sys.stdin if line.strip()]))')"
tccli teo CreatePurgeTask --ZoneId "$EO_ZONE_ID" --Type purge_url --Targets "$targets_json"
