#!/bin/bash
# 官网改动快检：类型检查 → i18n 校验 →（默认）构建 + 预渲染校验
#
# 用法（在官网项目目录内运行）：
#   bash <skill>/scripts/preflight.sh --fast   # 只做类型 + i18n
#   bash <skill>/scripts/preflight.sh          # 全流程
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 从当前目录向上找项目根（含 src/i18n/en.json），不依赖 skill 装在哪里
ROOT="$(pwd)"
while [ "$ROOT" != "/" ] && [ ! -f "$ROOT/src/i18n/en.json" ]; do
  ROOT="$(dirname "$ROOT")"
done
if [ ! -f "$ROOT/src/i18n/en.json" ]; then
  echo "✗ 找不到项目根：请先 cd 到官网项目目录再运行"
  exit 1
fi
cd "$ROOT"

# 本机 node 在 nvm 下，非交互 shell 默认没加载
if ! command -v node >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do
    [ -d "$d" ] && PATH="$d:$PATH"
  done
  export PATH
fi
if ! command -v node >/dev/null 2>&1; then
  echo "✗ 找不到 node，请检查 nvm 安装"
  exit 1
fi
echo "node $(node -v) · $(pwd)"

echo "[1] 类型检查（tsc -b）"
npx tsc -b

echo "[2] i18n 校验"
node "$SKILL_DIR/scripts/audit-i18n.mjs"

if [ "${1:-}" = "--fast" ]; then
  echo "✓ 快检通过（未构建）"
  exit 0
fi

echo "[3] 构建 + 预渲染"
npm run build

echo "[4] 预渲染校验（抽样）"
PORT="${VERIFY_PORT:-4173}"
(cd dist && python3 -m http.server "$PORT" >/dev/null 2>&1) &
SRV=$!
trap 'kill "$SRV" 2>/dev/null || true' EXIT
sleep 1
VERIFY_BASE="http://127.0.0.1:$PORT" npm run verify:prerender

echo "✓ 全流程通过"
