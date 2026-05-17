# ============================================
# 阶段 1: 构建前端
# ============================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ============================================
# 阶段 2: 最终镜像（Python 后端 + 前端静态文件）
# ============================================
FROM python:3.12-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ .

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# 数据目录
RUN mkdir -p /app/data /app/uploads

ENV DATABASE_URL=sqlite:////app/data/poc.db

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:8000/api/auth/me || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
