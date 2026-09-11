#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/web/star_share_react}"
RELEASE_ROOT="${RELEASE_ROOT:-/opt/web/star_share_releases}"
RELEASE_ENV_FILE="${RELEASE_ENV_FILE:-/etc/star-share-release.env}"
KEEP_RELEASES="${KEEP_RELEASES:-10}"
ASSET_RETENTION_DAYS="${ASSET_RETENTION_DAYS:-30}"

if [[ -r "$RELEASE_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$RELEASE_ENV_FILE"
fi

cd "$REPO_DIR"
git pull --ff-only

release_id="$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
release_dir="$RELEASE_ROOT/$release_id"
shared_assets="$RELEASE_ROOT/shared-starstatic"
mkdir -p "$release_dir" "$shared_assets"
cp -a build/. "$release_dir/"

# Hash assets are append-only during deployment. Existing clients may still
# reference prior hashes, so a release must never delete them during cutover.
cp -an "$release_dir/starstatic/." "$shared_assets/"
rm -rf "$release_dir/starstatic"
ln -s "$shared_assets" "$release_dir/starstatic"

# Atomic document cutover. Caddy serves RELEASE_ROOT/current.
ln -sfn "$release_dir" "$RELEASE_ROOT/current.next"
mv -Tf "$RELEASE_ROOT/current.next" "$RELEASE_ROOT/current"

# Keep recent document shells for rollback.
mapfile -t old_releases < <(find "$RELEASE_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' -printf '%T@ %p\n' | sort -rn | awk -v keep="$KEEP_RELEASES" 'NR>keep {print $2}')
if ((${#old_releases[@]})); then
  rm -rf -- "${old_releases[@]}"
fi

# Asset GC: retain every file referenced by retained release manifests. Only
# unreferenced immutable assets older than the client/cache lifetime are removed.
keep_file="$(mktemp)"
trap 'rm -f "$keep_file"' EXIT
while IFS= read -r manifest; do
  python3 - "$manifest" >>"$keep_file" <<'PY'
import json, sys
manifest = json.load(open(sys.argv[1], encoding='utf-8'))
for path in manifest.get('files', {}).values():
    marker = '/starstatic/'
    if marker in path:
        print(path.split(marker, 1)[1])
PY
done < <(find "$RELEASE_ROOT" -mindepth 2 -maxdepth 2 -type f -name asset-manifest.json)
sort -u -o "$keep_file" "$keep_file"
while IFS= read -r -d '' asset; do
  relative="${asset#"$shared_assets"/}"
  grep -Fxq "$relative" "$keep_file" || rm -f -- "$asset"
done < <(find "$shared_assets" -type f -mtime "+$ASSET_RETENTION_DAYS" -print0)
find "$shared_assets" -type d -empty -delete


printf 'Deployed %s; retained assets for at least %s days.\n' "$release_id" "$ASSET_RETENTION_DAYS"
printf 'No EdgeOne purge submitted: hashed static URLs are immutable.\n'
