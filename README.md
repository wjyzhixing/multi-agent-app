# 智能体助手

一个基于 Next.js 和 Koa2 的多智能体应用。

## 本地开发

```bash
# 后端
cd backend && npm install && npm run db:init && npm run dev

# 前端（另一个终端）
cd frontend && npm install && npm run dev
```

访问 http://localhost:3000

## Docker 部署

### 1. 上传代码到服务器

```bash
scp -r multi-agent-app user@your-server:/path/to/
```

### 2. 配置环境变量

```bash
cd /path/to/multi-agent-app
cp .env.example .env
```

编辑 `.env` 文件，修改 `API_URL` 为你的服务器地址：
```
API_URL=http://your-server-ip:3001
```

### 3. 构建并启动

```bash
docker-compose up -d --build
```

### 4. 访问

- 前端：http://your-server-ip:3000
- 后端：http://your-server-ip:3001

### 常用命令

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 重新构建
docker-compose up -d --build
```

## 使用 Nginx（推荐生产环境）

如果你有域名，建议使用 Nginx 反向代理：

```nginx
# /etc/nginx/sites-available/yourdomain.com

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /chat {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

然后修改 `.env`：
```
API_URL=https://yourdomain.com
```

## 功能

- 心理疏导：提供情感支持、心理建议
- AI 工具推荐：推荐 AI 工具和技术

## 技术栈

- 前端：Next.js 14, React, Tailwind CSS
- 后端：Koa2, TypeScript, SQLite
- AI：GLM-5