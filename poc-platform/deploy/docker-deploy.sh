#!/usr/bin/env bash
set -e

# ============================================================
# Docker 部署 — 本地构建镜像，传到服务器运行
# 服务器不需要访问任何外部网络
# 用法: ./docker-deploy.sh root@1.2.3.4
# ============================================================

SERVER="${1:?请指定服务器地址，例如: ./docker-deploy.sh root@1.2.3.4}"
IMAGE_NAME="poc-platform"
IMAGE_FILE="/tmp/poc-platform-image.tar.gz"

cd "$(dirname "$0")/.."

echo "==> 1/4 本地构建 Docker 镜像..."
docker compose build

# docker compose 生成的镜像名是 目录名-服务名，统一 tag 一下
echo "==> 2/4 导出镜像（压缩中）..."
BUILT_IMAGE=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep poc-platform | head -1)
if [ -n "$BUILT_IMAGE" ] && [ "$BUILT_IMAGE" != "$IMAGE_NAME:latest" ]; then
  docker tag "$BUILT_IMAGE" "$IMAGE_NAME:latest"
fi
docker save "$IMAGE_NAME:latest" | gzip > "$IMAGE_FILE"
echo "   镜像大小: $(du -h $IMAGE_FILE | cut -f1)"

echo "==> 3/5 传输镜像和配置到服务器..."
ssh "$SERVER" "mkdir -p /opt/poc-platform"
scp "$IMAGE_FILE" "$SERVER:/tmp/"
scp docker-compose.prod.yml "$SERVER:/opt/poc-platform/docker-compose.yml"
rm "$IMAGE_FILE"

echo "==> 4/5 生成密钥..."
ssh "$SERVER" "test -f /opt/poc-platform/.env || python3 -c 'import secrets;print(f\"SECRET_KEY={secrets.token_urlsafe(32)}\")' > /opt/poc-platform/.env"

echo "==> 5/5 服务器导入镜像并启动..."
ssh "$SERVER" "
  docker load < /tmp/poc-platform-image.tar.gz && \
  rm /tmp/poc-platform-image.tar.gz && \
  docker tag poc-platform:latest poc-platform:latest 2>/dev/null; \
  cd /opt/poc-platform && \
  docker compose up -d && \
  sleep 2 && \
  docker compose ps
"

echo ""
echo "=========================================="
echo " 部署完成!"
echo " 查看日志: ssh $SERVER 'cd /opt/poc-platform && docker compose logs -f'"
echo "=========================================="
