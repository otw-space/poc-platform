# 部署指南

## 准备工作

1. 一台 Linux 云服务器（Ubuntu 22.04 / Debian 12 / CentOS Stream 9）
2. 项目代码已上传到服务器（git clone 或 rsync）

## 一键部署

```bash
# 进入项目 deploy 目录
cd poc-platform/deploy

# 给脚本执行权限
chmod +x deploy.sh

# 执行部署（可选传入域名）
./deploy.sh your-domain.com
```

脚本会自动完成：
- 安装 Python、Node.js、Nginx
- 创建虚拟环境并安装后端依赖
- 构建前端
- 注册 systemd 服务（开机自启 + 崩溃重启）
- 配置 Nginx 反向代理

## 手动部署

### 1. 环境要求
```bash
sudo apt-get install python3 python3-venv python3-pip nodejs nginx
```

### 2. 后端配置
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

创建 `.env` 文件：
```
DATABASE_URL=sqlite:///./data/poc.db
SECRET_KEY=<随机生成的密钥>
```

### 3. 构建前端
```bash
cd frontend
npm install
npm run build
```

### 4. 启动服务
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
```

### 5. 配置 Nginx（可选）
拷贝 `nginx.conf` 到 `/etc/nginx/sites-available/`，修改域名后 `nginx -s reload`。

## 管理命令

```bash
# 启动 / 停止 / 重启
sudo systemctl start poc-platform
sudo systemctl stop poc-platform
sudo systemctl restart poc-platform

# 查看状态
sudo systemctl status poc-platform

# 查看日志
sudo journalctl -u poc-platform -f

# 禁用 / 启用开机自启
sudo systemctl disable poc-platform
sudo systemctl enable poc-platform

# 更新部署（拉代码后）
cd /opt/poc-platform/frontend && npm install && npm run build
sudo systemctl restart poc-platform
```

## 升级 HTTPS（可选）

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 目录结构

```
/opt/poc-platform/
├── .env                  # 环境变量（密钥、数据库路径）
├── backend/              # FastAPI 后端
├── frontend/dist/        # 前端构建产物
├── data/                 # SQLite 数据库文件
├── uploads/              # 用户上传文件
└── deploy/               # 部署配置
    ├── deploy.sh
    ├── poc-platform.service
    └── nginx.conf
```
