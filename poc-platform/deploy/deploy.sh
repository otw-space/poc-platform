#!/usr/bin/env bash
set -e

# ============================================================
# PoC Management Platform - 一键部署脚本
# 适用: Ubuntu 22.04+ / Debian 12+ / CentOS Stream 9+
# ============================================================

APP_DIR="/opt/poc-platform"
VENV_DIR="$APP_DIR/venv"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVICE_NAME="poc-platform"

# ---- 检查系统依赖 ----
check_deps() {
    echo "==> 检查系统依赖..."

    if ! command -v python3 &>/dev/null; then
        echo "安装 Python3..."
        sudo apt-get update && sudo apt-get install -y python3 python3-venv python3-pip
    fi

    if ! command -v node &>/dev/null && ! command -v nodejs &>/dev/null; then
        echo "安装 Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    if ! command -v nginx &>/dev/null; then
        echo "安装 Nginx..."
        sudo apt-get install -y nginx
    fi

    echo "   依赖检查完毕"
}

# ---- 构建前端 ----
build_frontend() {
    echo "==> 构建前端..."
    cd "$FRONTEND_DIR"
    npm install --production
    npm run build
    echo "   前端构建完成 -> $FRONTEND_DIR/dist"
}

# ---- 安装后端依赖 ----
setup_backend() {
    echo "==> 安装后端依赖..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip
    pip install -r "$BACKEND_DIR/requirements.txt"
    echo "   后端依赖安装完成"
}

# ---- 配置 systemd 服务 ----
setup_service() {
    echo "==> 配置 systemd 服务..."
    sudo cp "$APP_DIR/deploy/poc-platform.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    echo "   服务已注册: $SERVICE_NAME"
}

# ---- 配置 Nginx ----
setup_nginx() {
    echo "==> 配置 Nginx 反向代理..."
    DOMAIN=${1:-_}
    sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/poc-platform
    sudo sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/sites-available/poc-platform
    sudo ln -sf /etc/nginx/sites-available/poc-platform /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "   Nginx 配置完成"
}

# ---- 主流程 ----
main() {
    echo "=========================================="
    echo " PoC Platform 部署脚本"
    echo "=========================================="

    # 复制项目到部署目录（如果当前不在目标目录）
    if [ "$(pwd)" != "$APP_DIR" ]; then
        echo "==> 复制项目到 $APP_DIR..."
        sudo mkdir -p "$APP_DIR"
        SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
        PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
        sudo rsync -a --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.git' --exclude='dist' --exclude='*.db' --exclude='uploads/*' "$PROJECT_DIR/" "$APP_DIR/"
        sudo chown -R "$(whoami):$(whoami)" "$APP_DIR"
    fi

    check_deps

    # 检查 .env 文件
    if [ ! -f "$APP_DIR/.env" ]; then
        echo "==> 生成 .env 文件..."
        SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=sqlite:///$APP_DIR/data/poc.db
SECRET_KEY=$SECRET
EOF
        echo "   密钥已生成，请妥善保管 $APP_DIR/.env"
    fi

    # 创建数据目录
    mkdir -p "$APP_DIR/data" "$APP_DIR/uploads"

    setup_backend
    build_frontend
    setup_service
    setup_nginx "$1"

    # 启动服务
    echo "==> 启动服务..."
    sudo systemctl restart "$SERVICE_NAME"
    sleep 2
    sudo systemctl status "$SERVICE_NAME" --no-pager

    echo ""
    echo "=========================================="
    echo " 部署完成!"
    echo " 访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP')"
    echo " 查看日志: sudo journalctl -u $SERVICE_NAME -f"
    echo "=========================================="
}

main "$@"
