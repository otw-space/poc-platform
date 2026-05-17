#!/usr/bin/env bash
set -e

# ============================================================
# k3s 部署脚本
# 前置: k3s 已安装，docker 镜像已构建
# ============================================================

echo "==> 构建 Docker 镜像..."
cd "$(dirname "$0")/.."
docker build -t poc-platform:latest .

echo "==> 导入镜像到 k3s..."
docker save poc-platform:latest | sudo k3s ctr images import -

echo "==> 生成密钥..."
SECRET=$(openssl rand -base64 32)
sed -i "s/change-me-in-production/$SECRET/g" k3s/secret.yaml

echo "==> 部署到 k3s..."
kubectl apply -k k3s/

echo ""
echo "部署完成"
echo "查看状态: kubectl get pods -l app=poc-platform"
echo "查看日志: kubectl logs -l app=poc-platform -f"
