# AI 知识库前端

适配 `../backend` 下 Spring Boot 后端的 React 管理端，包含知识库管理、文档上传与处理状态、RAG 对话和历史会话。

## 本地运行

```bash
npm install
npm run dev
```

默认监听 `http://localhost:5173`，开发服务器会把 `/api` 代理到 `http://localhost:8080`。

## 构建

```bash
npm run build
```

产物输出到 `dist/`。

## 后端地址配置

复制 `.env.example` 为 `.env.local` 并按需修改：

```bash
VITE_API_BASE=https://your-api.example.com
```

如果前端和后端部署在不同域名，需要后端对 `/api/**` 开启 CORS。
