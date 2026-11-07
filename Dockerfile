# ===== 前端 req-forge 多阶段构建 =====
# 阶段 1:构建(产出 dist 静态文件)
FROM node:20-alpine AS build
WORKDIR /app

# 先复制依赖清单 + .npmrc(公共源,避免 CI/构建环境访问不到内网源)
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# 复制源码并构建(tsc 类型检查 + vite build)
COPY . .
RUN npm run build

# 阶段 2:运行(nginx 托管静态文件)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
