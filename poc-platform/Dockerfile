# ============================================
# 阶段 1: 构建前端
# ============================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY frontend/ ./
RUN npm run build

# ============================================
# 阶段 2: 最终镜像（Python 后端 + 前端静态文件）
# ============================================
FROM python:3.12-slim

# 目录结构需与开发环境一致: backend/app/main.py 用 ../../frontend/dist 找前端
WORKDIR /app/backend

# 替换为国内 apt 源（加速构建）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# 复制后端代码
COPY backend/ .

# 复制前端构建产物（对应 ../../frontend/dist）
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# 数据目录
RUN mkdir -p /app/data /app/uploads

ENV DATABASE_URL=sqlite:////app/data/poc.db

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
