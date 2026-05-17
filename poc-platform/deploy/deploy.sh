#!/usr/bin/env bash
set -e

# ============================================================
# PoC Management Platform - 一键部署脚本
# 适用: Ubuntu 22.04+ / Debian 12+
# ============================================================

APP_DIR="/opt/poc-platform"
VENV_DIR="$APP_DIR/venv"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVICE_NAME="poc-platform"
OFFLINE_PIP_DIR=""
DOMAIN="_"

# 解析参数
while [[ $# -gt 0 ]]; do
    case "$1" in
        --offline)
            OFFLINE_PIP_DIR="$2"
            shift 2
            ;;
        --mirror)
            USE_MIRROR=true
            shift
            ;;
        *)
            DOMAIN="$1"
            shift
            ;;
    esac
done

# ---- 系统依赖 ----
install_system_deps() {
    echo "==> 安装系统依赖..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq python3 python3-venv python3-pip nginx
    elif command -v yum &>/dev/null; then
        sudo yum install -y python3 python3-pip nginx
    fi
    echo "   系统依赖 OK"
}

# ---- 后端 ----
setup_backend() {
    echo "==> 安装后端依赖..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip -q

    if [ -n "$OFFLINE_PIP_DIR" ] && [ -d "$OFFLINE_PIP_DIR" ]; then
        echo "   离线模式: 从 $OFFLINE_PIP_DIR 安装"
        pip install --no-index --find-links="$OFFLINE_PIP_DIR" -r "$BACKEND_DIR/requirements.txt"
    elif [ "$USE_MIRROR" = true ]; then
        echo "   使用清华镜像加速"
        pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r "$BACKEND_DIR/requirements.txt"
    else
        pip install -r "$BACKEND_DIR/requirements.txt"
    fi
    echo "   后端依赖 OK"
}

# ---- systemd ----
setup_service() {
    echo "==> 注册 systemd 服务..."
    sudo cp "$APP_DIR/deploy/poc-platform.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    echo "   服务已注册"
}

# ---- Nginx ----
setup_nginx() {
    echo "==> 配置 Nginx..."
    sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/poc-platform
    sudo sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/sites-available/poc-platform
    sudo ln -sf /etc/nginx/sites-available/poc-platform /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "   Nginx 配置 OK"
}

# ---- 主流程 ----
main() {
    echo "=========================================="
    echo " PoC Platform 部署"
    echo "=========================================="

    # 复制项目到部署目录
    if [ "$(pwd)" != "$APP_DIR" ] && [ ! -f "$APP_DIR/deploy/deploy.sh" ]; then
        echo "==> 复制项目到 $APP_DIR..."
        SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
        PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
        sudo mkdir -p "$APP_DIR"
        sudo rsync -a \
            --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
            --exclude='*.pyc' --exclude='*.db' --exclude='venv' \
            --exclude='uploads/*' --exclude='.claude' \
            "$PROJECT_DIR/" "$APP_DIR/"
        sudo chown -R "$(whoami):$(whoami)" "$APP_DIR"
    fi

    install_system_deps

    # 生成 .env（如果不存在）
    if [ ! -f "$APP_DIR/.env" ]; then
        echo "==> 生成 .env..."
        SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=sqlite:///$APP_DIR/data/poc.db
SECRET_KEY=$SECRET
EOF
        echo "   密钥已生成"
    fi

    mkdir -p "$APP_DIR/data" "$APP_DIR/uploads"

    setup_backend
    setup_service

    # Nginx 可选
    if [ "$DOMAIN" != "__skip__" ]; then
        setup_nginx
    fi

    # 启动
    echo "==> 启动服务..."
    sudo systemctl restart "$SERVICE_NAME"
    sleep 2
    sudo systemctl status "$SERVICE_NAME" --no-pager

    echo ""
    echo "=========================================="
    echo " 部署完成"
    echo "=========================================="
    echo " 查看日志: sudo journalctl -u $SERVICE_NAME -f"
}

main
