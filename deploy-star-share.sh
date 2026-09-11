#!/bin/sh
set -eu

# Execute a private snapshot so `git pull` may safely replace this script while it runs.
if [ "${DEPLOY_SCRIPT_STAGED:-0}" != 1 ]; then
    original_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
    staged_script=$(mktemp "${TMPDIR:-/tmp}/deploy-star-share.XXXXXX")
    cp "$0" "$staged_script"
    chmod 700 "$staged_script"
    DEPLOY_SCRIPT_STAGED=1 DEPLOY_SCRIPT_DIR="$original_dir" DEPLOY_SCRIPT_TEMP="$staged_script" exec sh "$staged_script" "$@"
fi

SCRIPT_DIR=${DEPLOY_SCRIPT_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}
RELEASE_ENV_FILE=${RELEASE_ENV_FILE:-/etc/star-share-release.env}

if [ -r "$RELEASE_ENV_FILE" ]; then
    # Production-only values; file must be root-readable and must not live in Git.
    # shellcheck disable=SC1090
    . "$RELEASE_ENV_FILE"
fi

REPO_DIR=${REPO_DIR:-$SCRIPT_DIR}
RELEASE_ROOT=${RELEASE_ROOT:-/opt/web/star_share_releases}
DEPLOY_BRANCH=${DEPLOY_BRANCH:-master}
KEEP_RELEASES=${KEEP_RELEASES:-10}
ASSET_RETENTION_DAYS=${ASSET_RETENTION_DAYS:-30}
HEALTHCHECK_URL=${HEALTHCHECK_URL:-http://127.0.0.1:29724/}
DEPLOY_PULL=${DEPLOY_PULL:-1}
LOCK_DIR=$RELEASE_ROOT/.deploy.lock
TEMP_RELEASE=
KEEP_FILE=
PREVIOUS_RELEASE=
SWITCHED=0
LOCK_HELD=0
SELF_TEMP=${DEPLOY_SCRIPT_TEMP:-}

log() {
    printf '[前端发布] %s\n' "$*"
}

fail() {
    printf '[前端发布] 错误：%s\n' "$*" >&2
    exit 1
}

cleanup() {
    status=$?
    trap - EXIT HUP INT TERM

    if [ "$status" -ne 0 ] && [ "$SWITCHED" -eq 1 ]; then
        if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
            log "发布切换后失败，正在恢复上一版本：$PREVIOUS_RELEASE"
            rm -f -- "$RELEASE_ROOT/current.rollback.$$"
            ln -s "$PREVIOUS_RELEASE" "$RELEASE_ROOT/current.rollback.$$"
            mv -Tf "$RELEASE_ROOT/current.rollback.$$" "$RELEASE_ROOT/current"
        else
            log '首次发布切换后失败，正在移除无效的 current 链接'
            rm -f -- "$RELEASE_ROOT/current"
        fi
    fi

    [ -z "$TEMP_RELEASE" ] || rm -rf -- "$TEMP_RELEASE"
    [ -z "$KEEP_FILE" ] || rm -f -- "$KEEP_FILE"
    [ "$LOCK_HELD" -eq 0 ] || rm -rf -- "$LOCK_DIR"
    [ -z "$SELF_TEMP" ] || rm -f -- "$SELF_TEMP"
    exit "$status"
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

case "$KEEP_RELEASES" in
    ''|*[!0-9]*) fail 'KEEP_RELEASES 必须是正整数' ;;
    *) [ "$KEEP_RELEASES" -ge 1 ] || fail 'KEEP_RELEASES 必须至少为 1' ;;
esac
case "$ASSET_RETENTION_DAYS" in
    ''|*[!0-9]*) fail 'ASSET_RETENTION_DAYS 必须是非负整数' ;;
esac

for command_name in git python3 cp cmp find grep ln mv rm sort; do
    command -v "$command_name" >/dev/null 2>&1 || fail "缺少必要命令：$command_name"
done
if [ "$HEALTHCHECK_URL" != off ]; then
    command -v curl >/dev/null 2>&1 || fail '缺少必要命令：curl'
fi

mkdir -p "$RELEASE_ROOT"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    lock_pid=$(cat "$LOCK_DIR/pid" 2>/dev/null || true)
    if [ -n "$lock_pid" ] && kill -0 "$lock_pid" 2>/dev/null; then
        fail "已有发布任务正在运行（进程 $lock_pid）"
    fi
    log '检测到失效的发布锁，正在清理'
    rm -rf -- "$LOCK_DIR"
    mkdir "$LOCK_DIR" || fail '无法获取发布锁'
fi
printf '%s\n' "$$" > "$LOCK_DIR/pid"
LOCK_HELD=1


cd "$REPO_DIR"
[ -d .git ] || fail "$REPO_DIR 不是 Git 仓库"
[ -z "$(git status --porcelain)" ] || fail '工作区存在未提交修改，请先提交或还原后再发布'
current_branch=$(git branch --show-current)
[ "$current_branch" = "$DEPLOY_BRANCH" ] || fail "当前分支应为 $DEPLOY_BRANCH，实际为 $current_branch"

if [ "$DEPLOY_PULL" = 1 ]; then
    log "正在以仅快进方式更新 $DEPLOY_BRANCH 分支"
    git pull --ff-only
elif [ "$DEPLOY_PULL" != 0 ]; then
    fail 'DEPLOY_PULL 只能设置为 0 或 1'
fi

[ -z "$(git status --porcelain)" ] || fail '代码更新过程中工作区发生变化，已停止发布'
[ -f build/index.html ] || fail '缺少 build/index.html'
[ -f build/asset-manifest.json ] || fail '缺少 build/asset-manifest.json'
[ -d build/starstatic ] || fail '缺少 build/starstatic 目录'

log '正在校验构建清单、入口引用和异步分块'
python3 - "$REPO_DIR/build" <<'PY'
import json
import re
import sys
from pathlib import Path

build = Path(sys.argv[1]).resolve()
manifest = json.loads((build / 'asset-manifest.json').read_text(encoding='utf-8'))
missing = []
for value in manifest.get('files', {}).values():
    if not isinstance(value, str) or not value.startswith('/'):
        continue
    path = build / value.lstrip('/')
    if not path.is_file():
        missing.append(value)

html = (build / 'index.html').read_text(encoding='utf-8')
for value in re.findall(r'(?:src|href)="(/[^"]+)"', html):
    path = build / value.split('?', 1)[0].lstrip('/')
    if not path.is_file():
        missing.append(value)

if missing:
    raise SystemExit('缺少构建文件：' + ', '.join(sorted(set(missing))))

main_files = list((build / 'starstatic/js').glob('main.*.js'))
if len(main_files) != 1:
    raise SystemExit(f'应当只有一个 main.*.js，实际找到 {len(main_files)} 个')

source = main_files[0].read_text(encoding='utf-8')
start = source.find('.u=')
end = source.find('.chunk.js"', start)
if start < 0 or end < 0:
    raise SystemExit('无法解析 webpack 分块文件映射')
chunk_map = dict(re.findall(r'(\d+|[0-9a-f]+):"([0-9a-f]{8})"', source[start:end + 10]))
expected = {f'{chunk_id}.{digest}.chunk.js' for chunk_id, digest in chunk_map.items()}
emitted = {path.name for path in (build / 'starstatic/js').glob('*.chunk.js')}
if expected != emitted:
    raise SystemExit(f'分块文件不一致：缺少={sorted(expected-emitted)}，多余={sorted(emitted-expected)}')

print(f'已校验 {len(manifest.get("files", {}))} 个清单条目和 {len(expected)} 个异步分块')
PY

commit=$(git rev-parse HEAD)
short_commit=$(git rev-parse --short=12 HEAD)
release_dir=$RELEASE_ROOT/release-$short_commit
shared_assets=$RELEASE_ROOT/shared-starstatic
mkdir -p "$shared_assets"

log '正在合并不可变静态资源，同名文件绝不覆盖'
python3 - "$REPO_DIR/build/starstatic" "$shared_assets" <<'PY'
import filecmp
import os
import shutil
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
for path in source.rglob('*'):
    if not path.is_file():
        continue
    relative = path.relative_to(source)
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if not filecmp.cmp(path, destination, shallow=False):
            raise SystemExit(f'不可变静态资源发生同名内容冲突：{relative}')
        continue
    temporary = destination.with_name(f'.{destination.name}.tmp-{os.getpid()}')
    shutil.copy2(path, temporary)
    os.replace(temporary, destination)
PY

if [ -d "$release_dir" ]; then
    cmp build/index.html "$release_dir/index.html" >/dev/null 2>&1 || fail "现有发布目录 $release_dir 与当前提交不一致"
    cmp build/asset-manifest.json "$release_dir/asset-manifest.json" >/dev/null 2>&1 || fail "现有发布目录 $release_dir 的清单与当前提交不一致"
    [ -L "$release_dir/starstatic" ] || fail "现有发布目录 $release_dir 的 starstatic 链接无效"
    log "版本 $short_commit 已准备完成"
else
    TEMP_RELEASE=$RELEASE_ROOT/.release-$short_commit.tmp-$$
    rm -rf -- "$TEMP_RELEASE"
    mkdir "$TEMP_RELEASE"
    cp -a build/. "$TEMP_RELEASE/"
    rm -rf -- "$TEMP_RELEASE/starstatic"
    ln -s "$shared_assets" "$TEMP_RELEASE/starstatic"
    printf '%s\n' "$commit" > "$TEMP_RELEASE/REVISION"
    mv "$TEMP_RELEASE" "$release_dir"
    TEMP_RELEASE=
    log "已准备版本 $short_commit"
fi

PREVIOUS_RELEASE=$(readlink -f "$RELEASE_ROOT/current" 2>/dev/null || true)
if [ "$PREVIOUS_RELEASE" = "$release_dir" ]; then
    log "版本 $short_commit 已经生效，无需重复切换"
else
    ln -s "$release_dir" "$RELEASE_ROOT/current.next.$$"
    mv -Tf "$RELEASE_ROOT/current.next.$$" "$RELEASE_ROOT/current"
    SWITCHED=1
    log "已切换到版本 $short_commit"
fi

if [ "$HEALTHCHECK_URL" != off ]; then
    health_body=$(mktemp)
    KEEP_FILE=$health_body
    curl --fail --silent --show-error --max-time 15 "$HEALTHCHECK_URL" -o "$health_body"
    cmp "$health_body" "$release_dir/index.html" >/dev/null 2>&1 || fail "健康检查响应与新版本入口不一致：$HEALTHCHECK_URL"
    rm -f -- "$health_body"
    KEEP_FILE=
    log '本机健康检查通过'
fi

# Keep the current release plus the newest configured number of release shells.
# Then remove only assets which are both unreferenced and older than the grace period.
log '正在清理过期发布目录和不再引用的静态资源'
python3 - "$RELEASE_ROOT" "$KEEP_RELEASES" "$ASSET_RETENTION_DAYS" <<'PY'
import json
import os
import shutil
import sys
import time
from pathlib import Path

root = Path(sys.argv[1])
keep_count = int(sys.argv[2])
retention_days = int(sys.argv[3])
current = (root / 'current').resolve()
releases = [path for path in root.iterdir() if path.is_dir() and (path.name.startswith('release-') or path.name.startswith('initial-'))]
releases.sort(key=lambda path: path.stat().st_mtime, reverse=True)
kept = []
for path in releases:
    if path == current or len(kept) < keep_count:
        kept.append(path)
for path in releases:
    if path not in kept and path != current:
        shutil.rmtree(path)

referenced = set()
for release in kept:
    manifest_path = release / 'asset-manifest.json'
    if not manifest_path.is_file():
        continue
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    for value in manifest.get('files', {}).values():
        marker = '/starstatic/'
        if isinstance(value, str) and marker in value:
            referenced.add(value.split(marker, 1)[1])

shared = root / 'shared-starstatic'
cutoff = time.time() - retention_days * 86400
removed = 0
for path in sorted(shared.rglob('*'), reverse=True):
    if path.is_file() and str(path.relative_to(shared)) not in referenced and path.stat().st_mtime < cutoff:
        path.unlink()
        removed += 1
    elif path.is_dir():
        try:
            path.rmdir()
        except OSError:
            pass
print(f'保留 {len(kept)} 个发布目录；清理 {removed} 个过期静态文件')
PY

SWITCHED=0
PREVIOUS_RELEASE=
log "发布完成：$short_commit"
log '本次未刷新 EdgeOne，也未重载 Caddy。'
