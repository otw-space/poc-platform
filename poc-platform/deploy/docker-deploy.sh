#!/usr/bin/env bash
set -e

# ============================================================
# Docker Compose 部署 — 完整自动化脚本
# 在本地执行，构建镜像并传到服务器
# ============================================================

SERVER="${1:?请指定服务器地址，例如: ./docker-deploy.sh root@1.2.3.4}"

echo "==> 1/5 构建 Docker 镜像..."
cd "$(dirname "$0")/.."
docker compose build

echo "==> 2/5 导出镜像..."
docker save poc-platform:latest | gzip > /tmp/poc-platform.tar.gz
echo "   镜像导出: /tmp/poc-platform.tar.gz ($(du -h /tmp/poc-platform.tar.gz | cut -f1))"

echo "==> 3/5 传输文件到服务器..."
# 传输镜像
scp /tmp/poc-platform.tar.gz "$SERVER:/tmp/"
# 传输 docker-compose.yml（镜像在 compose 中引用）
scp docker-compose.yml "$SERVER:/opt/poc-platform/"
# 传输 .env 配置
ssh "$SERVER" "mkdir -p /opt/poc-platform"
scp .env "$SERVER:/opt/poc-platform/" 2>/dev/null || \
  ssh "$SERVER" "python3 -c 'import secrets;print(f\"SECRET_KEY={secrets.token_urlsafe(32)}\")' > /opt/poc-platform/.env"

echo "==> 4/5 服务器上导入镜像..."
ssh "$SERVER" "docker load < /tmp/poc-platform.tar.gz && rm /tmp/poc-platform.tar.gz"

echo "==> 5/5 启动服务..."
ssh "$SERVER" "cd /opt/poc-platform && docker compose up -d"

echo ""
echo "=========================================="
echo " 部署完成!"
echo " 访问: http://$SERVER_IP"
echo " 查看日志: ssh $SERVER 'docker compose -f /opt/poc-platform/docker-compose.yml logs -f'"
echo "=========================================="
