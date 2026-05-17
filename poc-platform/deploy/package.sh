#!/usr/bin/env bash
set -e

# ============================================================
# 打包项目（包含前端构建产物）— 用于无法访问 GitHub 的服务器
# 在本地执行: 1) 构建前端 2) 打包 3) scp 到服务器
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGE_NAME="poc-platform-$(date +%Y%m%d-%H%M%S).tar.gz"
OUTPUT_DIR="${1:-.}"

echo "==> 构建前端..."
cd "$PROJECT_DIR/frontend"
npm install --silent
npm run build
echo "   前端构建完成"

echo "==> 下载 Python 依赖包（离线安装用）..."
cd "$PROJECT_DIR/backend"
mkdir -p /tmp/poc-pip-packages
pip download -r requirements.txt -d /tmp/poc-pip-packages
echo "   依赖包下载完成"

echo "==> 打包项目..."
cd "$(dirname "$PROJECT_DIR")"

tar -czf "$OUTPUT_DIR/$PACKAGE_NAME" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.venv' \
    --exclude='venv' \
    --exclude='*.db' \
    --exclude='uploads/*' \
    --exclude='.claude' \
    --exclude='.DS_Store' \
    --exclude='*.egg-info' \
    poc-platform/ \
    /tmp/poc-pip-packages/

echo ""
echo "=========================================="
echo " 打包完成: $OUTPUT_DIR/$PACKAGE_NAME"
echo ""
echo " 1) 传输到服务器:"
echo "    scp $OUTPUT_DIR/$PACKAGE_NAME root@服务器IP:/opt/"
echo ""
echo " 2) 服务器上解压安装:"
echo "    ssh root@服务器IP"
echo "    cd /opt && tar -xzf $PACKAGE_NAME"
echo "    cd /opt/poc-platform/deploy && chmod +x deploy.sh"
echo "    ./deploy.sh --offline /tmp/poc-pip-packages"
echo "=========================================="
