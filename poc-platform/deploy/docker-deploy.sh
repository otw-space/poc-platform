#!/usr/bin/env bash
set -e

# ============================================================
# Docker Compose 部署 — 服务器端构建版本
# 用法: ./docker-deploy.sh root@1.2.3.4
# ============================================================

SERVER="${1:?请指定服务器地址，例如: ./docker-deploy.sh root@1.2.3.4}"

echo "==> 0/5 配置 Docker Hub 国内镜像..."
ssh "$SERVER" '
  mkdir -p /etc/docker
  if ! grep -q "registry-mirrors" /etc/docker/daemon.json 2>/dev/null; then
    cat > /etc/docker/daemon.json << EOF
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF
    systemctl restart docker
    echo "   Docker 镜像已配置"
  else
    echo "   镜像已存在，跳过"
  fi
'

echo "==> 1/5 上传源码到服务器..."
cd "$(dirname "$0")/.."
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='*.db' \
    --exclude='venv' \
    --exclude='.venv' \
    --exclude='uploads/*' \
    --exclude='dist' \
    --exclude='.claude' \
    --exclude='.DS_Store' \
    ./ "$SERVER:/opt/poc-platform/"

echo "==> 2/5 服务器上构建镜像（首次可能需要几分钟）..."
ssh "$SERVER" "cd /opt/poc-platform && docker compose build 2>&1"

echo "==> 3/5 生成密钥..."
ssh "$SERVER" "test -f /opt/poc-platform/.env || python3 -c 'import secrets;print(f\"SECRET_KEY={secrets.token_urlsafe(32)}\")' > /opt/poc-platform/.env"

echo "==> 4/5 启动服务..."
ssh "$SERVER" "cd /opt/poc-platform && docker compose up -d && sleep 2 && docker compose ps"

echo ""
echo "=========================================="
echo " 部署完成!"
echo " 访问: http://$SERVER_IP"
echo " 查看日志: ssh $SERVER 'cd /opt/poc-platform && docker compose logs -f'"
echo "=========================================="
