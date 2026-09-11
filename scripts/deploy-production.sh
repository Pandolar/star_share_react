#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/web/star_share_react}"
RELEASE_ROOT="${RELEASE_ROOT:-/opt/web/star_share_releases}"
KEEP_RELEASES="${KEEP_RELEASES:-10}"

cd "$REPO_DIR"
git pull --ff-only

release_id="$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
release_dir="$RELEASE_ROOT/$release_id"
mkdir -p "$release_dir"
cp -a build/. "$release_dir/"

# Hashed assets are immutable. Keep old files available for clients whose
# already-open pages still reference the previous deployment.
mkdir -p "$RELEASE_ROOT/shared-starstatic"
cp -an "$release_dir/starstatic/." "$RELEASE_ROOT/shared-starstatic/"
rm -rf "$release_dir/starstatic"
ln -s "$RELEASE_ROOT/shared-starstatic" "$release_dir/starstatic"

# Atomic cutover: Caddy should serve RELEASE_ROOT/current.
ln -sfn "$release_dir" "$RELEASE_ROOT/current.next"
mv -Tf "$RELEASE_ROOT/current.next" "$RELEASE_ROOT/current"

# Keep recent release shells. Shared hashed assets are intentionally retained;
# purge files older than your maximum client/cache lifetime in a separate job.
mapfile -t old_releases < <(find "$RELEASE_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' -printf '%T@ %p\n' | sort -rn | awk -v keep="$KEEP_RELEASES" 'NR>keep {print $2}')
if ((${#old_releases[@]})); then
  rm -rf -- "${old_releases[@]}"
fi

printf 'Deployed %s\n' "$release_id"
printf 'Refresh only HTML/document URLs in EdgeOne; do not purge /starstatic/*.\n'
